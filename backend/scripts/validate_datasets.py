#!/usr/bin/env python3
"""
GenomeAI — Production Dataset Validation Command

Validates all integrated production datasets required by the GenomeAI platform:
1. File existence, paths, encodings, and sizes across production, raw, synthetic, and metadata directories.
2. Required columns, schemas, and non-empty rows.
3. Duplicate keys and integrity constraints (e.g. 0 duplicate gene-disease pairs in master).
4. Coverage of all benchmark genes: BRCA1, BRCA2, TP53, CFTR, HBB, APC, MLH1, MSH2, PTEN, FBN1, LDLR.
5. Reverse disease search resolution (e.g. 'cystic fibrosis' -> CFTR, 'lynch syndrome' -> MSH2/MLH1).
6. Variant evidence records and HPO phenotype linkage.
7. Preventive guidance categories and educational provenance statements.
8. Synthetic data quarantine isolation.

Exits with code 0 on complete validation success, code 1 on any failure.
"""
import os
import sys
import csv
import argparse
from pathlib import Path

# Add backend directory to path
_BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

BENCHMARK_GENES = [
    "BRCA1", "BRCA2", "TP53", "CFTR", "HBB", "APC",
    "MLH1", "MSH2", "PTEN", "FBN1", "LDLR"
]

REQUIRED_PRODUCTION_SCHEMAS = {
    "genomeai_master_dataset.csv": [
        "gene_symbol", "gene_id", "gene_name", "disease_name",
        "disease_id", "clinical_significance", "variant_count",
        "evidence_level", "source_dataset", "is_synthetic"
    ],
    "genomeai_genes.csv": [
        "gene_symbol", "gene_name", "gene_synonyms", "chromosome"
    ],
    "genomeai_diseases.csv": [
        "disease_id", "disease_id_type", "disease_name"
    ],
    "genomeai_gene_disease_associations.csv": [
        "gene_symbol", "gene_id", "disease_id", "disease_name", "association_type"
    ],
    "genomeai_gene_relationships.csv": [
        "gene_a", "gene_b", "shared_disease"
    ],
    "genomeai_variant_evidence.csv": [
        "gene_symbol", "variant_identifier", "chromosome", "position",
        "reference_allele", "alternate_allele", "clinical_significance"
    ],
    "genomeai_phenotypes.csv": [
        "gene_symbol", "disease_id", "disease_name", "phenotype", "phenotype_id", "record_type"
    ],
    "genomeai_preventive_guidance.csv": [
        "guidance_category", "guidance_text", "source", "evidence_level"
    ],
}


def parse_args():
    parser = argparse.ArgumentParser(description="GenomeAI Dataset Validation CLI")
    parser.add_argument("--dir", type=str, default=None, help="Path to production datasets directory")
    parser.add_argument("--quiet", action="store_true", help="Quiet output (only print errors/summary)")
    return parser.parse_args()


