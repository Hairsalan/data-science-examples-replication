"""Evaluation (CRISP-DM step 5): perplexity + fixed-prompt generations +
repetition-rate diagnostics for the pretrain and/or SFT checkpoints.

Writes logs/eval_pretrain.json and/or logs/eval_sft.json, read by the
dashboard's Model Evaluation page.
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import torch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from nano_llm.model import NanoLLM, NanoLLMConfig  # noqa: E402
from nano_llm.data import PretrainDataset, SFTDataset  # noqa: E402
from nano_llm.tokenizer import NanoTokenizer  # noqa: E402
from nano_llm.metrics import estimate_loss, perplexity, ngram_repetition_rate  # noqa: E402
from nano_llm.chat import ChatSession, GenerationConfig, complete_story  # noqa: E402
from nano_llm.utils import get_device, load_yaml  # noqa: E402

PROC_DIR = ROOT / "data" / "processed"
TOK_DIR = ROOT / "data" / "tokenizer"
LOG_DIR = ROOT / "logs"

STORY_PROMPTS = [
    "Once upon a time, there was a little",
    "One day, a boy named Tim went to the",
    "Lily and her mom went to the park to",
]

INSTRUCTIONS = [
    {"instruction": "Write a short story about a cat.", "context": ""},
    {"instruction": "What is the capital of France?", "context": ""},
    {"instruction": "Explain why the sky is blue in one sentence.", "context": ""},
]


def load_model(ckpt_path: Path, device: str) -> NanoLLM:
    ckpt = torch.load(ckpt_path, map_location=device)
    cfg = NanoLLMConfig(**ckpt["model_cfg"])
    model = NanoLLM(cfg).to(device)
    model.load_state_dict(ckpt["model"])
    model.eval()
    return model, ckpt.get("step"), ckpt.get("val_loss")


def eval_pretrain(device: str) -> dict:
    ckpt_path = ROOT / "checkpoints" / "pretrain" / "best.pt"
    if not ckpt_path.exists():
        return {"error": "no pretrain checkpoint found"}
    model, step, _ = load_model(ckpt_path, device)
    tok = NanoTokenizer(str(TOK_DIR))
    val_ds = PretrainDataset(str(PROC_DIR / "val.bin"), model.cfg.block_size)

    val_loss = estimate_loss(model, val_ds, batch_size=16, iters=50, device=device)

    samples = []
    for prompt in STORY_PROMPTS:
        text = complete_story(model, tok, device, prompt, GenerationConfig(max_new_tokens=120, temperature=0.8))
        ids = tok.encode(text)
        samples.append({
            "prompt": prompt,
            "generation": text,
            "repetition_rate_3gram": ngram_repetition_rate(ids, n=3),
        })

    result = {
        "checkpoint_step": step,
        "val_loss": val_loss,
        "val_perplexity": perplexity(val_loss),
        "samples": samples,
        "evaluated_at": time.time(),
    }
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    (LOG_DIR / "eval_pretrain.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(f"[pretrain eval] val_loss={val_loss:.4f} ppl={perplexity(val_loss):.1f}")
    return result


def eval_sft(device: str) -> dict:
    ckpt_path = ROOT / "checkpoints" / "sft" / "best.pt"
    if not ckpt_path.exists():
        return {"error": "no sft checkpoint found"}
    model, step, _ = load_model(ckpt_path, device)
    tok = NanoTokenizer(str(TOK_DIR))
    val_ds = SFTDataset(str(PROC_DIR / "sft_val_input.npy"), str(PROC_DIR / "sft_val_labels.npy"))

    val_loss = estimate_loss(model, val_ds, batch_size=8, iters=20, device=device)

    session = ChatSession(model, tok, device)
    samples = []
    for item in INSTRUCTIONS:
        response = session.respond(item["instruction"], item["context"],
                                    GenerationConfig(max_new_tokens=120, temperature=0.7))
        ids = tok.encode(response)
        samples.append({
            "instruction": item["instruction"],
            "response": response,
            "repetition_rate_3gram": ngram_repetition_rate(ids, n=3),
        })

    result = {
        "checkpoint_step": step,
        "val_loss": val_loss,
        "val_perplexity": perplexity(val_loss),
        "samples": samples,
        "evaluated_at": time.time(),
    }
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    (LOG_DIR / "eval_sft.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(f"[sft eval] val_loss={val_loss:.4f} ppl={perplexity(val_loss):.1f}")
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--stage", choices=["pretrain", "sft", "both"], default="both")
    args = parser.parse_args()

    device = get_device()
    if args.stage in ("pretrain", "both"):
        eval_pretrain(device)
    if args.stage in ("sft", "both"):
        eval_sft(device)


if __name__ == "__main__":
    main()
