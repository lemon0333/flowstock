"""
market_gold — Silver Parquet에 분석용 파생 컬럼 추가해서 Gold로 적재.

Bronze=원본 / Silver=정제 / Gold=분석/서빙용 — 표준 3-layer 데이터 레이크 패턴.

흐름:
  read_silver → enrich → write_gold

추가하는 컬럼 (8 → 13):
  prev_close          : close - change (계산 검증용)
  market_cap_rank     : 시가총액 desc 순위 (1=가장 큼)
  volume_rank         : 거래량 desc 순위
  return_category     : 상한가/상승/보합/하락/하한가
  is_etf_or_etn       : 종목명 패턴 기반 추정 플래그

단일 일자 스냅샷이라 진짜 기술지표(RSI/MACD)는 못 박음 → 시계열 누적되면 별도 DAG로.
"""

from __future__ import annotations

import logging
import os
from datetime import datetime

from airflow import DAG
from airflow.exceptions import AirflowFailException
from airflow.operators.python import PythonOperator

logger = logging.getLogger(__name__)

SILVER_ROOT = "/tmp/flowstock-data/silver/ohlcv"
GOLD_ROOT = "/tmp/flowstock-data/gold/ohlcv_enriched"
MARKET = "KOSPI"

# ETF/ETN 발행사 prefix (보수적으로 시작 — 추후 추가 가능)
ETF_PREFIXES = (
    "KODEX", "TIGER", "ARIRANG", "KOSEF", "HANARO", "SOL", "ACE",
    "PLUS", "KINDEX", "WOORI", "TIMEFOLIO", "SMART", "FOCUS", "BNK",
)


def _today() -> str:
    return datetime.now().strftime("%Y-%m-%d")


def _silver_path() -> str:
    return os.path.join(SILVER_ROOT, f"dt={_today()}", f"market={MARKET}", "part-0.parquet")


def _gold_dir() -> str:
    return os.path.join(GOLD_ROOT, f"dt={_today()}", f"market={MARKET}")


def read_silver(ti) -> str:
    # 데이터프레임은 task 안에서 read+write. XCom으로는 파일 path만 전달 (큰 DF는 XCom에 안 박는 게 정석).
    path = _silver_path()
    if not os.path.exists(path):
        raise AirflowFailException(
            f"Silver 파일 없음: {path}\n먼저 market_bronze → market_silver를 순서대로 실행해야 함."
        )
    # 검증용 metadata만 가볍게 읽음
    import pyarrow.parquet as pq

    pf = pq.ParquetFile(path)
    n = pf.metadata.num_rows
    logger.info("Silver 위치 확인: %s (%d 행)", path, n)
    return path


def enrich(ti) -> str:
    import pandas as pd

    silver_path: str = ti.xcom_pull(task_ids="read_silver")
    df = pd.read_parquet(silver_path)

    # 1) prev_close = close - change. 음수 / 0 방어
    df["prev_close"] = (df["close"] - df["change"]).astype("int64")

    # 2) 순위 (1이 가장 큼)
    df["market_cap_rank"] = df["market_value"].rank(method="min", ascending=False).astype("int64")
    df["volume_rank"] = df["volume"].rank(method="min", ascending=False).astype("int64")

    # 3) 등락 카테고리 — 한국 시장 상하한가 30%
    def categorize(rate: float) -> str:
        if rate >= 29.5:
            return "상한가"
        if rate > 0:
            return "상승"
        if rate == 0:
            return "보합"
        if rate > -29.5:
            return "하락"
        return "하한가"

    df["return_category"] = df["change_rate"].apply(categorize).astype("string")

    # 4) ETF/ETN flag — 종목명 시작이 발행사 prefix면 True
    name_upper = df["name"].str.upper()
    df["is_etf_or_etn"] = name_upper.str.startswith(ETF_PREFIXES).astype("bool")

    # 적재
    out_dir = _gold_dir()
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "part-0.parquet")
    df.to_parquet(out_path, engine="pyarrow", index=False, compression="snappy")

    logger.info(
        "Gold 적재 완료: %s (%d 종목, %d 컬럼)",
        out_path,
        len(df),
        len(df.columns),
    )

    # 분포 요약 로깅 — 사용자가 결과 흐름 파악하기 좋게
    cat_dist = df["return_category"].value_counts().to_dict()
    logger.info("등락 분포: %s", cat_dist)
    logger.info("ETF/ETN: %d / 일반: %d", df["is_etf_or_etn"].sum(), (~df["is_etf_or_etn"]).sum())

    return out_path


def write_gold(ti) -> str:
    # enrich 단계에서 이미 적재 끝남. 이 task는 후속 단계(STEP 5 — DB upsert 등)에서 사용될 hook 자리.
    # 지금은 단순히 파일 존재 확인 + path 반환.
    gold_path: str = ti.xcom_pull(task_ids="enrich")
    if not os.path.exists(gold_path):
        raise AirflowFailException(f"Gold 파일 없음: {gold_path}")
    size = os.path.getsize(gold_path)
    logger.info("Gold 최종 확인: %s (%d bytes)", gold_path, size)
    return gold_path


with DAG(
    dag_id="market_gold",
    start_date=datetime(2026, 5, 1),
    schedule=None,
    catchup=False,
    tags=["flowstock", "gold"],
) as dag:
    t_read = PythonOperator(task_id="read_silver", python_callable=read_silver)
    t_enrich = PythonOperator(task_id="enrich", python_callable=enrich)
    t_write = PythonOperator(task_id="write_gold", python_callable=write_gold)

    t_read >> t_enrich >> t_write
