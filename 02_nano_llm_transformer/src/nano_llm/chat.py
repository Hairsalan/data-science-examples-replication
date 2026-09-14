"""Shared chat-inference logic used by both the CLI (scripts/run_chat.py) and
the dashboard's Chat Playground page, so behavior is identical in both.

The SFT data is single-turn instruction/response (Dolly), so the model is
prompted one instruction at a time using the same template used in training.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import torch

from .model import NanoLLM
from .tokenizer import NanoTokenizer, CONTEXT_TOKEN, INSTRUCTION_TOKEN, RESPONSE_TOKEN


@dataclass
class GenerationConfig:
    max_new_tokens: int = 200
    temperature: float = 0.8
    top_k: int = 50
    top_p: float = 0.95


class ChatSession:
    def __init__(self, model: NanoLLM, tokenizer: NanoTokenizer, device: str):
        self.model = model
        self.tok = tokenizer
        self.device = device

    def build_prompt_ids(self, instruction: str, context: str = "") -> list:
        text = INSTRUCTION_TOKEN + instruction
        if context.strip():
            text += CONTEXT_TOKEN + context
        text += RESPONSE_TOKEN
        return self.tok.encode(text)

    @torch.no_grad()
    def respond(self, instruction: str, context: str = "", gen_cfg: Optional[GenerationConfig] = None) -> str:
        gen_cfg = gen_cfg or GenerationConfig()
        ids = self.build_prompt_ids(instruction, context)
        max_ctx = self.model.cfg.block_size - gen_cfg.max_new_tokens
        if len(ids) > max_ctx:
            ids = ids[-max_ctx:]
        idx = torch.tensor([ids], dtype=torch.long, device=self.device)

        out = self.model.generate(
            idx,
            max_new_tokens=gen_cfg.max_new_tokens,
            temperature=gen_cfg.temperature,
            top_k=gen_cfg.top_k,
            top_p=gen_cfg.top_p,
            eos_token_id=self.tok.eos_id,
        )
        new_ids = out[0, len(ids):].tolist()
        return self.tok.decode(new_ids, skip_special_tokens=True).strip()


@torch.no_grad()
def complete_story(model: NanoLLM, tokenizer: NanoTokenizer, device: str, prompt: str, gen_cfg: Optional[GenerationConfig] = None) -> str:
    """Base-model (pretraining-only) free-form text completion, used to sanity-check the pretrained checkpoint before SFT exists."""
    gen_cfg = gen_cfg or GenerationConfig()
    ids = tokenizer.encode(prompt)
    idx = torch.tensor([ids], dtype=torch.long, device=device)
    out = model.generate(
        idx,
        max_new_tokens=gen_cfg.max_new_tokens,
        temperature=gen_cfg.temperature,
        top_k=gen_cfg.top_k,
        top_p=gen_cfg.top_p,
        eos_token_id=tokenizer.eos_id,
    )
    return tokenizer.decode(out[0].tolist(), skip_special_tokens=True)
