"""SQLite persistence for prediction history."""

from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator

_DB_PATH: Path | None = None


def configure(db_path: Path) -> None:
    global _DB_PATH
    _DB_PATH = db_path
    db_path.parent.mkdir(parents=True, exist_ok=True)
    init_db()


def _path() -> Path:
    if _DB_PATH is None:
        raise RuntimeError("Database not configured")
    return _DB_PATH


@contextmanager
def connect() -> Iterator[sqlite3.Connection]:
    conn = sqlite3.connect(_path(), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    with connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS predictions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TEXT NOT NULL,
                inputs_json TEXT NOT NULL,
                risk_score REAL NOT NULL,
                risk_percentage TEXT NOT NULL,
                risk_level TEXT NOT NULL,
                prediction INTEGER NOT NULL,
                message TEXT NOT NULL
            )
            """
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_predictions_created_at ON predictions(created_at DESC)"
        )


def save_prediction(
    inputs: dict[str, Any],
    *,
    risk_score: float,
    risk_percentage: str,
    risk_level: str,
    prediction: int,
    message: str,
) -> int:
    created_at = datetime.now(timezone.utc).isoformat()
    with connect() as conn:
        cur = conn.execute(
            """
            INSERT INTO predictions (
                created_at, inputs_json, risk_score, risk_percentage,
                risk_level, prediction, message
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                created_at,
                json.dumps(inputs),
                risk_score,
                risk_percentage,
                risk_level,
                prediction,
                message,
            ),
        )
        return int(cur.lastrowid)


def list_predictions(limit: int = 50) -> list[dict[str, Any]]:
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT id, created_at, inputs_json, risk_score, risk_percentage,
                   risk_level, prediction, message
            FROM predictions
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()

    items: list[dict[str, Any]] = []
    for row in rows:
        items.append(
            {
                "id": row["id"],
                "created_at": row["created_at"],
                "inputs": json.loads(row["inputs_json"]),
                "risk_score": row["risk_score"],
                "risk_percentage": row["risk_percentage"],
                "risk_level": row["risk_level"],
                "prediction": row["prediction"],
                "message": row["message"],
            }
        )
    return items
