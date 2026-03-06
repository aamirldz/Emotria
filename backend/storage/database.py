"""
SQLite Database Module for Emotion Storage.

Stores detection results and provides query functions for
daily reports, weekly trends, and session statistics.
"""

import sqlite3
import os
import json
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any


class EmotionDatabase:
    """SQLite database for storing emotion detection results."""

    def __init__(self, db_path: str = None):
        """
        Initialize the database.

        Args:
            db_path: Path to SQLite database file.
                    If None, uses default location in storage directory.
        """
        if db_path is None:
            db_path = os.path.join(os.path.dirname(__file__), "emotions.db")

        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        """Create tables if they don't exist."""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS detections (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    emotion TEXT NOT NULL,
                    confidence REAL NOT NULL,
                    person_id INTEGER DEFAULT 0,
                    session_id TEXT,
                    face_x INTEGER,
                    face_y INTEGER,
                    face_width INTEGER,
                    face_height INTEGER
                )
            """)

            conn.execute("""
                CREATE TABLE IF NOT EXISTS sessions (
                    id TEXT PRIMARY KEY,
                    start_time TEXT NOT NULL,
                    end_time TEXT,
                    total_detections INTEGER DEFAULT 0,
                    dominant_emotion TEXT
                )
            """)

            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_detections_timestamp
                ON detections(timestamp)
            """)

            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_detections_emotion
                ON detections(emotion)
            """)

            conn.commit()

    def add_detection(
        self,
        emotion: str,
        confidence: float,
        person_id: int = 0,
        session_id: str = None,
        face_bbox: tuple = None,
    ) -> int:
        """
        Store a single detection result.

        Returns:
            ID of the inserted record.
        """
        timestamp = datetime.now().isoformat()
        face_x, face_y, face_w, face_h = face_bbox if face_bbox else (0, 0, 0, 0)

        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                """
                INSERT INTO detections
                    (timestamp, emotion, confidence, person_id, session_id,
                     face_x, face_y, face_width, face_height)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (timestamp, emotion, confidence, person_id, session_id,
                 face_x, face_y, face_w, face_h),
            )
            conn.commit()
            return cursor.lastrowid

    def add_detections_batch(
        self,
        detections: List[Dict[str, Any]],
        session_id: str = None,
    ):
        """Store multiple detection results at once."""
        timestamp = datetime.now().isoformat()

        with sqlite3.connect(self.db_path) as conn:
            for i, det in enumerate(detections):
                bbox = det.get("bbox", (0, 0, 0, 0))
                conn.execute(
                    """
                    INSERT INTO detections
                        (timestamp, emotion, confidence, person_id, session_id,
                         face_x, face_y, face_width, face_height)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        timestamp,
                        det["emotion"],
                        det["confidence"],
                        i,
                        session_id,
                        bbox[0], bbox[1], bbox[2], bbox[3],
                    ),
                )
            conn.commit()

    def get_emotion_distribution(
        self, hours: int = 24
    ) -> Dict[str, int]:
        """Get emotion distribution for the last N hours."""
        since = (datetime.now() - timedelta(hours=hours)).isoformat()

        with sqlite3.connect(self.db_path) as conn:
            rows = conn.execute(
                """
                SELECT emotion, COUNT(*) as count
                FROM detections
                WHERE timestamp >= ?
                GROUP BY emotion
                ORDER BY count DESC
                """,
                (since,),
            ).fetchall()

        return {row[0]: row[1] for row in rows}

    def get_recent_detections(self, limit: int = 50) -> List[Dict]:
        """Get the most recent detections."""
        with sqlite3.connect(self.db_path) as conn:
            rows = conn.execute(
                """
                SELECT id, timestamp, emotion, confidence, person_id
                FROM detections
                ORDER BY id DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()

        return [
            {
                "id": r[0],
                "timestamp": r[1],
                "emotion": r[2],
                "confidence": r[3],
                "person_id": r[4],
            }
            for r in rows
        ]

    def get_daily_report(self, date: str = None) -> Dict:
        """
        Generate a daily emotion report.

        Args:
            date: Date string in YYYY-MM-DD format. Defaults to today.
        """
        if date is None:
            date = datetime.now().strftime("%Y-%m-%d")

        with sqlite3.connect(self.db_path) as conn:
            # Total detections
            total = conn.execute(
                "SELECT COUNT(*) FROM detections WHERE timestamp LIKE ?",
                (f"{date}%",),
            ).fetchone()[0]

            # Emotion distribution
            dist = conn.execute(
                """
                SELECT emotion, COUNT(*) as count, AVG(confidence) as avg_conf
                FROM detections
                WHERE timestamp LIKE ?
                GROUP BY emotion
                ORDER BY count DESC
                """,
                (f"{date}%",),
            ).fetchall()

            # Hourly breakdown
            hourly = conn.execute(
                """
                SELECT
                    SUBSTR(timestamp, 12, 2) as hour,
                    emotion,
                    COUNT(*) as count
                FROM detections
                WHERE timestamp LIKE ?
                GROUP BY hour, emotion
                ORDER BY hour
                """,
                (f"{date}%",),
            ).fetchall()

        return {
            "date": date,
            "total_detections": total,
            "emotion_distribution": [
                {"emotion": r[0], "count": r[1], "avg_confidence": round(r[2], 1)}
                for r in dist
            ],
            "hourly_breakdown": [
                {"hour": r[0], "emotion": r[1], "count": r[2]}
                for r in hourly
            ],
        }

    def get_weekly_trend(self) -> List[Dict]:
        """Get emotion trends for the past 7 days."""
        results = []
        for i in range(7):
            date = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
            report = self.get_daily_report(date)
            results.append(report)
        return results

    def start_session(self, session_id: str):
        """Record the start of a new detection session."""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                "INSERT OR REPLACE INTO sessions (id, start_time) VALUES (?, ?)",
                (session_id, datetime.now().isoformat()),
            )
            conn.commit()

    def end_session(self, session_id: str):
        """Record the end of a detection session."""
        with sqlite3.connect(self.db_path) as conn:
            # Get dominant emotion
            row = conn.execute(
                """
                SELECT emotion, COUNT(*) as count
                FROM detections WHERE session_id = ?
                GROUP BY emotion ORDER BY count DESC LIMIT 1
                """,
                (session_id,),
            ).fetchone()

            total = conn.execute(
                "SELECT COUNT(*) FROM detections WHERE session_id = ?",
                (session_id,),
            ).fetchone()[0]

            conn.execute(
                """
                UPDATE sessions
                SET end_time = ?, total_detections = ?, dominant_emotion = ?
                WHERE id = ?
                """,
                (
                    datetime.now().isoformat(),
                    total,
                    row[0] if row else None,
                    session_id,
                ),
            )
            conn.commit()