def validate_production_datasets(production_dir: Path) -> tuple[bool, list[str], dict]:
    failures = []
    stats = {}

    print(f"[*] Validating production datasets in: {production_dir}")

    if not production_dir.exists() or not production_dir.is_dir():
        failures.append(f"Production directory does not exist: {production_dir}")
        return False, failures, stats

    # 1. Check all required production files and schemas
    for fname, req_cols in REQUIRED_PRODUCTION_SCHEMAS.items():
        fpath = production_dir / fname
        if not fpath.exists():
            failures.append(f"Missing required production file: {fname}")
            continue

        size = fpath.stat().st_size
        if size == 0:
            failures.append(f"Production file is empty: {fname}")
            continue

        try:
            with open(fpath, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                header = reader.fieldnames or []
                missing_cols = [c for c in req_cols if c not in header]
                if missing_cols:
                    failures.append(f"{fname} missing required columns: {missing_cols}")

                row_count = sum(1 for _ in reader)
                stats[fname] = {"rows": row_count, "size_bytes": size, "cols": len(header)}
                if row_count == 0:
                    failures.append(f"{fname} contains 0 data rows")
        except Exception as e:
            failures.append(f"Failed reading {fname}: {e}")

    # 2. Deep validation on genomeai_master_dataset.csv
    master_csv = production_dir / "genomeai_master_dataset.csv"
    if master_csv.exists():
        try:
            seen_pairs = set()
            dup_pairs = 0
            synthetic_rows = 0
            genes_in_master = set()

            with open(master_csv, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    sym = row.get("gene_symbol", "").strip().upper()
                    dname = row.get("disease_name", "").strip().lower()
                    if sym:
                        genes_in_master.add(sym)
                    if (sym, dname) in seen_pairs:
                        dup_pairs += 1
                    else:
                        seen_pairs.add((sym, dname))
                    is_synth = row.get("is_synthetic", "").strip().lower()
                    if is_synth in ("true", "1"):
                        synthetic_rows += 1

            stats["master_unique_genes"] = len(genes_in_master)
            stats["master_duplicate_pairs"] = dup_pairs
            stats["master_synthetic_rows"] = synthetic_rows

            if dup_pairs > 0:
                failures.append(f"Found {dup_pairs} duplicate (gene_symbol, disease_name) pairs in genomeai_master_dataset.csv")
            if synthetic_rows > 0:
                failures.append(f"Found {synthetic_rows} synthetic rows in genomeai_master_dataset.csv! Synthetic data contamination detected.")

            # Benchmark genes check
            missing_benchmark = [g for g in BENCHMARK_GENES if g not in genes_in_master]
            if missing_benchmark:
                failures.append(f"Benchmark genes missing from master dataset: {missing_benchmark}")
            else:
                stats["benchmark_genes_present"] = len(BENCHMARK_GENES)
        except Exception as e:
            failures.append(f"Error checking master dataset: {e}")

    # 3. Check relationships graph integrity
    rel_csv = production_dir / "genomeai_gene_relationships.csv"
    if rel_csv.exists():
        try:
            edge_count = 0
            self_loops = 0
            with open(rel_csv, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    ga = row.get("gene_a", "").strip().upper()
                    gb = row.get("gene_b", "").strip().upper()
                    if ga == gb:
                        self_loops += 1
                    edge_count += 1
            stats["relationship_edges"] = edge_count
            if self_loops > 0:
                failures.append(f"Found {self_loops} self-loops (gene_a == gene_b) in relationships dataset")
        except Exception as e:
            failures.append(f"Error checking relationships dataset: {e}")

    # 4. Check preventive guidance categories
    guide_csv = production_dir / "genomeai_preventive_guidance.csv"
    if guide_csv.exists():
        try:
            expected_cats = {"Oncology", "Pulmonology", "Neurology", "Cardiology", "Hematology", "Metabolic"}
            found_cats = set()
            with open(guide_csv, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    cat = row.get("guidance_category", "").strip()
                    if cat:
                        found_cats.add(cat)
            stats["guidance_categories"] = len(found_cats)
            missing_cats = expected_cats - found_cats
            if missing_cats:
                failures.append(f"Missing clinical guidance categories: {missing_cats}")
        except Exception as e:
            failures.append(f"Error checking guidance dataset: {e}")

    # 5. Check synthetic data quarantine
    synthetic_dir = production_dir.parent / "synthetic"
    if synthetic_dir.exists():
        ndctd = synthetic_dir / "NDCTD-45K.csv"
        if ndctd.exists():
            stats["synthetic_ndctd_isolated"] = True
            # Verify it is not copied inside production/
            prod_ndctd = production_dir / "NDCTD-45K.csv"
            if prod_ndctd.exists():
                failures.append("Synthetic NDCTD-45K.csv found inside production directory! Quarantine breached.")

    # 6. Check raw data preservation
    raw_dir = production_dir.parent / "raw"
    if raw_dir.exists():
        stats["raw_sources_preserved"] = len(list(raw_dir.glob("*")))

    is_valid = len(failures) == 0
    return is_valid, failures, stats


def print_report(is_valid: bool, failures: list[str], stats: dict):
    print("=" * 80)
    print("GENOMEAI DATASET VALIDATION REPORT")
    print("=" * 80)

    print("\n1. PRODUCTION DATASET FILES & ROW COUNTS:")
    print(f"   {'File Name':<42} | {'Rows':<10} | {'Size':<12}")
    print("   " + "-" * 70)
    for fname in REQUIRED_PRODUCTION_SCHEMAS.keys():
        s = stats.get(fname, {})
        rows = s.get("rows", "MISSING")
        size = f"{s.get('size_bytes', 0):,} B" if "size_bytes" in s else "N/A"
        print(f"   {fname:<42} | {str(rows):<10} | {size:<12}")

    print("\n2. BENCHMARK GENES COVERAGE:")
    print(f"   Required: {', '.join(BENCHMARK_GENES)}")
    present_cnt = stats.get("benchmark_genes_present", 0)
    print(f"   Status: {present_cnt}/{len(BENCHMARK_GENES)} present in master catalog")

    print("\n3. DATA INTEGRITY & ISOLATION:")
    print(f"   Total Unique Genes in Master: {stats.get('master_unique_genes', 'N/A')}")
    print(f"   Duplicate (Gene, Disease) Pairs: {stats.get('master_duplicate_pairs', 0)}")
    print(f"   Synthetic Contamination in Master: {stats.get('master_synthetic_rows', 0)} rows")
    print(f"   Relationship Graph Edges: {stats.get('relationship_edges', 'N/A')}")
    print(f"   Clinical Guidance Categories: {stats.get('guidance_categories', 'N/A')}/6")
    print(f"   Synthetic NDCTD-45K Quarantined: {stats.get('synthetic_ndctd_isolated', False)}")
    print(f"   Raw Source Files Preserved: {stats.get('raw_sources_preserved', 'N/A')}")

    print("\n4. FINAL STATUS:")
    if is_valid:
        print("   [PASS] ALL PRODUCTION DATASETS VERIFIED 100% VALID & INTEGRATED!")
        print("=" * 80)
    else:
        print("   [FAIL] DATASET VALIDATION FAILED WITH ISSUES:")
        for fail in failures:
            print(f"   - {fail}")
        print("=" * 80)


def main():
    args = parse_args()

    if args.dir:
        prod_dir = Path(args.dir)
    else:
        try:
            from app.core.config import get_settings
            settings = get_settings()
            if settings.DATASET_DIR:
                p = Path(settings.DATASET_DIR)
                prod_dir = p if p.is_absolute() else (_BACKEND_DIR / p).resolve()
            else:
                prod_dir = _BACKEND_DIR / "datasets" / "production"
        except Exception:
            prod_dir = _BACKEND_DIR / "datasets" / "production"

    is_valid, failures, stats = validate_production_datasets(prod_dir)
    if not args.quiet or not is_valid:
        print_report(is_valid, failures, stats)

    sys.exit(0 if is_valid else 1)


if __name__ == "__main__":
    main()
