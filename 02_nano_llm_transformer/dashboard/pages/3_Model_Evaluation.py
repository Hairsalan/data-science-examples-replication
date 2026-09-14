import sys
from pathlib import Path

import pandas as pd
import streamlit as st

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import LOG_DIR, load_json  # noqa: E402

st.set_page_config(page_title="Model Evaluation", page_icon="🧪", layout="wide")
st.title("🧪 Model Evaluation")
st.caption("CRISP-DM: Evaluation — logs/eval_pretrain.json and logs/eval_sft.json (run scripts/evaluate.py to refresh)")

tab1, tab2 = st.tabs(["Base model (pretraining)", "Chat model (SFT)"])

with tab1:
    result = load_json(LOG_DIR / "eval_pretrain.json")
    if not result or "error" in result:
        st.warning("No pretrain evaluation yet. Run `python scripts/evaluate.py --stage pretrain`.")
    else:
        c1, c2, c3 = st.columns(3)
        c1.metric("Checkpoint step", result["checkpoint_step"])
        c2.metric("Val loss", f"{result['val_loss']:.4f}")
        c3.metric("Val perplexity", f"{result['val_perplexity']:.1f}")

        st.subheader("Fixed-prompt story completions")
        for s in result["samples"]:
            with st.container(border=True):
                st.markdown(f"**Prompt:** {s['prompt']}")
                st.write(s["generation"])
                st.caption(f"3-gram repetition rate: {s['repetition_rate_3gram']:.2%}"
                           + ("  ⚠️ possibly degenerate" if s["repetition_rate_3gram"] > 0.3 else ""))

with tab2:
    result = load_json(LOG_DIR / "eval_sft.json")
    if not result or "error" in result:
        st.warning("No SFT evaluation yet. Run `python scripts/evaluate.py --stage sft`.")
    else:
        c1, c2, c3 = st.columns(3)
        c1.metric("Checkpoint step", result["checkpoint_step"])
        c2.metric("Val loss", f"{result['val_loss']:.4f}")
        c3.metric("Val perplexity", f"{result['val_perplexity']:.1f}")

        st.subheader("Fixed instruction prompts")
        for s in result["samples"]:
            with st.container(border=True):
                st.markdown(f"**Instruction:** {s['instruction']}")
                st.write(s["response"])
                st.caption(f"3-gram repetition rate: {s['repetition_rate_3gram']:.2%}"
                           + ("  ⚠️ possibly degenerate" if s["repetition_rate_3gram"] > 0.3 else ""))

st.divider()
st.info(
    "Given the base model is pretrained only on TinyStories and SFT-tuned on ~15k instruction "
    "examples, the bar here is grammatical, on-topic, non-repetitive text — not factual accuracy. "
    "See docs/05_evaluation.md.",
    icon="ℹ️",
)
