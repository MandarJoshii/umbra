import os
import json
from anthropic import Anthropic
from db import SessionLocal
from embeddings import embed_text
from sqlalchemy import text

client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

MODEL = "claude-sonnet-4-5"

# This describes our search_runbooks tool to Claude — its name, what it does,
# and the exact shape of arguments it should provide when calling it.
# Claude uses this description to decide WHEN and HOW to call the tool.
TOOLS = [
    {
        "name": "search_runbooks",
        "description": (
            "Search past incident runbooks using semantic search. "
            "Use this to find relevant troubleshooting guidance for an incident "
            "based on its symptoms, even if the exact wording doesn't match."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "A description of the incident or symptoms to search for",
                }
            },
            "required": ["query"],
        },
    }
]


def search_runbooks(query: str, limit: int = 3):
    """The actual function that runs when Claude calls the search_runbooks tool."""
    query_embedding = embed_text(query)

    session = SessionLocal()
    try:
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
            {"query_embedding": str(query_embedding), "limit": limit},
        )
        rows = result.fetchall()
        return [
            {"title": r.title, "content": r.content, "similarity": float(r.similarity)}
            for r in rows
        ]
    finally:
        session.close()


def analyze_incident(incident_description: str) -> str:
    """
    Sends an incident description to Claude, lets it call search_runbooks
    as needed, and returns the final written analysis.
    """
    messages = [
        {
            "role": "user",
            "content": (
                f"An incident has occurred: {incident_description}\n\n"
                "Search for relevant runbooks and propose a root cause analysis, "
                "citing any runbook evidence you find."
            ),
        }
    ]

    # The agent loop: keep going as long as Claude wants to call tools.
    while True:
        response = client.messages.create(
            model=MODEL,
            max_tokens=1024,
            tools=TOOLS,
            messages=messages,
        )

        # If Claude didn't ask to use a tool, it's given us its final answer.
        if response.stop_reason != "tool_use":
            final_text = "".join(
                block.text for block in response.content if block.type == "text"
            )
            return final_text

        # Claude wants to call a tool. Add its request to the conversation,
        # actually run the tool, and send the result back.
        messages.append({"role": "assistant", "content": response.content})

        tool_results = []
        for block in response.content:
            if block.type != "tool_use":
                continue

            if block.name == "search_runbooks":
                result = search_runbooks(block.input["query"])
                tool_results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": json.dumps(result),
                    }
                )

        messages.append({"role": "user", "content": tool_results})