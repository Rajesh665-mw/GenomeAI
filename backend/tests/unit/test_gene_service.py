import pytest

from app.services import gene_service


@pytest.mark.asyncio
async def test_validate_known_gene():
    record = await gene_service.validate_gene("brca1")  # lowercase input
    assert record is not None
    assert record.symbol == "BRCA1"
    assert record.chromosome == "17q21.31"


@pytest.mark.asyncio
async def test_validate_unknown_but_syntactically_valid_gene():
    record = await gene_service.validate_gene("XYZ99")
    assert record is not None
    assert record.symbol == "XYZ99"
    assert record.chromosome is None


@pytest.mark.asyncio
async def test_validate_malformed_symbol_returns_none():
    assert await gene_service.validate_gene("") is None
    assert await gene_service.validate_gene("!!!") is None
    assert await gene_service.validate_gene("123START") is None
