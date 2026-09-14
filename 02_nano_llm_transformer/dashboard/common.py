"""Shared helpers for every dashboard page: paths, stats/log loading, GPU stats,
and cached model loading for the chat playground."""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path
from typing import Optional

import pandas as pd
import streamlit as st

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

DATA_PROCESSED = ROOT / "data" / "processed"
TOK_DIR = ROOT / "data" / "tokenizer"
LOG_DIR = ROOT / "logs"
CKPT_PRETRAIN = ROOT / "checkpoints" / "pretrain"
CKPT_SFT = ROOT / "checkpoints" / "sft"


def load_json(path: Path) -> dict:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def load_jsonl_df(path: Path) -> pd.DataFrame:
    if not path.exists():
        return pd.DataFrame()
    rows = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return pd.DataFrame(rows)


def get_gpu_stats() -> Optional[dict]:
    try:
        out = subprocess.check_output(
            ["nvidia-smi", "--query-gpu=name,memory.used,memory.total,utilization.gpu,temperature.gpu",
             "--format=csv,noheader,nounits"],
            stderr=subprocess.DEVNULL, timeout=3,
        ).decode().strip()
        name, mem_used, mem_total, util, temp = [x.strip() for x in out.split(",")]
        return {
            "name": name,
            "mem_used_mb": float(mem_used),
            "mem_total_mb": float(mem_total),
            "utilization_pct": float(util),
            "temperature_c": float(temp),
        }
    except Exception:
        return None


@st.cache_resource(show_spinner="Loading model checkpoint...")
def load_chat_model(ckpt_path_str: str):
    import torch
    from nano_llm.model import NanoLLM, NanoLLMConfig
    from nano_llm.tokenizer import NanoTokenizer
    from nano_llm.chat import ChatSession
    from nano_llm.utils import get_device

    device = get_device()
    ckpt_path = Path(ckpt_path_str)
    ckpt = torch.load(ckpt_path, map_location=device)
    cfg = NanoLLMConfig(**ckpt["model_cfg"])
    model = NanoLLM(cfg).to(device)
    model.load_state_dict(ckpt["model"])
    model.eval()
    tok = NanoTokenizer(str(TOK_DIR))
    session = ChatSession(model, tok, device)
    return session, ckpt.get("step"), ckpt.get("val_loss"), device


def available_checkpoints(ckpt_dir: Path) -> list:
    return [p for p in [ckpt_dir / "best.pt", ckpt_dir / "ckpt.pt"] if p.exists()]
