"""Byte-level BPE tokenizer: trained from scratch on the project's own corpus
(kept small — 8,192 tokens — since the embedding table is otherwise the single
biggest parameter consumer at this model scale) with special tokens for the
chat/instruction template used in SFT.
"""
from __future__ import annotations

from pathlib import Path
from typing import Iterable, List, Optional

from tokenizers import ByteLevelBPETokenizer

EOS_TOKEN = "<|endoftext|>"
INSTRUCTION_TOKEN = "<|instruction|>"
CONTEXT_TOKEN = "<|context|>"
RESPONSE_TOKEN = "<|response|>"
SPECIAL_TOKENS = [EOS_TOKEN, INSTRUCTION_TOKEN, CONTEXT_TOKEN, RESPONSE_TOKEN]


def train_tokenizer(files: List[str], vocab_size: int, out_dir: str) -> None:
    out_path = Path(out_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    tok = ByteLevelBPETokenizer()
    tok.train(
        files=files,
        vocab_size=vocab_size,
        min_frequency=2,
        special_tokens=SPECIAL_TOKENS,
    )
    tok.save(str(out_path / "tokenizer.json"))


class NanoTokenizer:
    def __init__(self, path: str):
        from tokenizers import Tokenizer

        tok_path = Path(path)
        if tok_path.is_dir():
            tok_path = tok_path / "tokenizer.json"
        self.tok = Tokenizer.from_file(str(tok_path))
        self.eos_id = self.tok.token_to_id(EOS_TOKEN)
        self.instruction_id = self.tok.token_to_id(INSTRUCTION_TOKEN)
        self.context_id = self.tok.token_to_id(CONTEXT_TOKEN)
        self.response_id = self.tok.token_to_id(RESPONSE_TOKEN)

    @property
    def vocab_size(self) -> int:
        return self.tok.get_vocab_size()

    def encode(self, text: str) -> List[int]:
        return self.tok.encode(text).ids

    def encode_batch(self, texts: Iterable[str]) -> List[List[int]]:
        return [e.ids for e in self.tok.encode_batch(list(texts))]

    def decode(self, ids: List[int], skip_special_tokens: bool = True) -> str:
        return self.tok.decode(ids, skip_special_tokens=skip_special_tokens)
