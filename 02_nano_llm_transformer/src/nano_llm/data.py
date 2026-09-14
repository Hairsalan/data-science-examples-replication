"""Data loading for both training stages.

Pretraining data is stored as a single flat memory-mapped uint16 array
(standard nanoGPT-style format) so random crops can be sampled cheaply without
loading the whole corpus into RAM. SFT data is small enough to store as fixed-
shape (N, block_size) arrays with -1-masked labels for prompt/padding tokens.
"""
from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING, Tuple

import numpy as np

if TYPE_CHECKING:
    import torch


class PretrainDataset:
    def __init__(self, bin_path: str, block_size: int):
        self.data = np.memmap(bin_path, dtype=np.uint16, mode="r")
        self.block_size = block_size
        if len(self.data) <= block_size + 1:
            raise ValueError(f"{bin_path} has too few tokens ({len(self.data)}) for block_size={block_size}")

    def __len__(self) -> int:
        return len(self.data) - self.block_size - 1

    def get_batch(self, batch_size: int, device: str) -> Tuple["torch.Tensor", "torch.Tensor"]:
        import torch

        ix = np.random.randint(0, len(self), size=batch_size)
        x = np.stack([self.data[i:i + self.block_size].astype(np.int64) for i in ix])
        y = np.stack([self.data[i + 1:i + 1 + self.block_size].astype(np.int64) for i in ix])
        x = torch.from_numpy(x)
        y = torch.from_numpy(y)
        if device == "cuda":
            x = x.pin_memory().to(device, non_blocking=True)
            y = y.pin_memory().to(device, non_blocking=True)
        else:
            x, y = x.to(device), y.to(device)
        return x, y


class SFTDataset:
    def __init__(self, inputs_path: str, labels_path: str):
        self.inputs = np.load(inputs_path)
        self.labels = np.load(labels_path)
        assert self.inputs.shape == self.labels.shape

    def __len__(self) -> int:
        return self.inputs.shape[0]

    def get_batch(self, batch_size: int, device: str) -> Tuple["torch.Tensor", "torch.Tensor"]:
        import torch

        ix = np.random.randint(0, len(self), size=batch_size)
        x = torch.from_numpy(self.inputs[ix].astype(np.int64))
        y = torch.from_numpy(self.labels[ix].astype(np.int64))
        if device == "cuda":
            x = x.pin_memory().to(device, non_blocking=True)
            y = y.pin_memory().to(device, non_blocking=True)
        else:
            x, y = x.to(device), y.to(device)
        return x, y


def write_token_bin(token_ids: np.ndarray, out_path: str) -> None:
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    arr = np.asarray(token_ids, dtype=np.uint16)
    arr.tofile(out_path)
