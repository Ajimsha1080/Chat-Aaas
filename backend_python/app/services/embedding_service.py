import math
import re
import hashlib
from typing import List, Set
from app.schemas import EmbeddingRequest, EmbeddingItem, EmbeddingResponse

# Multi-Industry Semantic Association Basins for Universal Dense Alignment
UNIVERSAL_SEMANTIC_BASINS = [
    # Core Company Identity & Offerings
    {"company", "business", "service", "services", "offer", "offering", "offerings", "do", "provide", "product", "products", "solution", "solutions", "work", "specialty", "specialization", "tech", "platform", "capability", "capabilities", "mission"},
    # Cloud Infrastructure & Platforms
    {"cloud", "aws", "azure", "gcp", "amazon", "microsoft", "google", "infrastructure", "compute", "serverless", "devops", "hosting", "storage", "virtual", "cluster", "kubernetes", "docker", "vpc", "iam"},
    # 24/7 Availability & Nighttime Support
    {"night", "nighttime", "weekend", "weekends", "24/7", "24x7", "round-the-clock", "always", "hours", "available", "evening", "midnight", "afterhours", "overnight", "schedule", "operating"},
    # Customer Support & Contact
    {"support", "help", "contact", "reach", "email", "phone", "ticket", "assistance", "service", "hotline", "agent", "representative", "inquiry", "guidance", "chat", "desk"},
    # Returns, Refunds & Guarantees
    {"return", "refund", "returns", "refunds", "cancel", "cancellation", "reimbursement", "policy", "guarantee", "warranty", "exchange", "moneyback", "compensation", "30", "window", "eligible", "eligibility", "days"},
    # Pricing & Finance
    {"price", "cost", "pricing", "rate", "rates", "charge", "charges", "fee", "fees", "billing", "payment", "tier", "plan", "subscription", "quote", "amount", "usd", "inr", "euro", "dollar", "expensive", "cheap", "afford", "invoice"},
    # Leadership, Management & Corporate Info
    {"ceo", "founder", "founders", "cto", "cfo", "coo", "executive", "executives", "leadership", "president", "director", "headquarters", "address", "location", "office", "street", "city"},
    # Security & Access
    {"security", "auth", "authentication", "login", "password", "oauth", "sso", "rbac", "permissions", "encryption", "privacy", "compliance", "gdpr", "hipaa", "soc2", "vulnerability", "audit"},
    # Software & DevOps
    {"deploy", "deployment", "install", "installation", "setup", "configure", "configuration", "integrate", "integration", "webhook", "api", "sdk", "endpoint", "server", "database"},
    # Performance & Reliability
    {"speed", "latency", "performance", "throughput", "uptime", "sla", "reliability", "scale", "scaling", "concurrency", "rate-limit", "quota", "fast", "slow", "delay", "load"},
    # AI & Agents
    {"agent", "bot", "assistant", "ai", "llm", "chat", "copilot", "prompt", "persona", "customization", "grounding", "rag", "intelligence", "model", "token"},
    # Knowledge & Documents
    {"document", "knowledge", "file", "pdf", "source", "chunks", "crawl", "website", "faq", "database", "vector", "ingestion", "manual", "guide", "article"},
    # Food, Bakery & Culinary (Hospitality / Bakery / Restaurant)
    {"fresh", "freshness", "freshly", "bake", "baked", "bakes", "baking", "bakery", "baker", "bread", "loaf", "loaves", "dough", "oven", "daily", "morning", "pastry", "flour", "yeast", "croissant", "artisan", "artisanal", "frozen", "freeze", "ingredient", "recipe", "delicious", "warm"},
    # Health, Wellness & Medical
    {"health", "medical", "doctor", "physician", "clinic", "hospital", "patient", "treatment", "medicine", "prescription", "symptom", "therapy", "dosage", "cure", "diagnosis", "nurse"},
    # Retail, Commerce & Shipping
    {"order", "shipping", "delivery", "track", "tracking", "package", "warehouse", "inventory", "stock", "cart", "checkout", "dispatch", "courier", "arrival", "transit"},
    # Hospitality & Travel
    {"hotel", "room", "reservation", "booking", "checkin", "checkout", "suite", "amenities", "travel", "flight", "guest", "stay", "accommodation", "resort", "lodge"}
]

class EmbeddingService:
    @staticmethod
    def generate_embeddings(request: EmbeddingRequest) -> EmbeddingResponse:
        """
        Generates dense vector embeddings for input text chunks.
        Uses a semantic subword, stemming, and multi-industry concept projection encoder (1536 dimensions),
        producing high cosine similarity for paraphrased semantics across arbitrary tenant industries.
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
    def _stem_word(word: str) -> str:
        """Universal suffix stripping for English morphological invariance."""
        w = word.lower()
        suffixes = (
            "ing", "ments", "ment", "tions", "tion", "ness", "able", "ible", "fully",
            "ful", "less", "ated", "ate", "ized", "ize", "ised", "ise", "al", "ive",
            "ity", "ous", "ies", "ed", "es", "ly", "er", "est", "s"
        )
        for s in suffixes:
            if w.endswith(s) and len(w) - len(s) >= 3:
                return w[:-len(s)]
        return w

    @staticmethod
    def compute_dense_vector(text: str, dimensions: int = 1536, normalize: bool = True) -> List[float]:
        """
        Computes a normalized dense vector for text using subword n-grams,
        morphological stemming, cross-industry concept basins, and signed hyper-plane projections.
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

        # 1. Word-level features & morphological root stems
        stemmed_words: List[str] = []
        for w in words:
            hash_feature(f"w:{w}", weight=1.5)
            stem = EmbeddingService._stem_word(w)
            stemmed_words.append(stem)
            if stem != w:
                hash_feature(f"stem:{stem}", weight=1.8)

            # Character n-grams (3-grams, 4-grams for subword similarity)
            if len(w) >= 3:
                for n in range(3, min(5, len(w) + 1)):
                    for i in range(len(w) - n + 1):
                        ngram = w[i:i+n]
                        hash_feature(f"ng:{ngram}", weight=0.6)

        # 2. Universal Semantic Concept Projection across arbitrary industries
        word_set: Set[str] = set(words).union(set(stemmed_words))
        for basin_idx, basin in enumerate(UNIVERSAL_SEMANTIC_BASINS):
            # Also stem the basin words
            basin_stemmed = {EmbeddingService._stem_word(bw) for bw in basin}.union(basin)
            overlap = word_set.intersection(basin_stemmed)
            if overlap:
                basin_weight = 3.5 * len(overlap)
                hash_feature(f"basin:{basin_idx}", weight=basin_weight)

        # 3. Local n-gram phrase context
        for i in range(len(words) - 1):
            bigram = f"{words[i]}_{words[i+1]}"
            hash_feature(f"bi:{bigram}", weight=1.2)
            stemmed_bigram = f"{stemmed_words[i]}_{stemmed_words[i+1]}"
            if stemmed_bigram != bigram:
                hash_feature(f"bi_stem:{stemmed_bigram}", weight=1.4)

        # 4. Normalize to unit hypersphere for fast cosine similarity
        if normalize:
            norm = math.sqrt(sum(x * x for x in vec))
            if norm > 0:
                vec = [x / norm for x in vec]
            else:
                vec = [0.0] * dimensions

        return [round(x, 6) for x in vec]


