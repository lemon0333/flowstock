"""
/learn 토픽 RAG 인덱스 — 챗봇이 사이트 학습 콘텐츠 기반으로 답변하도록 함.

- 모델: paraphrase-multilingual-MiniLM-L12-v2 (한국어 OK, 118MB)
- 인덱싱 단위: 토픽 1개 (title + oneLiner + intro + sections.body)
- 검색: numpy 코사인 (45개라 FAISS 불필요)
- 앱 시작 시 1회 로드 (lifespan).
"""

from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass
from pathlib import Path
from threading import Lock
from typing import Any

import numpy as np

logger = logging.getLogger(__name__)

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "learn_topics.json"
MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"


@dataclass
class TopicHit:
    slug: str
    title: str
    one_liner: str
    audience: str
    score: float
    snippet: str  # intro 앞부분


class LearnIndex:
    """싱글턴: 임베딩 벡터 메모리 보관 + 코사인 검색."""

    def __init__(self) -> None:
        self._topics: list[dict[str, Any]] = []
        self._embeddings: np.ndarray | None = None
        self._model = None
        self._lock = Lock()
        self._loaded = False

    def load(self) -> None:
        """JSON + 임베딩 모델 로드. 한 번만 실행."""
        with self._lock:
            if self._loaded:
                return
            if not DATA_PATH.exists():
                logger.warning("learn_topics.json 없음 (%s) — RAG 비활성", DATA_PATH)
                self._loaded = True
                return

            with DATA_PATH.open(encoding="utf-8") as f:
                self._topics = json.load(f)
            logger.info("learn_topics.json 로드: %d 토픽", len(self._topics))

            try:
                from sentence_transformers import SentenceTransformer

                self._model = SentenceTransformer(MODEL_NAME)
                texts = [self._build_text(t) for t in self._topics]
                self._embeddings = self._model.encode(
                    texts,
                    convert_to_numpy=True,
                    normalize_embeddings=True,
                    show_progress_bar=False,
                )
                logger.info(
                    "임베딩 완료: shape=%s, model=%s",
                    self._embeddings.shape,
                    MODEL_NAME,
                )
            except Exception as e:
                logger.warning("임베딩 모델 로드 실패 (%s) — RAG 비활성", e)
                self._model = None
                self._embeddings = None

            self._loaded = True

    @staticmethod
    def _build_text(topic: dict[str, Any]) -> str:
        parts: list[str] = []
        parts.append(topic.get("title", ""))
        parts.append(topic.get("oneLiner", ""))
        parts.append(topic.get("intro", ""))
        for sec in topic.get("sections", []) or []:
            heading = sec.get("heading") or ""
            body = sec.get("body") or ""
            if heading:
                parts.append(heading)
            if body:
                parts.append(body)
        return " \n ".join(p for p in parts if p)

    def search(self, query: str, top_k: int = 3) -> list[TopicHit]:
        """질문 임베딩 → 코사인 → top-k 토픽."""
        if not self._loaded:
            self.load()
        if self._model is None or self._embeddings is None or not self._topics:
            return []

        q_vec = self._model.encode(
            [query],
            convert_to_numpy=True,
            normalize_embeddings=True,
            show_progress_bar=False,
        )[0]
        # 코사인 = 정규화 벡터의 내적
        scores = self._embeddings @ q_vec  # (N,)
        top_k = min(top_k, len(scores))
        top_idx = np.argpartition(-scores, top_k - 1)[:top_k]
        # 점수 순 정렬
        top_idx = top_idx[np.argsort(-scores[top_idx])]

        hits: list[TopicHit] = []
        for i in top_idx:
            t = self._topics[int(i)]
            hits.append(
                TopicHit(
                    slug=t.get("slug", ""),
                    title=t.get("title", ""),
                    one_liner=t.get("oneLiner", ""),
                    audience=t.get("audience", ""),
                    score=float(scores[int(i)]),
                    snippet=(t.get("intro") or "")[:200],
                )
            )
        return hits

    def topic_count(self) -> int:
        return len(self._topics)


# 싱글턴
_INDEX = LearnIndex()


def get_index() -> LearnIndex:
    return _INDEX


def search_topics(query: str, top_k: int = 3) -> list[TopicHit]:
    """편의 함수."""
    return _INDEX.search(query, top_k=top_k)


def warmup() -> None:
    """앱 시작 lifespan에서 호출."""
    # 테스트 환경(SKIP_RAG_WARMUP=1)에서는 모델 다운로드 시간 절약
    if os.getenv("SKIP_RAG_WARMUP") == "1":
        logger.info("SKIP_RAG_WARMUP=1 — RAG warmup skip")
        return
    _INDEX.load()
