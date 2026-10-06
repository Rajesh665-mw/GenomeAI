"""
Gemini Planner Agent — the reasoning/orchestration engine described in the
transformation spec.

Gemini never answers a biomedical question from its own training data. Each
turn runs as:

    user message
        -> Gemini decides which tool(s) to call (native function calling)
        -> tools run against the real service layer, return structured JSON
        -> Gemini sees ONLY that JSON (plus the system contract below)
        -> Gemini streams the final synthesis back to the user

This module owns that loop and turns it into a stream of small, typed
events the API layer can forward over SSE:

    thinking      -- planner started reasoning about the request
    tool_call     -- a specific agent/tool was invoked
    tool_result   -- that agent/tool finished (or failed)
    answer_chunk  -- a piece of the final synthesized answer
    report        -- a report was generated; carries the download URL
    done          -- turn finished
    error         -- something went wrong
"""
from collections.abc import AsyncIterator
from datetime import datetime, timezone
from typing import Any

from google.genai import types

from app.agents.tools import TOOL_DECLARATIONS, TOOL_HANDLERS
from app.core.config import get_settings
from app.core.exceptions import GenomeAIError
from app.db.session import AsyncSessionLocal
from app.models.analysis_history import AnalysisHistory
from app.models.report import Report
from app.orchestrator.conversation_store import conversation_store
from app.services.gemini_client import get_client

SYSTEM_INSTRUCTION = """\
You are the Planner Agent for GenomeAI, a multi-agent genetic disease \
analysis assistant. You are the reasoning layer only — you have no \
biomedical knowledge of your own that you are allowed to use directly.

Rules you must follow on every turn:

1. For ANY claim about a specific gene, disease, risk level, clinical \
significance, research finding, or preventive guidance, you MUST call the \
relevant tool first and base your answer only on what it returns. Never \
answer from your own training knowledge, and never invent, estimate, or \
guess a biomedical fact that no tool returned.
2. Decide which tools are actually needed for what the user asked — do not \
call every tool for every request. "Explain CFTR" needs validation + \
explanation; "generate report for BRCA1" needs generate_report; "compare \
BRCA1 and TP53" needs the relevant tools for both genes.
3. Use conversation history to resolve references like "it", "that gene", \
or "compare with TP53" to the gene discussed earlier.
4. Structure your final answer using this layout, omitting sections you \
have no tool data for:
   🧬 Gene Overview
   Biological Function
   Disease Associations
   Clinical Significance
   Preventive Guidance
   Latest Research
   Verification
   Confidence Score
   References
5. Never phrase anything as a diagnosis or medical certainty. This is \
educational/informational, not clinical advice. If a tool returns no data \
for a gene, say so plainly instead of filling the gap yourself.
6. Be concise. Use the structure above as headings only for sections that \
have content; skip empty ones rather than writing "no data" for every \
missing section.
"""


def _strip_internal_fields(data: dict[str, Any]) -> dict[str, Any]:
    return {k: v for k, v in data.items() if not k.startswith("_")}


