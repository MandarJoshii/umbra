from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from db import SessionLocal
from embeddings import embed_text

app = FastAPI(title="Umbra AI Service")


class RunbookCreate(BaseModel):
    title: str
    content: str


class RunbookSearchQuery(BaseModel):
    query: str
    limit: int = 5


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "ai-service"}


@app.post("/runbooks")
def create_runbook(runbook: RunbookCreate):
    embedding = embed_text(runbook.content)

    session = SessionLocal()
    try:
        result = session.execute(
            text(
                """
                INSERT INTO runbooks (title, content, embedding, created_at)
                VALUES (:title, :content, :embedding, now())
                RETURNING id, title, content, created_at
                """
            ),
            {"title": runbook.title, "content": runbook.content, "embedding": str(embedding)},
        )
        session.commit()
        row = result.fetchone()
        return {"id": row.id, "title": row.title, "content": row.content, "createdAt": str(row.created_at)}
    finally:
        session.close()


@app.post("/runbooks/search")
def search_runbooks(query: RunbookSearchQuery):
    query_embedding = embed_text(query.query)

    session = SessionLocal()
    try:
        # <=> is pgvector's cosine distance operator: smaller = more similar.
        # We order by it ascending to get the closest (most relevant) matches first.
        result = session.execute(
            text(
                """
                SELECT id, title, content,
                       1 - (embedding <=> :query_embedding) AS similarity
                FROM runbooks
                ORDER BY embedding <=> :query_embedding
                LIMIT :limit
                """
            ),
            {"query_embedding": str(query_embedding), "limit": query.limit},
        )
        rows = result.fetchall()
        return [
            {"id": r.id, "title": r.title, "content": r.content, "similarity": float(r.similarity)}
            for r in rows
        ]
    finally:
        session.close()