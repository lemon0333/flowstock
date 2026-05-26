"""
market_bronze — KOSPI 종가 스냅샷을 Bronze 레이어에 적재.

Bronze = "원본 그대로". 정제/검증 없음. 복구용 보험 layer.
경로: /tmp/flowstock-data/bronze/ohlcv/dt=YYYY-MM-DD/market=KOSPI/data.json

흐름:
  fetch_market_kospi (Naver pull) >> store_bronze (JSON 저장)

XCom으로 list[dict]를 두 task 사이 전달.
지금은 schedule=None — 학습용 수동 실행. STEP 3에서 15:35 평일로 교체 예정.
"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime
from typing import Any

from airflow import DAG
from airflow.operators.python import PythonOperator

from common.naver import fetch_market_ohlcv

logger = logging.getLogger(__name__)

BRONZE_ROOT = "/tmp/flowstock-data/bronze/ohlcv"
MARKET = "KOSPI"


def fetch_market_kospi() -> list[dict[str, Any]]:
    """Naver Finance에서 KOSPI 400 종목 OHLCV pull."""
    rows = fetch_market_ohlcv(MARKET)
    logger.info("Naver %s pull: %d 종목", MARKET, len(rows))
    if rows:
        logger.info("샘플(거래량 1위): %s", rows[0])
    return rows


def store_bronze(ti) -> str:
    """앞 task가 XCom으로 넘긴 리스트를 dt=YYYY-MM-DD 파티션 디렉토리에 JSON 적재."""
    rows: list[dict[str, Any]] | None = ti.xcom_pull(task_ids="fetch_market_kospi")
    if not rows:
        raise ValueError("fetch task가 빈 결과를 넘김 — 적재 중단")

    # 적재 시점의 KST 날짜로 파티셔닝. 정통 patten: dt=YYYY-MM-DD/market=KOSPI/
    today = datetime.now().strftime("%Y-%m-%d")
    dir_path = os.path.join(BRONZE_ROOT, f"dt={today}", f"market={MARKET}")
    os.makedirs(dir_path, exist_ok=True)
    file_path = os.path.join(dir_path, "data.json")

    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=2)

    size = os.path.getsize(file_path)
    logger.info("Bronze 적재 완료: %s (%d bytes, %d 종목)", file_path, size, len(rows))
    return file_path


with DAG(
    dag_id="market_bronze",
    start_date=datetime(2026, 5, 1),
    schedule=None,
    catchup=False,
    tags=["flowstock", "bronze"],
) as dag:
    t_fetch = PythonOperator(
        task_id="fetch_market_kospi",
        python_callable=fetch_market_kospi,
    )
    t_store = PythonOperator(
        task_id="store_bronze",
        python_callable=store_bronze,
    )
    t_fetch >> t_store
