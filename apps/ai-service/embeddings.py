from sentence_transformers import SentenceTransformer

# all-MiniLM-L6-v2 is a small, fast, well-regarded general-purpose embedding model.
# It produces 384-dimensional vectors — NOT 1536 like OpenAI's model, so we'll need
# to update our runbooks.embedding column to match. Loading it here, once, at module
# level means the (somewhat slow) model download/load happens a single time when the
# service starts, not on every request.
model = SentenceTransformer("all-MiniLM-L6-v2")


def embed_text(text: str) -> list[float]:
    embedding = model.encode(text)
    return embedding.tolist()