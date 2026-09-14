"""Modeling (CRISP-DM step 4), stage 2: supervised fine-tuning on Dolly,
initialized from the pretrained TinyStories checkpoint.

Usage:
  python scripts/train_sft.py --smoke-test
  python scripts/train_sft.py
"""
from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

import torch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from nano_llm.model import NanoLLM, NanoLLMConfig  # noqa: E402
from nano_llm.data import SFTDataset  # noqa: E402
from nano_llm.metrics import estimate_loss, perplexity  # noqa: E402
from nano_llm.utils import set_seed, get_device, JsonlLogger, load_yaml, count_params  # noqa: E402
from train_pretrain import get_lr, build_optimizer  # noqa: E402

PROC_DIR = ROOT / "data" / "processed"
PRETRAIN_CKPT = ROOT / "checkpoints" / "pretrain" / "best.pt"
CKPT_DIR = ROOT / "checkpoints" / "sft"
LOG_PATH = ROOT / "logs" / "sft.jsonl"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--smoke-test", action="store_true")
    parser.add_argument("--resume", action="store_true")
    parser.add_argument("--init-ckpt", default=str(PRETRAIN_CKPT))
    args = parser.parse_args()

    model_cfg = NanoLLMConfig(**load_yaml(str(ROOT / "config" / "model_config.yaml")))
    train_cfg = load_yaml(str(ROOT / "config" / "train_config.yaml"))["sft"]

    device = get_device()
    set_seed(train_cfg["seed"])
    CKPT_DIR.mkdir(parents=True, exist_ok=True)
    logger = JsonlLogger(str(LOG_PATH))

    train_ds = SFTDataset(str(PROC_DIR / "sft_train_input.npy"), str(PROC_DIR / "sft_train_labels.npy"))
    val_ds = SFTDataset(str(PROC_DIR / "sft_val_input.npy"), str(PROC_DIR / "sft_val_labels.npy"))

    model = NanoLLM(model_cfg).to(device)
    n_params = count_params(model)

    sft_ckpt_path = CKPT_DIR / "ckpt.pt"
    if args.resume and sft_ckpt_path.exists():
        ckpt = torch.load(sft_ckpt_path, map_location=device)
        model.load_state_dict(ckpt["model"])
        start_epoch_step = ckpt["step"] + 1
        print(f"Resumed SFT from step {start_epoch_step}")
    else:
        start_epoch_step = 0
        init_path = Path(args.init_ckpt)
        if init_path.exists():
            base_ckpt = torch.load(init_path, map_location=device)
            model.load_state_dict(base_ckpt["model"])
            print(f"Initialized from pretrained checkpoint: {init_path} (val_loss={base_ckpt.get('val_loss')})")
        else:
            print(f"WARNING: pretrain checkpoint not found at {init_path}; training SFT from random init")

    print(f"Device: {device} | Model params: {n_params:,} ({n_params/1e6:.1f}M)")

    optimizer = build_optimizer(model, train_cfg["lr"], train_cfg["weight_decay"])
    scaler = torch.amp.GradScaler(device, enabled=(device == "cuda" and train_cfg["amp_dtype"] == "float16"))
    amp_dtype = torch.float16 if train_cfg["amp_dtype"] == "float16" else torch.bfloat16

    batch_size = train_cfg["batch_size"]
    grad_accum = train_cfg["grad_accum_steps"]
    steps_per_epoch = max(1, len(train_ds) // (batch_size * grad_accum))
    max_steps = train_cfg["smoke_test_steps"] if args.smoke_test else steps_per_epoch * train_cfg["epochs"]
    eval_interval = min(train_cfg["eval_interval"], max_steps) if args.smoke_test else train_cfg["eval_interval"]

    logger.log(event="run_start", mode="smoke_test" if args.smoke_test else "full",
               n_params=n_params, device=device, max_steps=max_steps, n_train_examples=len(train_ds))

    model.train()
    t0 = time.time()
    best_val = float("inf")

    for step in range(start_epoch_step, max_steps + 1):
        lr = get_lr(step, train_cfg["warmup_steps"], max_steps, train_cfg["lr"], train_cfg["min_lr"])
        for g in optimizer.param_groups:
            g["lr"] = lr

        optimizer.zero_grad(set_to_none=True)
        accum_loss = 0.0
        for _ in range(grad_accum):
            x, y = train_ds.get_batch(batch_size, device)
            with torch.autocast(device_type=device, dtype=amp_dtype, enabled=(device == "cuda")):
                _, loss = model(x, y)
                loss = loss / grad_accum
            scaler.scale(loss).backward()
            accum_loss += loss.item()

        scaler.unscale_(optimizer)
        torch.nn.utils.clip_grad_norm_(model.parameters(), train_cfg["grad_clip"])
        scaler.step(optimizer)
        scaler.update()

        if step % train_cfg["log_interval"] == 0:
            dt = time.time() - t0
            mem_mb = torch.cuda.memory_allocated() / 1e6 if device == "cuda" else 0.0
            print(f"step {step:6d}/{max_steps} | loss {accum_loss:.4f} | lr {lr:.2e} | mem {mem_mb:.0f}MB | {dt:.0f}s")
            logger.log(event="train_step", step=step, loss=accum_loss, lr=lr, gpu_mem_mb=mem_mb)

        if step % eval_interval == 0 and step > 0:
            val_loss = estimate_loss(model, val_ds, batch_size, 20, device)
            train_loss = estimate_loss(model, train_ds, batch_size, 20, device)
            print(f"  eval @ step {step}: train_loss {train_loss:.4f} | val_loss {val_loss:.4f} (ppl {perplexity(val_loss):.1f})")
            logger.log(event="eval", step=step, train_loss=train_loss, val_loss=val_loss, val_ppl=perplexity(val_loss))

            torch.save({"model": model.state_dict(), "step": step, "model_cfg": model_cfg.__dict__,
                        "val_loss": val_loss}, sft_ckpt_path)
            if val_loss < best_val:
                best_val = val_loss
                torch.save({"model": model.state_dict(), "step": step, "model_cfg": model_cfg.__dict__,
                            "val_loss": val_loss}, CKPT_DIR / "best.pt")

    torch.save({"model": model.state_dict(), "step": max_steps, "model_cfg": model_cfg.__dict__},
               sft_ckpt_path)
    logger.log(event="run_end", step=max_steps)
    print("SFT finished. Checkpoint:", sft_ckpt_path)


if __name__ == "__main__":
    main()
