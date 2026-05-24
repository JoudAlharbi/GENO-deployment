"""
Detect and remove development/test/mock demo analyses from persistent storage.
"""

from __future__ import annotations

import re
from typing import Any

# Sequence IDs created by ad-hoc tests or placeholders — never real uploads
_FAKE_SEQUENCE_PREFIXES = (
    'SEQ-TEST',
    'SEQ-MOCK',
    'SEQ-FAKE',
    'SEQ-DUMMY',
    'SEQ-PLACEHOLDER',
    'TEST-SEQ',
    'MOCK-SEQ',
)

_FAKE_SEQUENCE_EXACT = frozenset({
    'SEQ-TEST-001',
    'SEQ-TEST-000',
    'SEQ-MOCK-001',
    'SEQ-FAKE-001',
})

_FAKE_SEQUENCE_RE = re.compile(
    r'^SEQ-(TEST|MOCK|FAKE|DUMMY|PLACEHOLDER)(-|$)',
    re.IGNORECASE,
)


def is_fake_demo_report(sequence_id: str, report: dict | None = None) -> bool:
    """True if this report is a dev/test/mock entry, not a real analysis."""
    sid = (sequence_id or '').strip().upper()
    if not sid:
        return True

    if sid in _FAKE_SEQUENCE_EXACT:
        return True

    if any(sid.startswith(prefix.upper()) for prefix in _FAKE_SEQUENCE_PREFIXES):
        return True

    if _FAKE_SEQUENCE_RE.match(sid):
        return True

    if report:
        # Signature of manual python -c create_report smoke test
        ar = report.get('analysis_result')
        if ar in ('{}', '', None):
            variant = str(report.get('variant_info', '')).strip().lower()
            fullname = str(report.get('fullname', '')).strip().lower()
            patient = str(report.get('patientinfo', '')).strip().lower()
            if variant == 'v' and fullname == 'demo' and patient == 'p':
                return True

    return False


def sanitize_demo_state(state: dict[str, Any]) -> tuple[dict[str, Any], int]:
    """
    Return a copy of state with fake reports and related links removed.
    Second value is count of reports removed.
    """
    state = dict(state)
    reports: dict = dict(state.get('reports') or {})
    fake_ids = {
        sid for sid, row in reports.items()
        if is_fake_demo_report(sid, row if isinstance(row, dict) else None)
    }

    if not fake_ids:
        return state, 0

    reports = {sid: row for sid, row in reports.items() if sid not in fake_ids}
    contains = [
        c for c in (state.get('contains') or [])
        if c.get('sequence_id') not in fake_ids
    ]
    views = [
        v for v in (state.get('views') or [])
        if v.get('sequence_id') not in fake_ids
    ]

    state['reports'] = reports
    state['contains'] = contains
    state['views'] = views
    return state, len(fake_ids)
