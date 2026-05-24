"""
File-backed persistence for portfolio demo mode.
Stores metadata in JSON under DATA_DIR so analyses survive restarts/redeploys
when using a persistent disk (e.g. Render DATA_DIR).
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Optional

from app_config import Config

STORE_VERSION = 1


def get_demo_store_path() -> Path:
    custom = os.getenv('DEMO_STORE_PATH', '').strip()
    if custom:
        return Path(custom)
    return Path(Config.DATA_DIR) / 'demo' / 'demo_store.json'


def load_demo_state() -> Optional[dict[str, Any]]:
    path = get_demo_store_path()
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


def save_demo_state(state: dict[str, Any]) -> None:
    path = get_demo_store_path()
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
