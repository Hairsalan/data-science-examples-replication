import sys
from pathlib import Path

import streamlit as st

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (  # noqa: E402
    ROOT, DATA_PROCESSED, TOK_DIR, LOG_DIR, CKPT_PRETRAIN, CKPT_SFT,
    load_json, get_gpu_stats,
)

st.set_page_config(page_title="nano-llm-transformer · Admin Dashboard", page_icon="🧠", layout="wide")

st.title("🧠 nano-llm-transformer — Data Science Admin Dashboard")
st.caption("A from-scratch LLM + chatbot, built end-to-end on a single laptop GPU, following CRISP-DM.")

gpu = get_gpu_stats()
c1, c2, c3, c4 = st.columns(4)
if gpu:
    c1.metric("GPU", gpu["name"])
    c2.metric("VRAM used", f"{gpu['mem_used_mb']/1024:.2f} / {gpu['mem_total_mb']/1024:.1f} GB")
    c3.metric("GPU utilization", f"{gpu['utilization_pct']:.0f}%")
    c4.metric("GPU temp", f"{gpu['temperature_c']:.0f}°C")
else:
    c1.metric("GPU", "not detected")

st.divider()
st.subheader("CRISP-DM pipeline status")

stats = load_json(DATA_PROCESSED / "stats.json")
steps = [
    ("1. Business Understanding", "docs/01_business_understanding.md", (ROOT / "docs" / "01_business_understanding.md").exists()),
    ("2. Data Understanding", "docs/02_data_understanding.md", (ROOT / "docs" / "02_data_understanding.md").exists()),
    ("3. Data Preparation — raw data", "data/raw/", any((ROOT / "data" / "raw").glob("*"))),
    ("3. Data Preparation — cleaned + tokenizer", "data/tokenizer/tokenizer.json", (TOK_DIR / "tokenizer.json").exists()),
    ("3. Data Preparation — packed tensors", "data/processed/{train,val}.bin", (DATA_PROCESSED / "train.bin").exists()),
    ("4. Modeling — pretrained checkpoint", "checkpoints/pretrain/best.pt", (CKPT_PRETRAIN / "best.pt").exists()),
    ("4. Modeling — SFT checkpoint", "checkpoints/sft/best.pt", (CKPT_SFT / "best.pt").exists()),
    ("5. Evaluation", "logs/eval_*.json", (LOG_DIR / "eval_sft.json").exists() or (LOG_DIR / "eval_pretrain.json").exists()),
    ("6. Deployment — chat playground", "dashboard/pages/4_Chat_Playground.py", (CKPT_SFT / "best.pt").exists()),
]
for label, path, done in steps:
    icon = "✅" if done else "⬜"
    st.markdown(f"{icon} **{label}** — `{path}`")

st.divider()
st.subheader("Model")
import yaml  # noqa: E402
with open(ROOT / "config" / "model_config.yaml") as f:
    mc = yaml.safe_load(f)
mcol1, mcol2, mcol3, mcol4 = st.columns(4)
mcol1.metric("Layers", mc["n_layer"])
mcol2.metric("Embedding dim", mc["n_embd"])
mcol3.metric("Attention heads (Q / KV)", f"{mc['n_head']} / {mc['n_kv_head']}")
mcol4.metric("Context length", mc["block_size"])
st.caption(
    "Primitives: RMSNorm · RoPE · grouped-query attention · SwiGLU MLP · weight-tied embedding/head · "
    "KV-cache decoding — see docs/04_modeling.md."
)

st.divider()
st.info(
    "Use the sidebar to navigate: **Data Overview**, **Training Monitor**, **Model Evaluation**, "
    "**Chat Playground**.",
    icon="👈",
)
