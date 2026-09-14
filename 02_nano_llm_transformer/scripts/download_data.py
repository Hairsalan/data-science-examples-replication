"""Data Preparation (CRISP-DM step 3), part 1: download raw corpora.

Downloads:
  - TinyStories (GPT-4 regenerated) train/val text files -> data/raw/
  - Databricks Dolly 15k instruction jsonl -> data/raw/

Idempotent: skips files that already exist.
"""
from __future__ import annotations

import sys
from pathlib import Path

from huggingface_hub import hf_hub_download

ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "data" / "raw"

FILES = [
    dict(repo_id="roneneldan/TinyStories", repo_type="dataset", filename="TinyStoriesV2-GPT4-train.txt"),
    dict(repo_id="roneneldan/TinyStories", repo_type="dataset", filename="TinyStoriesV2-GPT4-valid.txt"),
    dict(repo_id="databricks/databricks-dolly-15k", repo_type="dataset", filename="databricks-dolly-15k.jsonl"),
]


def main() -> None:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    for spec in FILES:
        dest = RAW_DIR / spec["filename"]
        if dest.exists() and dest.stat().st_size > 0:
            print(f"[skip] {dest} already exists ({dest.stat().st_size / 1e6:.1f} MB)")
            continue
        print(f"[download] {spec['repo_id']}::{spec['filename']}")
        path = hf_hub_download(
            repo_id=spec["repo_id"],
            repo_type=spec["repo_type"],
            filename=spec["filename"],
            local_dir=str(RAW_DIR),
        )
        print(f"  -> {path}")
    print("Done.")


if __name__ == "__main__":
    sys.exit(main())
