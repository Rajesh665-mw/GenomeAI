from pydantic import BaseModel


class GeneResponse(BaseModel):
    symbol: str
    name: str
    aliases: list[str] = []
    description: str | None = None
    chromosome: str | None = None
