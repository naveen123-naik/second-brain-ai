import os
from app.config import OPENAI_API_KEY
from langchain_core.embeddings import Embeddings

_GLOBAL_PRIMARY_FAILED = False
_CACHED_FALLBACK_EMB = None

class DummyEmbeddings(Embeddings):
    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return [[0.0] * 384 for _ in texts]

    def embed_query(self, text: str) -> list[float]:
        return [0.0] * 384

def _get_huggingface_embeddings():
    global _CACHED_FALLBACK_EMB
    if _CACHED_FALLBACK_EMB is not None:
        return _CACHED_FALLBACK_EMB
    print("[Embeddings] Initializing local HuggingFace Embeddings (all-MiniLM-L6-v2)...")
    try:
        try:
            from langchain_huggingface import HuggingFaceEmbeddings
            _CACHED_FALLBACK_EMB = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        except Exception:
            from langchain_community.embeddings import HuggingFaceEmbeddings
            _CACHED_FALLBACK_EMB = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    except Exception as e:
        print(f"[Embeddings Warning] HuggingFace embeddings failed to load ({e}). Using DummyEmbeddings fallback.")
        _CACHED_FALLBACK_EMB = DummyEmbeddings()
    return _CACHED_FALLBACK_EMB

class RobustEmbeddings(Embeddings):
    def __init__(self, primary: Embeddings, fallback: Embeddings):
        self.primary = primary
        self.fallback = fallback

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        global _GLOBAL_PRIMARY_FAILED
        if not _GLOBAL_PRIMARY_FAILED and self.primary:
            try:
                return self.primary.embed_documents(texts)
            except Exception as e:
                print(f"[Embeddings Warning] Primary embeddings failed: {e}. Switching automatically to fallback embeddings for all future calls.")
                _GLOBAL_PRIMARY_FAILED = True
        return self.fallback.embed_documents(texts) if self.fallback else [[0.0] * 384 for _ in texts]

    def embed_query(self, text: str) -> list[float]:
        global _GLOBAL_PRIMARY_FAILED
        if not _GLOBAL_PRIMARY_FAILED and self.primary:
            try:
                return self.primary.embed_query(text)
            except Exception as e:
                print(f"[Embeddings Warning] Primary embeddings query failed: {e}. Switching automatically to fallback embeddings for all future calls.")
                _GLOBAL_PRIMARY_FAILED = True
        return self.fallback.embed_query(text) if self.fallback else [0.0] * 384

    async def aembed_documents(self, texts: list[str]) -> list[list[float]]:
        global _GLOBAL_PRIMARY_FAILED
        if not _GLOBAL_PRIMARY_FAILED and self.primary:
            try:
                return await self.primary.aembed_documents(texts)
            except Exception as e:
                print(f"[Embeddings Warning] Primary async embeddings failed: {e}. Switching automatically to fallback embeddings for all future calls.")
                _GLOBAL_PRIMARY_FAILED = True
        return await self.fallback.aembed_documents(texts) if self.fallback else [[0.0] * 384 for _ in texts]

    async def aembed_query(self, text: str) -> list[float]:
        global _GLOBAL_PRIMARY_FAILED
        if not _GLOBAL_PRIMARY_FAILED and self.primary:
            try:
                return await self.primary.aembed_query(text)
            except Exception as e:
                print(f"[Embeddings Warning] Primary async query failed: {e}. Switching automatically to fallback embeddings for all future calls.")
                _GLOBAL_PRIMARY_FAILED = True
        return await self.fallback.aembed_query(text) if self.fallback else [0.0] * 384

def get_embeddings():
    global _GLOBAL_PRIMARY_FAILED
    provider = os.getenv("EMBEDDING_PROVIDER", "").lower()

    if OPENAI_API_KEY and not OPENAI_API_KEY.startswith("your_") and provider != "huggingface":
        try:
            from langchain_openai import OpenAIEmbeddings
            os.environ["OPENAI_API_KEY"] = OPENAI_API_KEY
            primary_emb = OpenAIEmbeddings(api_key=OPENAI_API_KEY)
            fallback_emb = None
            try:
                fallback_emb = _get_huggingface_embeddings()
            except Exception:
                fallback_emb = DummyEmbeddings()
            return RobustEmbeddings(primary_emb, fallback_emb)
        except Exception as e:
            print("[Embeddings] OpenAI Embeddings setup failed, falling back to HuggingFace/Dummy:", e)
            _GLOBAL_PRIMARY_FAILED = True

    return _get_huggingface_embeddings()

embeddings = get_embeddings()

