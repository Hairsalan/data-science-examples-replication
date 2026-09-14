from __future__ import annotations

import math
from typing import List

import torch


@torch.no_grad()
def estimate_loss(model, dataset, batch_size: int, iters: int, device: str) -> float:
    model.eval()
    losses = []
    for _ in range(iters):
        x, y = dataset.get_batch(batch_size, device)
        _, loss = model(x, y)
        losses.append(loss.item())
    model.train()
    return sum(losses) / len(losses)


def perplexity(loss: float) -> float:
    return math.exp(min(loss, 20))  # guard against overflow on garbage checkpoints


def ngram_repetition_rate(token_ids: List[int], n: int = 3) -> float:
    """Fraction of n-grams in the sequence that are repeats of an earlier n-gram.
    A simple, cheap degeneracy signal for generated text."""
    if len(token_ids) < n + 1:
        return 0.0
    seen = set()
    repeats = 0
    total = 0
    for i in range(len(token_ids) - n + 1):
        gram = tuple(token_ids[i:i + n])
        total += 1
        if gram in seen:
            repeats += 1
        seen.add(gram)
    return repeats / total if total else 0.0
