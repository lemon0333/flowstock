"""
market_serve — Gold Parquet을 쿼리 가능한 DB(SQLite)에 upsert.

이전까지(STEP 2~4)는 파일 시스템 위 layer로 끝났음 → 분석엔 쓰지만 앱 서빙엔 안 맞음.
이 단계가 "데이터가 진짜 서비스에 닿는" 첫 지점.

흐름:
  read_gold → upsert_db

DB 위치: $AIRFLOW_HOME/flowstock_data.db (Airflow 메타DB와 별도 SQLite 파일).
스키마: ohlcv_daily(dt, ticker, market, name, close, change, change_rate, volume,
                    market_value, prev_close, market_cap_rank, volume_rank,
                    return_category, is_etf_or_etn, updated_at)
        PK = (dt, ticker) → 같은 날짜 재실행 시 INSERT가 아닌 REPLACE.

idempotent — 몇 번 돌려도 같은 결과. Airflow 재시도 안전성 핵심 원칙.

운영 전환 시 SQLite → Postgres는 SQLAlchemy URL 한 줄만 바꾸면 됨:
  sqlite:///path/db  →  postgresql+psycopg2://user:pw@host/db
"""

from __future__ import annotations

import logging
import os
from datetime import datetime

from airflow import DAG
from airflow.exceptions import AirflowFailException
from airflow.operators.python import PythonOperator

logger = logging.getLogger(__name__)

GOLD_ROOT = "/tmp/flowstock-data/gold/ohlcv_enriched"
MARKET = "KOSPI"

# SQLite 파일 위치는 AIRFLOW_HOME 안 — 학습/POC 용. 운영은 외부 Postgres로 교체.
DB_PATH = os.path.join(os.environ.get("AIRFLOW_HOME", "/tmp"), "flowstock_data.db")
DB_URL = f"sqlite:///{DB_PATH}"
TABLE_NAME = "ohlcv_daily"


def _today() -> str:
    return datetime.now().strftime("%Y-%m-%d")


def _gold_path() -> str:
    return os.path.join(GOLD_ROOT, f"dt={_today()}", f"market={MARKET}", "part-0.parquet")


def read_gold(ti) -> str:
    path = _gold_path()
    if not os.path.exists(path):
        raise AirflowFailException(
            f"Gold 파일 없음: {path}\nmarket_gold 먼저 실행 필요."
        )
    logger.info("Gold 파일 확인: %s", path)
    return path


def upsert_db(ti) -> dict[str, int]:
    """
    Gold Parquet 행을 SQLite 테이블에 upsert.
    SQLite의 INSERT OR REPLACE 사용 — Postgres에선 ON CONFLICT DO UPDATE로 대응.
    """
    import pandas as pd
    from sqlalchemy import create_engine, text

    gold_path: str = ti.xcom_pull(task_ids="read_gold")
    df = pd.read_parquet(gold_path)

    # 적재 시점 메타데이터
    df["dt"] = _today()
    df["updated_at"] = datetime.now().isoformat(timespec="seconds")

    engine = create_engine(DB_URL, future=True)
    with engine.begin() as conn:
        # 1) 테이블 생성 (idempotent — IF NOT EXISTS)
        conn.execute(
            text(
                f"""
                CREATE TABLE IF NOT EXISTS {TABLE_NAME} (
                    dt              TEXT NOT NULL,
                    ticker          TEXT NOT NULL,
                    market          TEXT NOT NULL,
                    name            TEXT NOT NULL,
                    close           INTEGER NOT NULL,
                    change          INTEGER NOT NULL,
                    change_rate     REAL NOT NULL,
                    volume          INTEGER NOT NULL,
                    market_value    INTEGER NOT NULL,
                    prev_close      INTEGER NOT NULL,
                    market_cap_rank INTEGER NOT NULL,
                    volume_rank     INTEGER NOT NULL,
                    return_category TEXT NOT NULL,
                    is_etf_or_etn   INTEGER NOT NULL,
                    updated_at      TEXT NOT NULL,
                    PRIMARY KEY (dt, ticker)
                )
                """
            )
        )

        # 2) 기존 오늘치 행 제거 후 bulk insert (SQLite ON CONFLICT REPLACE 대안 — DataFrame.to_sql과 호환)
        # 진짜 upsert가 필요하면 sqlalchemy의 dialect.insert + on_conflict_do_update 사용.
        # 학습 단계에선 DELETE+INSERT 패턴이 가독성 좋음.
        result = conn.execute(
            text(f"DELETE FROM {TABLE_NAME} WHERE dt = :dt"), {"dt": _today()}
        )
        deleted = result.rowcount

        # bool은 SQLite에 INTEGER로 (Python bool → 0/1 자동 변환되지만 명시적으로)
        df["is_etf_or_etn"] = df["is_etf_or_etn"].astype(int)

        # 컬럼 순서 = 테이블과 동일하게 정렬
        col_order = [
            "dt", "ticker", "market", "name",
            "close", "change", "change_rate", "volume", "market_value",
            "prev_close", "market_cap_rank", "volume_rank",
            "return_category", "is_etf_or_etn", "updated_at",
        ]
        df[col_order].to_sql(TABLE_NAME, conn, if_exists="append", index=False)

    inserted = len(df)
    logger.info(
        "upsert 완료 → %s : dt=%s, deleted %d → inserted %d (DB: %s)",
        TABLE_NAME,
        _today(),
        deleted,
        inserted,
        DB_PATH,
    )
    return {"deleted": deleted, "inserted": inserted}


with DAG(
    dag_id="market_serve",
    start_date=datetime(2026, 5, 1),
    schedule=None,
    catchup=False,
    tags=["flowstock", "serve"],
) as dag:
    t_read = PythonOperator(task_id="read_gold", python_callable=read_gold)
    t_upsert = PythonOperator(task_id="upsert_db", python_callable=upsert_db)
    t_read >> t_upsert
