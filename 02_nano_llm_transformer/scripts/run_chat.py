"""Deployment (CRISP-DM step 6): CLI chatbot against the latest SFT checkpoint."""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import torch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from nano_llm.model import NanoLLM, NanoLLMConfig  # noqa: E402
from nano_llm.tokenizer import NanoTokenizer  # noqa: E402
from nano_llm.chat import ChatSession, GenerationConfig  # noqa: E402
from nano_llm.utils import get_device  # noqa: E402

TOK_DIR = ROOT / "data" / "tokenizer"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--ckpt", default=str(ROOT / "checkpoints" / "sft" / "best.pt"))
    parser.add_argument("--temperature", type=float, default=0.8)
    parser.add_argument("--top-k", type=int, default=50)
    parser.add_argument("--top-p", type=float, default=0.95)
    parser.add_argument("--max-new-tokens", type=int, default=200)
    args = parser.parse_args()

    device = get_device()
    ckpt_path = Path(args.ckpt)
    if not ckpt_path.exists():
        print(f"No checkpoint found at {ckpt_path}. Train the SFT model first (scripts/train_sft.py).")
        sys.exit(1)

    ckpt = torch.load(ckpt_path, map_location=device)
    cfg = NanoLLMConfig(**ckpt["model_cfg"])
    model = NanoLLM(cfg).to(device)
    model.load_state_dict(ckpt["model"])
    model.eval()

    tok = NanoTokenizer(str(TOK_DIR))
    session = ChatSession(model, tok, device)
    gen_cfg = GenerationConfig(
        max_new_tokens=args.max_new_tokens,
        temperature=args.temperature,
        top_k=args.top_k,
        top_p=args.top_p,
    )

    print(f"nano-llm chatbot ready (device={device}, checkpoint step={ckpt.get('step')}). Ctrl+C to quit.\n")
    while True:
        try:
            instruction = input("You: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nBye!")
            break
        if not instruction:
            continue
        response = session.respond(instruction, gen_cfg=gen_cfg)
        print(f"Bot: {response}\n")


if __name__ == "__main__":
    main()
