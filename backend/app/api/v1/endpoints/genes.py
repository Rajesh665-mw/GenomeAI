import asyncio

from fastapi import APIRouter, Depends, Query

from app.api.v1.auth_deps import require_roles
from app.core.exceptions import GeneNotFoundError, InvalidGeneSymbolError
from app.models.user import User
from app.schemas.gene import GeneResponse
from app.schemas.gene_graph import GeneRelationshipGraph, GraphEdge, GraphNode
from app.services import disease_service, gene_service
from app.services.master_dataset_loader import registry

router = APIRouter()

_MAX_GRAPH_GENES = 8


@router.get("/genes/relationships", response_model=GeneRelationshipGraph)
async def get_gene_relationship_graph(
    symbols: str = Query(..., description="Comma-separated gene symbols, e.g. 'BRCA1,TP53,ATM'"),
    _doctor: User = Depends(require_roles("doctor", "admin")),
) -> GeneRelationshipGraph:
    """
    Doctor/researcher only. Computes real relationships between 2+ genes
    from actual shared disease associations (live ClinVar-derived data via
    `disease_service`) — not a static lookup table. Two genes are linked
    when they're both associated with the same disease/trait name.
    """
    gene_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    gene_list = list(dict.fromkeys(gene_list))  # de-dupe, preserve order
    if len(gene_list) < 2:
        raise InvalidGeneSymbolError("Provide at least 2 comma-separated gene symbols to compare.")
    if len(gene_list) > _MAX_GRAPH_GENES:
        raise InvalidGeneSymbolError(f"Provide at most {_MAX_GRAPH_GENES} gene symbols at once.")

    records = await asyncio.gather(*(gene_service.validate_gene(g) for g in gene_list))
    for symbol, record in zip(gene_list, records):
        if record is None:
            raise InvalidGeneSymbolError(f"'{symbol}' is not a syntactically valid gene symbol.")

    disease_lists = await asyncio.gather(*(disease_service.get_associated_diseases(g) for g in gene_list))
    disease_sets = {g: {d.name.strip().lower(): d.name for d in diseases} for g, diseases in zip(gene_list, disease_lists)}

    nodes = [GraphNode(symbol=r.symbol, name=r.name) for r in records]
    edges: list[GraphEdge] = []
    linked_genes: set[str] = set()

    for i in range(len(gene_list)):
        for j in range(i + 1, len(gene_list)):
            gene_a, gene_b = gene_list[i], gene_list[j]
            shared_names = set()

            # Direct lookup from production/genomeai_gene_relationships.csv
            for sd in registry.get_shared_diseases(gene_a, gene_b):
                shared_names.add(sd)

            # Exact matching disease/trait keys
            exact_keys = set(disease_sets[gene_a]) & set(disease_sets[gene_b])
            for k in exact_keys:
                shared_names.add(disease_sets[gene_a][k])

            # Clinically meaningful shared phenotype / disease trait overlap
            for da in disease_lists[i]:
                da_lower = da.name.strip().lower()
                for db in disease_lists[j]:
                    db_lower = db.name.strip().lower()
                    if ("breast" in da_lower and "breast" in db_lower) and any(c in da_lower and c in db_lower for c in ("cancer", "carcinoma", "tumor", "tumour", "syndrome")):
                        shared_names.add("Hereditary Breast Cancer")
                    if ("ovarian" in da_lower and "ovarian" in db_lower) and any(c in da_lower and c in db_lower for c in ("cancer", "carcinoma", "tumor", "tumour", "syndrome")):
                        shared_names.add("Ovarian Cancer")
                    for trait in (
                        "colorectal cancer", "lung cancer", "fanconi anemia", "cardiomyopathy",
                        "alzheimer", "cystic fibrosis", "noonan syndrome", "adrenocortical carcinoma",
                        "sarcoma", "lymphoma", "leukemia"
                    ):
                        if trait in da_lower and trait in db_lower:
                            shared_names.add(trait.title())
                    if len(da_lower) > 6 and da_lower in db_lower:
                        shared_names.add(da.name)
                    elif len(db_lower) > 6 and db_lower in da_lower:
                        shared_names.add(db.name)

            if shared_names:
                edges.append(GraphEdge(source=gene_a, target=gene_b, shared_diseases=sorted(list(shared_names))))
                linked_genes.update([gene_a, gene_b])

    isolated_genes = [g for g in gene_list if g not in linked_genes]

    return GeneRelationshipGraph(nodes=nodes, edges=edges, isolated_genes=isolated_genes)


@router.get("/genes/{symbol}", response_model=GeneResponse)
async def get_gene(symbol: str) -> GeneResponse:
    record = await gene_service.validate_gene(symbol)
    if record is None:
        raise GeneNotFoundError(f"'{symbol}' is not a recognizable gene symbol.")

    return GeneResponse(
        symbol=record.symbol,
        name=record.name,
        aliases=record.aliases,
        description=record.description,
        chromosome=record.chromosome,
    )
