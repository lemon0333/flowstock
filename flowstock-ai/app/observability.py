"""OpenTelemetry 트레이싱 초기화 모듈.

- FastAPI / httpx / requests / SQLAlchemy auto-instrumentation
- OTLP HTTP 으로 Jaeger collector 에 span 전송
- OTEL_EXPORTER_OTLP_ENDPOINT 가 비어있으면 콘솔로만 export (로컬 개발)

backend(Spring) 와 같은 service.namespace 로 묶이도록 attribute 설정.
"""

from __future__ import annotations

import logging
import os

logger = logging.getLogger(__name__)


def setup_tracing(app, engine=None) -> None:
    """앱 인스턴스에 OpenTelemetry 트레이싱을 부착한다."""
    try:
        from opentelemetry import trace
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import (
            OTLPSpanExporter,
        )
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
        from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
        from opentelemetry.instrumentation.requests import RequestsInstrumentor
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import (
            BatchSpanProcessor,
            ConsoleSpanExporter,
        )
    except ImportError as e:
        logger.warning("OpenTelemetry packages not installed: %s — skipping tracing", e)
        return

    service_name = os.getenv("OTEL_SERVICE_NAME", "ai-service")
    endpoint = os.getenv(
        "OTEL_EXPORTER_OTLP_ENDPOINT",
        "http://jaeger-collector.flowstock-monitoring:4318/v1/traces",
    )

    resource = Resource.create(
        {
            "service.name": service_name,
            "service.namespace": "flowstock",
            "deployment.environment": os.getenv("DEPLOYMENT_ENV", "production"),
        }
    )
    provider = TracerProvider(resource=resource)

    if endpoint:
        try:
            exporter = OTLPSpanExporter(endpoint=endpoint)
            provider.add_span_processor(BatchSpanProcessor(exporter))
            logger.info("OTel: exporting to %s", endpoint)
        except Exception as e:
            logger.warning("OTel OTLP exporter init 실패: %s — console fallback", e)
            provider.add_span_processor(BatchSpanProcessor(ConsoleSpanExporter()))
    else:
        provider.add_span_processor(BatchSpanProcessor(ConsoleSpanExporter()))
        logger.info("OTel: endpoint 없음 — console fallback")

    trace.set_tracer_provider(provider)

    # Auto-instrumentation
    FastAPIInstrumentor.instrument_app(app)
    HTTPXClientInstrumentor().instrument()
    RequestsInstrumentor().instrument()

    if engine is not None:
        try:
            from opentelemetry.instrumentation.sqlalchemy import (
                SQLAlchemyInstrumentor,
            )

            SQLAlchemyInstrumentor().instrument(engine=engine)
        except Exception as e:
            logger.warning("OTel SQLAlchemy instrument 실패: %s", e)

    logger.info("OTel tracing initialised (service=%s)", service_name)
