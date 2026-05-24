"""
Demo-mode storage: in-memory with JSON file persistence.
Shared demo user sees all analyses across visitors/restarts.
"""

from __future__ import annotations

from copy import deepcopy
from datetime import datetime
from threading import Lock
from typing import Any, Optional

from stores.demo_persistence import load_demo_state, save_demo_state
from stores.demo_store_filters import is_fake_demo_report, sanitize_demo_state

DEMO_USER_ID = 'demo'
DEMO_EMAIL = 'demo@geno-lab.example'
DEMO_FULLNAME = 'Portfolio Demo User'

_lock = Lock()
_users: dict[str, dict] = {}
_dna_files: dict[str, dict] = {}
_uploads: list[dict] = []
_reports: dict[str, dict] = {}
_contains: list[dict] = []
_views: list[dict] = []
_loaded = False


def _now():
    return datetime.utcnow()


def _row(**kwargs):
    return {k.lower(): v for k, v in kwargs.items()}


def _snapshot() -> dict[str, Any]:
    return {
        'users': deepcopy(_users),
        'dna_files': deepcopy(_dna_files),
        'uploads': deepcopy(_uploads),
        'reports': deepcopy(_reports),
        'contains': deepcopy(_contains),
        'views': deepcopy(_views),
    }


def _persist():
    save_demo_state(_snapshot())


def _ensure_demo_user():
    _users[DEMO_USER_ID] = _row(
        UserID=DEMO_USER_ID,
        Email=DEMO_EMAIL,
        Password='',
        Fullname=DEMO_FULLNAME,
        EmployeeID=DEMO_USER_ID,
        IsFirstLogin=False,
        FailedLoginAttempts=0,
    )


def _apply_state(data: dict[str, Any]) -> None:
    global _users, _dna_files, _uploads, _reports, _contains, _views
    cleaned, removed = sanitize_demo_state(data)
    if removed:
        print(f'[GENO] Removed {removed} fake/test demo report(s) from storage')
    _users = cleaned.get('users') or {}
    _dna_files = cleaned.get('dna_files') or {}
    _uploads = cleaned.get('uploads') or []
    _reports = cleaned.get('reports') or {}
    _contains = cleaned.get('contains') or []
    _views = cleaned.get('views') or []
    _ensure_demo_user()
    if removed:
        _persist()


def purge_fake_demo_records() -> int:
    """Remove fake/test reports from memory and persist. Returns count removed."""
    with _lock:
        before = len(_reports)
        fake_ids = [
            sid for sid, row in list(_reports.items())
            if is_fake_demo_report(sid, row)
        ]
        for sid in fake_ids:
            del _reports[sid]
        _contains[:] = [c for c in _contains if c.get('sequence_id') not in fake_ids]
        _views[:] = [v for v in _views if v.get('sequence_id') not in fake_ids]
        removed = before - len(_reports)
        if removed:
            _persist()
        return removed


def init_store():
    """Load persisted demo data or seed empty store."""
    global _loaded
    with _lock:
        if _loaded:
            return
        stored = load_demo_state()
        if stored:
            _apply_state(stored)
            print(
                f'[GENO] Demo store loaded: {len(_reports)} report(s), '
                f'{len(_uploads)} upload(s)'
            )
        else:
            _ensure_demo_user()
            _persist()
            print('[GENO] Demo store initialized (new persistent file)')
        _loaded = True


# --- Users ---

def get_user_by_id(user_id: str) -> Optional[dict]:
    with _lock:
        return _users.get(user_id)


def get_user_by_employee_or_email(identifier: str) -> Optional[dict]:
    with _lock:
        for u in _users.values():
            if u.get('employeeid') == identifier or u.get('email') == identifier:
                return dict(u)
    return None


def upsert_user(user_id: str, email: str, fullname: str, employee_id: str, password: str = ''):
    with _lock:
        _users[user_id] = _row(
            UserID=user_id,
            Email=email,
            Password=password,
            Fullname=fullname,
            EmployeeID=employee_id,
            IsFirstLogin=False,
            FailedLoginAttempts=0,
        )
        _persist()


# --- Files ---

def create_dna_file(
    file_id: str,
    user_id: str,
    original_name: str,
    stored_name: str,
    filepath: str,
    file_size: int,
    extension: str,
):
    with _lock:
        owner = DEMO_USER_ID
        _dna_files[file_id] = _row(
            FileID=file_id,
            original_name=original_name,
            stored_name=stored_name,
            filepath=filepath,
            size=file_size,
            extension=extension,
            upload_date=_now(),
        )
        _uploads.append(_row(UserID=owner, FileID=file_id, upload_date=_now()))
        _persist()


