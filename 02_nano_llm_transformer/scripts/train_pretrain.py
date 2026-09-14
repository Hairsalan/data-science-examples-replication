"""Modeling (CRISP-DM step 4), stage 1: pretrain the base LLM on TinyStories.

Usage:
  python scripts/train_pretrain.py --smoke-test   # ~200 steps, verifies the pipeline end-to-end
  python scripts/train_pretrain.py                 # full run per config/train_config.yaml
  python scripts/train_pretrain.py --resume         # continue from the last checkpoint
"""
from __future__ import annotations

import argparse
import math
import sys
import time
from pathlib import Path

import torch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from nano_llm.model import NanoLLM, NanoLLMConfig  # noqa: E402
from nano_llm.data import PretrainDataset  # noqa: E402
from nano_llm.metrics import estimate_loss, perplexity  # noqa: E402
from nano_llm.utils import set_seed, get_device, JsonlLogger, load_yaml, count_params  # noqa: E402

PROC_DIR = ROOT / "data" / "processed"
CKPT_DIR = ROOT / "checkpoints" / "pretrain"
LOG_PATH = ROOT / "logs" / "pretrain.jsonl"


def get_lr(step: int, warmup_steps: int, max_steps: int, lr: float, min_lr: float) -> float:
    if step < warmup_steps:
        return lr * (step + 1) / warmup_steps
    if step > max_steps:
        return min_lr
    decay_ratio = (step - warmup_steps) / max(1, max_steps - warmup_steps)
    coeff = 0.5 * (1.0 + math.cos(math.pi * decay_ratio))
    return min_lr + coeff * (lr - min_lr)


def build_optimizer(model: torch.nn.Module, lr: float, weight_decay: float):
    decay, no_decay = [], []
    for name, p in model.named_parameters():
        if not p.requires_grad:
            continue
        (decay if p.dim() >= 2 else no_decay).append(p)
    groups = [
        {"params": decay, "weight_decay": weight_decay},
        {"params": no_decay, "weight_decay": 0.0},
    ]
    return torch.optim.AdamW(groups, lr=lr, betas=(0.9, 0.95), eps=1e-8)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--smoke-test", action="store_true")
    parser.add_argument("--resume", action="store_true")
    args = parser.parse_args()

    model_cfg = NanoLLMConfig(**load_yaml(str(ROOT / "config" / "model_config.yaml")))
    train_cfg = load_yaml(str(ROOT / "config" / "train_config.yaml"))["pretrain"]

    device = get_device()
    set_seed(train_cfg["seed"])
    CKPT_DIR.mkdir(parents=True, exist_ok=True)
    logger = JsonlLogger(str(LOG_PATH))

    train_ds = PretrainDataset(str(PROC_DIR / "train.bin"), model_cfg.block_size)
    val_ds = PretrainDataset(str(PROC_DIR / "val.bin"), model_cfg.block_size)

    model = NanoLLM(model_cfg).to(device)
    n_params = count_params(model)
    print(f"Device: {device} | Model params: {n_params:,} ({n_params/1e6:.1f}M)")

    optimizer = build_optimizer(model, train_cfg["lr"], train_cfg["weight_decay"])
    scaler = torch.amp.GradScaler(device, enabled=(device == "cuda" and train_cfg["amp_dtype"] == "float16"))
    amp_dtype = torch.float16 if train_cfg["amp_dtype"] == "float16" else torch.bfloat16

    start_step = 0
    ckpt_path = CKPT_DIR / "ckpt.pt"
    if args.resume and ckpt_path.exists():
        ckpt = torch.load(ckpt_path, map_location=device)
        model.load_state_dict(ckpt["model"])
        optimizer.load_state_dict(ckpt["optimizer"])
        start_step = ckpt["step"] + 1
        print(f"Resumed from step {start_step}")

    max_steps = train_cfg["smoke_test_steps"] if args.smoke_test else train_cfg["max_steps"]
    eval_interval = min(train_cfg["eval_interval"], max_steps) if args.smoke_test else train_cfg["eval_interval"]
    grad_accum = train_cfg["grad_accum_steps"]
    batch_size = train_cfg["batch_size"]

    logger.log(event="run_start", mode="smoke_test" if args.smoke_test else "full",
               n_params=n_params, device=device, max_steps=max_steps)

    model.train()
    t0 = time.time()
    tokens_seen = 0
    best_val = float("inf")

    for step in range(start_step, max_steps + 1):
        lr = get_lr(step, train_cfg["warmup_steps"], max_steps, train_cfg["lr"], train_cfg["min_lr"])
        for g in optimizer.param_groups:
            g["lr"] = lr

        optimizer.zero_grad(set_to_none=True)
        accum_loss = 0.0
        for micro in range(grad_accum):
            x, y = train_ds.get_batch(batch_size, device)
            with torch.autocast(device_type=device, dtype=amp_dtype, enabled=(device == "cuda")):
                _, loss = model(x, y)
                loss = loss / grad_accum
            scaler.scale(loss).backward()
            accum_loss += loss.item()
            tokens_seen += x.numel()

        scaler.unscale_(optimizer)
        torch.nn.utils.clip_grad_norm_(model.parameters(), train_cfg["grad_clip"])
        scaler.step(optimizer)
        scaler.update()

        if step % train_cfg["log_interval"] == 0:
            dt = time.time() - t0
            tok_per_sec = tokens_seen / dt if dt > 0 else 0.0
            mem_mb = torch.cuda.memory_allocated() / 1e6 if device == "cuda" else 0.0
            print(f"step {step:6d} | loss {accum_loss:.4f} | lr {lr:.2e} | tok/s {tok_per_sec:,.0f} | mem {mem_mb:.0f}MB")
            logger.log(event="train_step", step=step, loss=accum_loss, lr=lr,
                       tokens_per_sec=tok_per_sec, gpu_mem_mb=mem_mb, tokens_seen=tokens_seen)

        if step % eval_interval == 0 and step > 0:
            val_loss = estimate_loss(model, val_ds, batch_size, train_cfg["eval_iters"], device)
            train_loss = estimate_loss(model, train_ds, batch_size, train_cfg["eval_iters"], device)
            print(f"  eval @ step {step}: train_loss {train_loss:.4f} (ppl {perplexity(train_loss):.1f}) | "
                  f"val_loss {val_loss:.4f} (ppl {perplexity(val_loss):.1f})")
            logger.log(event="eval", step=step, train_loss=train_loss, val_loss=val_loss,
                       train_ppl=perplexity(train_loss), val_ppl=perplexity(val_loss))

            torch.save({
                "model": model.state_dict(),
                "optimizer": optimizer.state_dict(),
                "step": step,
                "model_cfg": model_cfg.__dict__,
                "val_loss": val_loss,
            }, ckpt_path)

            if val_loss < best_val:
                best_val = val_loss
                torch.save({
                    "model": model.state_dict(),
                    "step": step,
                    "model_cfg": model_cfg.__dict__,
                    "val_loss": val_loss,
                }, CKPT_DIR / "best.pt")

    torch.save({
        "model": model.state_dict(),
        "optimizer": optimizer.state_dict(),
        "step": max_steps,
        "model_cfg": model_cfg.__dict__,
    }, ckpt_path)
    logger.log(event="run_end", step=max_steps)
    print("Pretraining finished. Checkpoint:", ckpt_path)


if __name__ == "__main__":
    main()
