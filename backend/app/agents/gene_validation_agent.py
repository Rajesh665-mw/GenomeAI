from app.agents.base import BaseAgent
from app.core.exceptions import InvalidGeneSymbolError
from app.orchestrator.context import AnalysisContext
from app.schemas.analyze import GeneValidation
from app.services import gene_service


class GeneValidationAgent(BaseAgent):
    name = "Gene Validation Agent"
    completion_event = "Gene Validated"
    required = True

    async def run(self, context: AnalysisContext) -> AnalysisContext:
        record = await gene_service.validate_gene(context.gene_symbol)
        if record is None:
            raise InvalidGeneSymbolError(
                f"'{context.gene_symbol}' is not a syntactically valid gene symbol."
            )

        context.validation = GeneValidation(
            valid=True,
            symbol=context.gene_symbol,
            normalized_symbol=record.symbol,
            name=record.name,
            aliases=record.aliases,
            chromosome=record.chromosome,
        )
        # keep the rest of the pipeline working off the normalized symbol
        context.gene_symbol = record.symbol
        return context
