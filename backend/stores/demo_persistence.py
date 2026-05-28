"""
Demo persistence for free-tier deployments.

Strategy:
- Bundled seed store in the repo guarantees non-empty shared demo data.
- Runtime store is writable/ephemeral and receives new uploads during uptime.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Optional

from app_config import Config

STORE_VERSION = 2


def get_seed_store_path() -> Path:
    custom = os.getenv('DEMO_SEED_STORE_PATH', '').strip()
    if custom:
        return Path(custom)
    return Path(Config.BACKEND_ROOT) / 'demo' / 'demo_store.json'


def get_runtime_store_path() -> Path:
    custom = os.getenv('DEMO_RUNTIME_STORE_PATH', '').strip()
    if custom:
        return Path(custom)
    return Path(Config.DATA_DIR) / 'demo_runtime_store.json'


def _load_json(path: Path) -> Optional[dict[str, Any]]:
    if not path.is_file():
        return None
    try:
        with open(path, encoding='utf-8') as f:
            data = json.load(f)
        if not isinstance(data, dict):
            return None
        return data
    except (json.JSONDecodeError, OSError) as e:
        print(f'[GENO] Warning: could not load demo store ({path}): {e}')
        return None


def load_demo_state() -> Optional[dict[str, Any]]:
    # Prefer runtime data (contains latest uploads) and fallback to bundled seed.
    runtime = _load_json(get_runtime_store_path())
    if runtime:
        return runtime
    return _load_json(get_seed_store_path())


def load_seed_state() -> Optional[dict[str, Any]]:
    return _load_json(get_seed_store_path())


def save_demo_state(state: dict[str, Any]) -> None:
    path = get_runtime_store_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        'version': STORE_VERSION,
        **state,
    }
    tmp = path.with_suffix('.json.tmp')
    try:
        with open(tmp, 'w', encoding='utf-8') as f:
            json.dump(payload, f, indent=2, default=str, ensure_ascii=False)
        tmp.replace(path)
    except OSError as e:
        print(f'[GENO] Warning: could not save demo store ({path}): {e}')
        if tmp.exists():
            try:
                tmp.unlink()
            except OSError:
                pass
