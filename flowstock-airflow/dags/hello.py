"""
hello — Airflow 첫 DAG. 흐름 익히는 용도, 의미 있는 일은 안 함.
manual trigger 전용 (schedule=None). UI에서 ▶ 누르면 실행.
"""

from datetime import datetime

from airflow import DAG
from airflow.operators.python import PythonOperator


def say_hello() -> str:
    print("안녕 FlowStock! Airflow에서 보는 첫 출력")
    return "hello-ok"


def say_now() -> str:
    # ti.xcom_pull을 안 써도 print는 task 로그에 그대로 남음 → UI > Graph > task > Log에서 확인 가능
    now = datetime.now()
    msg = f"지금: {now.isoformat()}"
    print(msg)
    return msg


with DAG(
    dag_id="hello",
    start_date=datetime(2026, 5, 1),
    schedule=None,
    catchup=False,
    tags=["flowstock", "hello"],
) as dag:
    t1 = PythonOperator(task_id="say_hello", python_callable=say_hello)
    t2 = PythonOperator(task_id="say_now", python_callable=say_now)
    t1 >> t2