class GeminiPlanner:
    def __init__(self) -> None:
        settings = get_settings()
        self._model = settings.GEMINI_MODEL
        self._max_rounds = settings.GEMINI_MAX_TOOL_ROUNDS

    async def stream_turn(
        self, session_id: str, user_message: str, user_id: str | None = None
    ) -> AsyncIterator[dict[str, Any]]:
        client = get_client()  # raises GeminiNotConfiguredError early if no key set
        history = conversation_store.get_history(session_id)
        contents: list[types.Content] = [
            *history,
            types.Content(role="user", parts=[types.Part(text=user_message)]),
        ]

        config = types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            tools=[TOOL_DECLARATIONS],
        )

        yield {"type": "thinking", "text": "Understanding request..."}

        for round_index in range(self._max_rounds):
            model_parts: list[types.Part] = []
            function_calls: list[types.FunctionCall] = []
            emitted_any_text = False

            try:
                stream = await client.aio.models.generate_content_stream(
                    model=self._model, contents=contents, config=config,
                )
                async for chunk in stream:
                    candidates = chunk.candidates or []
                    if not candidates or not candidates[0].content:
                        continue
                    for part in candidates[0].content.parts or []:
                        if getattr(part, "function_call", None):
                            function_calls.append(part.function_call)
                            model_parts.append(part)
                        elif getattr(part, "text", None):
                            model_parts.append(part)
                            is_final_round = round_index == self._max_rounds - 1
                            if not function_calls:
                                # Text streamed before any function_call in
                                # this round is the planner "thinking out
                                # loud" on tool rounds, or the real final
                                # answer once no tools are being called.
                                emitted_any_text = True
                                yield {"type": "answer_chunk", "text": part.text}
            except Exception as exc:  # noqa: BLE001 — surfaced to the client as a single error event
                yield {"type": "error", "message": f"Gemini request failed: {exc}"}
                return

            contents.append(types.Content(role="model", parts=model_parts))

            if not function_calls:
                # No tools requested this round -> whatever text we streamed
                # (if any) was the final answer.
                if not emitted_any_text:
                    yield {"type": "answer_chunk", "text": "I wasn't able to generate a response for that."}
                break

            response_parts: list[types.Part] = []
            for call in function_calls:
                tool_name = call.name
                args = dict(call.args or {})
                handler = TOOL_HANDLERS.get(tool_name)

                yield {"type": "tool_call", "agent": tool_name, "args": args, "status": "started"}

                if handler is None:
                    result: dict[str, Any] = {"error": f"Unknown tool '{tool_name}'"}
                    yield {"type": "tool_result", "agent": tool_name, "status": "failed", "data": result}
                else:
                    try:
                        raw_result = await handler(**args)
                        gene_symbol = raw_result.get("gene_symbol") or args.get("gene_symbol")
                        if gene_symbol:
                            conversation_store.set_last_gene(session_id, gene_symbol)

                        report_path = raw_result.get("_report_pdf_path")
                        result = _strip_internal_fields(raw_result)

                        yield {"type": "tool_result", "agent": tool_name, "status": "completed", "data": result}
                        if tool_name == "generate_report" and "report" in result:
                            yield {
                                "type": "report",
                                "gene_symbol": gene_symbol,
                                "download_url": result["report"]["download_url"],
                                "_pdf_path": report_path,
                            }
                            if user_id:
                                await self._persist_report_as_analysis_history(
                                    user_id, gene_symbol, raw_result.get("_full_result"), report_path,
                                    result["report"]["report_id"],
                                )
                    except GenomeAIError as exc:
                        result = {"error": exc.message}
                        yield {"type": "tool_result", "agent": tool_name, "status": "failed", "data": result}
                    except Exception as exc:  # noqa: BLE001
                        result = {"error": str(exc)}
                        yield {"type": "tool_result", "agent": tool_name, "status": "failed", "data": result}

                response_parts.append(types.Part.from_function_response(name=tool_name, response=result))

            contents.append(types.Content(role="user", parts=response_parts))
        else:
            yield {
                "type": "answer_chunk",
                "text": "\n\n(Reached the tool-call round limit for this turn — "
                        "try a narrower follow-up question.)",
            }

        conversation_store.set_history(session_id, contents)
        yield {"type": "done"}


    async def _persist_report_as_analysis_history(
        self, user_id: str, gene_symbol: str | None, full_result: dict[str, Any] | None,
        pdf_path: str | None, analysis_id: str,
    ) -> None:
        """
        Gives a chat-generated report the exact same AnalysisHistory + Report
        rows the fixed pipeline creates (see orchestrator.py's tail) — so a
        logged-in patient's "previous analyses"/"previous reports" list and
        the existing /reports/{id} endpoints work identically regardless of
        whether the report came from /analyze or from the chat planner.
        Best-effort: a failure here shouldn't break the chat turn the user
        is actively watching.
        """
        if not full_result or not gene_symbol:
            return
        try:
            async with AsyncSessionLocal() as db:
                db.add(AnalysisHistory(
                    id=analysis_id,
                    user_id=user_id,
                    gene_symbol=gene_symbol,
                    status="completed",
                    result_json=full_result,
                    completed_at=datetime.now(timezone.utc),
                ))
                if pdf_path:
                    db.add(Report(analysis_id=analysis_id, pdf_path=pdf_path))
                await db.commit()
        except Exception:  # noqa: BLE001 — logging only; never fail the user-visible turn over this
            import logging
            logging.getLogger(__name__).exception("Failed to persist chat-generated report as AnalysisHistory")


planner = GeminiPlanner()
