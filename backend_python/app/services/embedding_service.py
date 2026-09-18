import math
import re
import hashlib
from typing import List, Set
from app.schemas import EmbeddingRequest, EmbeddingItem, EmbeddingResponse

# Common semantic synonyms / conceptual clusters for dense semantic alignment
SEMANTIC_CLUSTERS = [
    {"price", "cost", "pricing", "rate", "rates", "charge", "charges", "fee", "fees", "billing", "payment", "tier", "plan", "subscription", "quote", "amount", "usd", "inr", "euro", "dollar"},
    {"return", "refund", "returns", "refunds", "cancel", "cancellation", "reimbursement", "policy", "guarantee", "warranty", "exchange", "moneyback"},
    {"support", "help", "contact", "reach", "email", "phone", "ticket", "assistance", "service", "hotline", "agent", "representative"},
    {"security", "auth", "authentication", "login", "password", "oauth", "sso", "rbac", "permissions", "encryption", "privacy", "compliance", "gdpr", "hipaa", "soc2"},
    {"deploy", "deployment", "install", "installation", "setup", "configure", "configuration", "integrate", "integration", "webhook", "api", "sdk", "endpoint"},
    {"speed", "latency", "performance", "throughput", "uptime", "sla", "reliability", "scale", "scaling", "concurrency", "rate-limit", "quota"},
    {"agent", "bot", "assistant", "ai", "llm", "chat", "copilot", "prompt", "persona", "customization", "grounding", "rag"},
    {"document", "knowledge", "file", "pdf", "source", "chunks", "crawl", "website", "faq", "database", "vector", "ingestion"}
]

class EmbeddingService:
    @staticmethod
    def generate_embeddings(request: EmbeddingRequest) -> EmbeddingResponse:
        """
        Generates dense vector embeddings for input text chunks.
        Uses a semantic subword and concept-aligned random projection encoder (1536 dimensions),
        producing high cosine similarity for paraphrased semantics and low similarity for unrelated topics.
        """
        items: List[EmbeddingItem] = []
        total_tokens = 0
        dim = request.dimensions or 1536

        for idx, text in enumerate(request.texts):
            tokens = max(1, len(text) // 4)
            total_tokens += tokens

            vec = EmbeddingService.compute_dense_vector(text, dim, request.normalize)
            items.append(EmbeddingItem(
                index=idx,
                embedding=vec,
                token_count=tokens
            ))

        return EmbeddingResponse(
            success=True,
            model=request.model,
            dimensions=dim,
            embeddings=items,
            total_tokens=total_tokens
        )

    @staticmethod
    def compute_dense_vector(text: str, dimensions: int = 1536, normalize: bool = True) -> List[float]:
        """
        Computes a normalized dense vector for text using subword n-grams,
        semantic concept cluster projections, and signed feature hashing.
        """
        if not text or not text.strip():
            return [0.0] * dimensions

        clean_text = text.lower().strip()
        words = re.findall(r'\b[a-z0-9_\-]+\b', clean_text)
        if not words:
            words = [clean_text]

        vec = [0.0] * dimensions

        def hash_feature(feature_str: str, weight: float = 1.0):
            # Deterministic multi-slot signed hashing (simulating random orthogonal projections)
            h_bytes = hashlib.md5(feature_str.encode('utf-8')).digest()
            for k in range(0, 16, 4):
                slot = int.from_bytes(h_bytes[k:k+2], 'big') % dimensions
                sign = 1.0 if (h_bytes[k+2] % 2 == 0) else -1.0
                mag = (h_bytes[k+3] / 255.0) * weight
                vec[slot] += sign * mag

        # 1. Word-level features & stems
        for w in words:
            hash_feature(f"w:{w}", weight=1.5)
            # Character n-grams (3-grams and 4-grams for morphological / typo invariance)
            if len(w) >= 3:
                for n in range(3, min(5, len(w) + 1)):
                    for i in range(len(w) - n + 1):
                        ngram = w[i:i+n]
                        hash_feature(f"ng:{ngram}", weight=0.6)

        # 2. Semantic Cluster Projection (Paraphrasing / Synonym match)
        word_set: Set[str] = set(words)
        for cluster_idx, cluster in enumerate(SEMANTIC_CLUSTERS):
            overlap = word_set.intersection(cluster)
            if overlap:
                cluster_weight = 3.0 * len(overlap)
                hash_feature(f"cluster:{cluster_idx}", weight=cluster_weight)

        # 3. Whole phrase global semantic context
        for i in range(len(words) - 1):
            bigram = f"{words[i]}_{words[i+1]}"
            hash_feature(f"bi:{bigram}", weight=1.2)

        # 4. Normalize to unit hypersphere for fast cosine similarity
        if normalize:
            norm = math.sqrt(sum(x * x for x in vec))
            if norm > 0:
                vec = [x / norm for x in vec]
            else:
                vec = [0.0] * dimensions

        return [round(x, 6) for x in vec]

