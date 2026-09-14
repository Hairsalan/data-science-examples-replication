import sys
from pathlib import Path

import streamlit as st

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import CKPT_SFT, available_checkpoints, load_chat_model  # noqa: E402
from nano_llm.chat import GenerationConfig  # noqa: E402

st.set_page_config(page_title="Chat Playground", page_icon="💬", layout="wide")
st.title("💬 Chat Playground")
st.caption("CRISP-DM: Deployment — live inference against the SFT checkpoint, KV-cache decoding")

ckpts = available_checkpoints(CKPT_SFT)
if not ckpts:
    st.warning("No SFT checkpoint found yet. Run `python scripts/train_sft.py` (or `--smoke-test` first).")
    st.stop()

with st.sidebar:
    st.subheader("Generation settings")
    ckpt_choice = st.selectbox("Checkpoint", ckpts, format_func=lambda p: p.name)
    temperature = st.slider("Temperature", 0.1, 1.5, 0.8, 0.05)
    top_k = st.slider("Top-k", 1, 200, 50, 1)
    top_p = st.slider("Top-p", 0.1, 1.0, 0.95, 0.01)
    max_new_tokens = st.slider("Max new tokens", 20, 400, 150, 10)
    context = st.text_area("Optional context (grounds the answer)", "")
    if st.button("Clear chat history"):
        st.session_state.pop("chat_history", None)

session, step, val_loss, device = load_chat_model(str(ckpt_choice))
st.caption(f"Loaded `{ckpt_choice.name}` (step {step}, val_loss {val_loss:.4f} if available)"
           if val_loss is not None else f"Loaded `{ckpt_choice.name}` (step {step})")
st.caption(f"Device: {device}")

if "chat_history" not in st.session_state:
    st.session_state.chat_history = []

for role, text in st.session_state.chat_history:
    with st.chat_message(role):
        st.write(text)

prompt = st.chat_input("Ask the model something...")
if prompt:
    st.session_state.chat_history.append(("user", prompt))
    with st.chat_message("user"):
        st.write(prompt)

    gen_cfg = GenerationConfig(max_new_tokens=max_new_tokens, temperature=temperature, top_k=top_k, top_p=top_p)
    with st.chat_message("assistant"):
        with st.spinner("Generating..."):
            response = session.respond(prompt, context=context, gen_cfg=gen_cfg)
        st.write(response if response else "*(empty response)*")
    st.session_state.chat_history.append(("assistant", response))
