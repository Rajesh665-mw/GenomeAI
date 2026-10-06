"""
In-memory per-session conversation store, so the AI Planner can resolve
"compare with TP53" against "analyze BRCA1" from two turns ago.

Same tradeoff as `progress.py`: process-local memory is correct for a
single-worker dev/demo deployment. A production deployment with multiple
workers would need this backed by Redis (or a DB table) instead, keyed the
same way — swapping the implementation behind `ConversationStore` is a
contained change.
"""
from google.genai import types


class ConversationStore:
    def __init__(self) -> None:
        self._sessions: dict[str, list[types.Content]] = {}
        self._last_gene: dict[str, str] = {}

    def get_history(self, session_id: str) -> list[types.Content]:
        return list(self._sessions.setdefault(session_id, []))

    def set_history(self, session_id: str, contents: list[types.Content]) -> None:
        self._sessions[session_id] = contents

    def set_last_gene(self, session_id: str, gene_symbol: str) -> None:
        self._last_gene[session_id] = gene_symbol

    def get_last_gene(self, session_id: str) -> str | None:
        return self._last_gene.get(session_id)

    def reset(self, session_id: str) -> None:
        self._sessions.pop(session_id, None)
        self._last_gene.pop(session_id, None)


conversation_store = ConversationStore()
