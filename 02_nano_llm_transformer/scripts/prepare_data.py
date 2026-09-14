"""Data Preparation (CRISP-DM step 3), part 2: clean, train tokenizer, pack.

Stages (run with --stage all, or one at a time):
  clean      TinyStories: dedupe + filter + subsample -> data/processed/tinystories_{train,val}.txt
             Dolly:       dedupe + filter + 95/5 split -> data/processed/dolly_{train,val}.jsonl
  tokenizer  train an 8,192-vocab byte-level BPE tokenizer on the cleaned TinyStories train text
  pack       tokenize TinyStories -> flat uint16 .bin files for pretraining
  sft        tokenize Dolly (instruction/response template) -> fixed-shape .npy arrays for SFT

All stats are written to data/processed/stats.json, which the dashboard reads.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from nano_llm.tokenizer import (  # noqa: E402
    NanoTokenizer, train_tokenizer, EOS_TOKEN, INSTRUCTION_TOKEN, CONTEXT_TOKEN, RESPONSE_TOKEN,
)
from nano_llm.utils import load_yaml  # noqa: E402
from nano_llm.data import write_token_bin  # noqa: E402

RAW_DIR = ROOT / "data" / "raw"
PROC_DIR = ROOT / "data" / "processed"
TOK_DIR = ROOT / "data" / "tokenizer"
STATS_PATH = PROC_DIR / "stats.json"


def load_stats() -> dict:
    if STATS_PATH.exists():
        return json.loads(STATS_PATH.read_text(encoding="utf-8"))
    return {}


def save_stats(stats: dict) -> None:
    PROC_DIR.mkdir(parents=True, exist_ok=True)
    STATS_PATH.write_text(json.dumps(stats, indent=2), encoding="utf-8")


def clean_tinystories(max_train: int, max_val: int) -> dict:
    stats = {}
    for split, max_n in [("train", max_train), ("valid", max_val)]:
        raw_path = RAW_DIR / f"TinyStoriesV2-GPT4-{split}.txt"
        raw_text = raw_path.read_text(encoding="utf-8", errors="ignore")
        stories = [s.strip() for s in raw_text.split("<|endoftext|>")]

        seen = set()
        kept = []
        n_empty, n_dup = 0, 0
        for s in stories:
            if len(s) < 50:
                n_empty += 1
                continue
            h = hashlib.md5(s.encode("utf-8")).hexdigest()
            if h in seen:
                n_dup += 1
                continue
            seen.add(h)
            kept.append(s)
            if len(kept) >= max_n:
                break

        out_name = "train" if split == "train" else "val"
        out_path = PROC_DIR / f"tinystories_{out_name}.txt"
        PROC_DIR.mkdir(parents=True, exist_ok=True)
        with open(out_path, "w", encoding="utf-8") as f:
            for s in kept:
                f.write(s)
                f.write(EOS_TOKEN)

        lengths = [len(s) for s in kept]
        stats[f"tinystories_{out_name}"] = {
            "n_stories_kept": len(kept),
            "n_dropped_short": n_empty,
            "n_dropped_duplicate": n_dup,
            "mean_char_len": float(np.mean(lengths)) if lengths else 0.0,
            "p50_char_len": float(np.percentile(lengths, 50)) if lengths else 0.0,
            "p95_char_len": float(np.percentile(lengths, 95)) if lengths else 0.0,
        }
        print(f"[clean] tinystories_{out_name}: kept={len(kept)} dropped_short={n_empty} dropped_dup={n_dup}")
    return stats


def clean_dolly(val_frac: float = 0.05) -> dict:
    raw_path = RAW_DIR / "databricks-dolly-15k.jsonl"
    records = []
    seen = set()
    n_empty, n_dup = 0, 0
    with open(raw_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            rec = json.loads(line)
            instruction = rec.get("instruction", "").strip()
            response = rec.get("response", "").strip()
            if not instruction or not response:
                n_empty += 1
                continue
            h = hashlib.md5((instruction + response).encode("utf-8")).hexdigest()
            if h in seen:
                n_dup += 1
                continue
            seen.add(h)
            records.append({
                "instruction": instruction,
                "context": rec.get("context", "").strip(),
                "response": response,
                "category": rec.get("category", ""),
            })

    def is_val(rec) -> bool:
        h = int(hashlib.md5(rec["instruction"].encode("utf-8")).hexdigest(), 16)
        return (h % 1000) / 1000.0 < val_frac

    train_records = [r for r in records if not is_val(r)]
    val_records = [r for r in records if is_val(r)]

    PROC_DIR.mkdir(parents=True, exist_ok=True)
    for name, recs in [("train", train_records), ("val", val_records)]:
        with open(PROC_DIR / f"dolly_{name}.jsonl", "w", encoding="utf-8") as f:
            for r in recs:
                f.write(json.dumps(r) + "\n")

    resp_lens = [len(r["response"]) for r in records]
    stats = {
        "dolly": {
            "n_total": len(records),
            "n_train": len(train_records),
            "n_val": len(val_records),
            "n_dropped_empty": n_empty,
            "n_dropped_duplicate": n_dup,
            "mean_response_char_len": float(np.mean(resp_lens)) if resp_lens else 0.0,
            "categories": sorted(set(r["category"] for r in records)),
        }
    }
    print(f"[clean] dolly: train={len(train_records)} val={len(val_records)} dropped_empty={n_empty} dropped_dup={n_dup}")
    return stats


def stage_tokenizer(vocab_size: int) -> dict:
    train_file = PROC_DIR / "tinystories_train.txt"
    train_tokenizer([str(train_file)], vocab_size=vocab_size, out_dir=str(TOK_DIR))
    tok = NanoTokenizer(str(TOK_DIR))
    print(f"[tokenizer] trained, actual vocab size={tok.vocab_size}")
    return {"tokenizer": {"vocab_size": tok.vocab_size}}


def stage_pack() -> dict:
    tok = NanoTokenizer(str(TOK_DIR))
    stats = {}
    for split in ["train", "val"]:
        text_path = PROC_DIR / f"tinystories_{split}.txt"
        text = text_path.read_text(encoding="utf-8")
        # Chunk to keep tokenizer memory bounded on very large files.
        chunk_chars = 20_000_000
        all_ids = []
        for i in range(0, len(text), chunk_chars):
            all_ids.append(np.array(tok.encode(text[i:i + chunk_chars]), dtype=np.uint16))
        ids = np.concatenate(all_ids) if all_ids else np.array([], dtype=np.uint16)
        out_path = PROC_DIR / f"{split}.bin"
        write_token_bin(ids, str(out_path))
        stats[f"pack_{split}"] = {"n_tokens": int(len(ids))}
        print(f"[pack] {split}: {len(ids):,} tokens -> {out_path}")
    return stats


def render_sft_example(tok: NanoTokenizer, instruction: str, context: str, response: str, block_size: int):
    prompt_text = INSTRUCTION_TOKEN + instruction
    if context.strip():
        prompt_text += CONTEXT_TOKEN + context
    prompt_text += RESPONSE_TOKEN
    prompt_ids = tok.encode(prompt_text)
    response_ids = tok.encode(response) + [tok.eos_id]

    if len(response_ids) >= block_size:
        return None  # response alone doesn't fit; skip

    max_prompt_len = block_size - len(response_ids)
    if len(prompt_ids) > max_prompt_len:
        prompt_ids = prompt_ids[-max_prompt_len:]  # keep the tail (closest to the response)

    input_ids = prompt_ids + response_ids
    labels = [-1] * len(prompt_ids) + response_ids

    pad_len = block_size - len(input_ids)
    input_ids = input_ids + [tok.eos_id] * pad_len
    labels = labels + [-1] * pad_len
    return input_ids, labels


def stage_sft(block_size: int) -> dict:
    tok = NanoTokenizer(str(TOK_DIR))
    stats = {}
    for split in ["train", "val"]:
        path = PROC_DIR / f"dolly_{split}.jsonl"
        inputs, labels_list = [], []
        n_skipped = 0
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                rec = json.loads(line)
                out = render_sft_example(tok, rec["instruction"], rec["context"], rec["response"], block_size)
                if out is None:
                    n_skipped += 1
                    continue
                input_ids, labels = out
                inputs.append(input_ids)
                labels_list.append(labels)

        inputs_arr = np.array(inputs, dtype=np.uint16)
        labels_arr = np.array(labels_list, dtype=np.int16)
        np.save(PROC_DIR / f"sft_{split}_input.npy", inputs_arr)
        np.save(PROC_DIR / f"sft_{split}_labels.npy", labels_arr)
        stats[f"sft_{split}"] = {"n_examples": len(inputs), "n_skipped_too_long": n_skipped}
        print(f"[sft] {split}: {len(inputs)} examples packed (skipped {n_skipped} too-long)")
    return stats


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--stage", choices=["clean", "tokenizer", "pack", "sft", "all"], default="all")
    parser.add_argument("--max-train-stories", type=int, default=400_000)
    parser.add_argument("--max-val-stories", type=int, default=4_000)
    args = parser.parse_args()

    cfg = load_yaml(str(ROOT / "config" / "model_config.yaml"))
    stats = load_stats()

    if args.stage in ("clean", "all"):
        stats.update(clean_tinystories(args.max_train_stories, args.max_val_stories))
        stats.update(clean_dolly())
        save_stats(stats)

    if args.stage in ("tokenizer", "all"):
        stats.update(stage_tokenizer(cfg["vocab_size"]))
        save_stats(stats)

    if args.stage in ("pack", "all"):
        stats.update(stage_pack())
        save_stats(stats)

    if args.stage in ("sft", "all"):
        stats.update(stage_sft(cfg["block_size"]))
        save_stats(stats)

    print("Done. Stats written to", STATS_PATH)


if __name__ == "__main__":
    main()
