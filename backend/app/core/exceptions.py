"""
Application-wide exception types and their FastAPI handlers.

Agents and services raise these instead of generic Exceptions, so the API
layer can translate them into consistent, predictable HTTP responses.
"""
from fastapi import Request
from fastapi.responses import JSONResponse


class GenomeAIError(Exception):
    """Base class for all application-specific errors."""

    status_code: int = 500
    error_code: str = "internal_error"

    def __init__(self, message: str, *, details: dict | None = None):
        super().__init__(message)
        self.message = message
        self.details = details or {}


class GeneNotFoundError(GenomeAIError):
    status_code = 404
    error_code = "gene_not_found"


class InvalidGeneSymbolError(GenomeAIError):
    status_code = 422
    error_code = "invalid_gene_symbol"


class AnalysisNotFoundError(GenomeAIError):
    status_code = 404
    error_code = "analysis_not_found"


class AgentExecutionError(GenomeAIError):
    """Raised when a required agent fails and the pipeline cannot continue."""

    status_code = 502
    error_code = "agent_execution_failed"


class ReportNotReadyError(GenomeAIError):
    status_code = 409
    error_code = "report_not_ready"


class EmailAlreadyRegisteredError(GenomeAIError):
    status_code = 409
    error_code = "email_already_registered"


class InvalidCredentialsError(GenomeAIError):
    status_code = 401
    error_code = "invalid_credentials"


class NotAuthenticatedError(GenomeAIError):
    status_code = 401
    error_code = "not_authenticated"


class ForbiddenError(GenomeAIError):
    status_code = 403
    error_code = "forbidden"


class ConsultationNotFoundError(GenomeAIError):
    status_code = 404
    error_code = "consultation_not_found"


async def genomeai_exception_handler(request: Request, exc: GenomeAIError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.error_code,
            "message": exc.message,
            "details": exc.details,
        },
    )
