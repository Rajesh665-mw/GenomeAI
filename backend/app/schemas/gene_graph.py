"""Schemas for the doctor/researcher gene relationship graph."""
from pydantic import BaseModel


class GraphNode(BaseModel):
    symbol: str
    name: str


class GraphEdge(BaseModel):
    source: str
    target: str
    shared_diseases: list[str]


class GeneRelationshipGraph(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]
    # Genes in the request that share no disease association with any other
    # gene in the set — surfaced explicitly rather than just omitted, so the
    # UI can say "no direct relationship found" instead of looking broken.
    isolated_genes: list[str]