def get_file_by_id(file_id: str) -> Optional[dict]:
    with _lock:
        f = _dna_files.get(file_id)
        if not f:
            return None
        upload = next((u for u in _uploads if u['fileid'] == file_id), None)
        if not upload:
            return None
        return _row(
            FileID=file_id,
            UserID=upload['userid'],
            upload_date=upload.get('upload_date'),
            original_name=f.get('original_name'),
            stored_name=f.get('stored_name'),
            filepath=f.get('filepath'),
            size=f.get('size'),
            extension=f.get('extension'),
        )


def get_user_files(user_id: str) -> list[dict]:
    with _lock:
        file_ids = [u['fileid'] for u in _uploads if u['userid'] in (user_id, DEMO_USER_ID)]
        return [
            _row(FileID=fid, upload_date=next(u['upload_date'] for u in _uploads if u['fileid'] == fid))
            for fid in file_ids
        ]


def delete_file_record(file_id: str):
    with _lock:
        _dna_files.pop(file_id, None)
        _uploads[:] = [u for u in _uploads if u['fileid'] != file_id]
        _contains[:] = [c for c in _contains if c['fileid'] != file_id]
        _persist()


def link_file_to_report(file_id: str, sequence_id: str):
    with _lock:
        if not any(c['fileid'] == file_id and c['sequence_id'] == sequence_id for c in _contains):
            _contains.append(_row(sequence_id=sequence_id, FileID=file_id))
            _persist()


def get_file_report(file_id: str) -> Optional[dict]:
    with _lock:
        link = next((c for c in _contains if c['fileid'] == file_id), None)
        if not link:
            return None
        return _reports.get(link['sequence_id'])


def get_report_files(sequence_id: str) -> list[dict]:
    with _lock:
        return [_row(FileID=c['fileid']) for c in _contains if c['sequence_id'] == sequence_id]


# --- Reports ---

def create_report(
    sequence_id: str,
    accuracy,
    variant_info: str,
    fullname: str,
    patient_info: str,
    age,
    gender: str,
    analysis_result: str,
    pdf_path=None,
):
    with _lock:
        draft = _row(
            sequence_id=sequence_id,
            accuracy=accuracy,
            variant_info=variant_info,
            fullname=fullname,
            patientInfo=patient_info,
            age=age,
            gender=gender,
            analysis_result=analysis_result,
            pdf_path=pdf_path,
        )
        if is_fake_demo_report(sequence_id, draft):
            print(f'[GENO] Blocked fake/test report from being saved: {sequence_id}')
            return
        _reports[sequence_id] = _row(
            sequence_id=sequence_id,
            accuracy=accuracy,
            variant_info=variant_info,
            fullname=fullname,
            patientInfo=patient_info,
            age=age,
            gender=gender,
            analysis_result=analysis_result,
            pdf_path=pdf_path,
            saved_date=_now(),
        )
        _persist()


def update_report_pdf_path(sequence_id: str, pdf_path: str):
    with _lock:
        if sequence_id in _reports:
            _reports[sequence_id]['pdf_path'] = pdf_path
            _persist()


def get_report_by_id(sequence_id: str) -> Optional[dict]:
    with _lock:
        r = _reports.get(sequence_id)
        return dict(r) if r else None


def get_all_reports() -> list[dict]:
    with _lock:
        return sorted(
            [dict(r) for r in _reports.values()],
            key=lambda r: str(r.get('sequence_id', '')),
            reverse=True,
        )


def get_reports_for_user(user_id: str) -> list[dict]:
    """Shared demo pool — all visitors see every demo analysis."""
    return get_all_reports()


def user_has_report_access(user_id: str, sequence_id: str) -> bool:
    with _lock:
        return sequence_id in _reports


def record_report_view(user_id: str, sequence_id: str):
    with _lock:
        for v in _views:
            if v['userid'] == user_id and v['sequence_id'] == sequence_id:
                v['view_date'] = _now()
                _persist()
                return
        _views.append(_row(UserID=user_id, sequence_id=sequence_id, view_date=_now()))
        _persist()


# Legacy execute_query shim for auth password updates
def execute_query(query: str, params=None, fetch=False) -> Any:
    q = ' '.join(query.split()).lower()
    params = params or ()

    if 'from laboratoryuser' in q and 'employeeid' in q and fetch:
        return [get_user_by_employee_or_email(params[0])] if get_user_by_employee_or_email(params[0]) else []

    if 'update laboratoryuser' in q and 'failedloginattempts' in q:
        return True

    if 'update laboratoryuser' in q and 'password' in q:
        uid = params[1] if len(params) > 1 else DEMO_USER_ID
        with _lock:
            if uid in _users:
                _users[uid]['password'] = params[0]
                _persist()
        return True

    if 'select distinct r.' in q and 'from reports' in q and fetch:
        return get_reports_for_user(params[0])

    if 'select count' in q and 'from contains' in q and fetch:
        count = 1 if user_has_report_access(params[1], params[0]) else 0
        return [_row(count=count)]

    if fetch:
        return []
    return True
