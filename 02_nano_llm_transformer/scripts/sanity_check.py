"""Quick architecture sanity check: no data/tokenizer required.
Verifies forward pass (with loss), backward pass, and KV-cache generation
all run and produce correctly-shaped, finite outputs.
"""
from __future__ import annotations

import sys
from pathlib import Path

import torch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from nano_llm.model import NanoLLM, NanoLLMConfig  # noqa: E402
from nano_llm.utils import get_device, count_params, load_yaml  # noqa: E402


def main():
    device = get_device()
    print(f"Device: {device}")

    cfg = NanoLLMConfig(**load_yaml(str(ROOT / "config" / "model_config.yaml")))
    model = NanoLLM(cfg).to(device)
    n = count_params(model)
    print(f"Model: {n:,} params ({n/1e6:.2f}M), config={cfg}")

    B, T = 4, 64
    idx = torch.randint(0, cfg.vocab_size, (B, T), device=device)
    targets = torch.randint(0, cfg.vocab_size, (B, T), device=device)

    logits, loss = model(idx, targets)
    assert logits.shape == (B, T, cfg.vocab_size)
    assert torch.isfinite(loss)
    loss.backward()
    grad_norm = sum(p.grad.norm().item() ** 2 for p in model.parameters() if p.grad is not None) ** 0.5
    print(f"forward+backward OK: loss={loss.item():.4f}, grad_norm={grad_norm:.4f}")

    model.zero_grad()
    prompt = torch.randint(0, cfg.vocab_size, (1, 8), device=device)
    out = model.generate(prompt, max_new_tokens=20, temperature=1.0, top_k=50, top_p=0.95)
    assert out.shape[1] == 28
    print(f"generate() OK: output shape={tuple(out.shape)}")

    if device == "cuda":
        mem = torch.cuda.max_memory_allocated() / 1e6
        print(f"Peak CUDA memory during sanity check: {mem:.1f} MB")

    print("\nAll sanity checks passed.")


if __name__ == "__main__":
    main()
