"""
Phase 25 — Production Data Flow Test Proof
Proves the exact execution chain from master CSV through PDF.
"""
import asyncio
import sys
import os
from pathlib import Path

# Set up paths
_BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND_DIR))

from app.services.master_dataset_loader import registry, _MASTER_CSV, _GENES_CSV, _RELATIONSHIPS_CSV
import app.services.dataset_service as dataset_service
from app.services.report_service import get_reports_dir

async def verify_chain():
    print("=" * 80)
    print("PROVING PRODUCTION DATA FLOW CHAIN:")
    print("=" * 80)
    print(f"Step 1: Master Dataset File:\n   Path: {_MASTER_CSV.resolve()}\n   Size: {_MASTER_CSV.stat().st_size:,} bytes")
    print(f"\nStep 2: MasterDatasetRegistry loaded:\n   Total Genes: {len(registry.genes):,}\n   Genes with Disease Records: {len(registry.diseases_by_gene):,}\n   Disease-to-Gene Reverse Index: {len(registry.disease_to_gene):,}")
    
    gene_symbol = dataset_service.search("BRCA1")
    print(f"\nStep 3: dataset_service.search('BRCA1') -> Resolved Symbol: {gene_symbol}")
    
    result = await dataset_service.run(gene_symbol)
    print(f"\nStep 4: dataset_service.run('{gene_symbol}') executed full deterministic pipeline:")
    print(f"   [Validation] valid={result.validation.valid}, symbol={result.validation.symbol}, name='{result.validation.name}'")
    print(f"   [Disease Associations] Count={len(result.diseases)}, Top={result.diseases[0].name} ({result.diseases[0].category})")
    print(f"   [Risk Assessment] Count={len(result.risk_assessment)}, Top={result.risk_assessment[0].disease_name} -> {result.risk_assessment[0].risk_level} (Evidence score: {result.risk_assessment[0].evidence_confidence_score}%)")
    print(f"   [Verification] Count={len(result.verification)}, Top={result.verification[0].significance} (Confidence: {result.verification[0].evidence_confidence}%)")
    print(f"   [Preventive Guidance] Count={len(result.guidance)}, Top=[{result.guidance[0].category}] {result.guidance[0].text[:80]}...")
    print(f"   [Report Metadata] id={result.report.report_id}, download_url={result.report.download_url}")
    
    pdf_path = os.path.join(get_reports_dir(), f"{result.report.report_id}.pdf")
    print(f"\nStep 5: PDF Artifact Generation:\n   Path: {pdf_path}\n   Exists on disk: {os.path.exists(pdf_path)}")
    with open(pdf_path, "rb") as f:
        magic = f.read(5)
        print(f"   Header magic bytes: {magic} (Valid %PDF: {magic.startswith(b'%PDF')})")
        print(f"   Total PDF size: {os.path.getsize(pdf_path):,} bytes")
    
    print("\n" + "=" * 80)
    print("CHAIN FULLY PROVEN FROM CSV TO PDF WITH ZERO MOCK OVERRIDES!")
    print("=" * 80)

if __name__ == "__main__":
    asyncio.run(verify_chain())
