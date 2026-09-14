import sys
import time
from pathlib import Path

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import LOG_DIR, get_gpu_stats, load_jsonl_df  # noqa: E402

st.set_page_config(page_title="Training Monitor", page_icon="📈", layout="wide")
st.title("📈 Training Monitor")
st.caption("CRISP-DM: Modeling — live-tails logs/pretrain.jsonl and logs/sft.jsonl")

run = st.radio("Run", ["Pretraining (TinyStories)", "SFT (Dolly)"], horizontal=True)
log_path = LOG_DIR / ("pretrain.jsonl" if run.startswith("Pretraining") else "sft.jsonl")

auto = st.checkbox("Auto-refresh every 5s", value=False)

df = load_jsonl_df(log_path)
if df.empty:
    st.warning(f"No log data yet at `{log_path}`. Start a training run: "
               f"`python scripts/{'train_pretrain' if run.startswith('Pretraining') else 'train_sft'}.py`")
else:
    steps_df = df[df["event"] == "train_step"].copy()
    eval_df = df[df["event"] == "eval"].copy()
    run_starts = df[df["event"] == "run_start"]

    if not run_starts.empty:
        last_run = run_starts.iloc[-1]
        c1, c2, c3 = st.columns(3)
        c1.metric("Mode", last_run.get("mode", "?"))
        c2.metric("Params", f"{last_run.get('n_params', 0)/1e6:.1f}M")
        c3.metric("Target steps", f"{last_run.get('max_steps', '?')}")

    if not steps_df.empty:
        latest = steps_df.iloc[-1]
        gpu = get_gpu_stats()
        c1, c2, c3, c4 = st.columns(4)
        c1.metric("Current step", int(latest["step"]))
        c2.metric("Train loss (last)", f"{latest['loss']:.4f}")
        c3.metric("Tokens/sec", f"{latest.get('tokens_per_sec', 0):,.0f}" if "tokens_per_sec" in latest else "n/a")
        c4.metric("GPU VRAM", f"{gpu['mem_used_mb']/1024:.2f} GB" if gpu else "n/a")

        fig = go.Figure()
        fig.add_trace(go.Scatter(x=steps_df["step"], y=steps_df["loss"], name="train loss (step)", mode="lines",
                                  line=dict(color="#636EFA", width=1)))
        if not eval_df.empty:
            fig.add_trace(go.Scatter(x=eval_df["step"], y=eval_df["train_loss"], name="train loss (eval avg)",
                                      mode="lines+markers", line=dict(color="#00CC96")))
            fig.add_trace(go.Scatter(x=eval_df["step"], y=eval_df["val_loss"], name="val loss (eval avg)",
                                      mode="lines+markers", line=dict(color="#EF553B")))
        fig.update_layout(title="Loss curves", xaxis_title="step", yaxis_title="loss", height=450)
        st.plotly_chart(fig, use_container_width=True)

        colA, colB = st.columns(2)
        with colA:
            fig_lr = go.Figure(go.Scatter(x=steps_df["step"], y=steps_df["lr"], mode="lines"))
            fig_lr.update_layout(title="Learning rate schedule", xaxis_title="step", yaxis_title="lr", height=320)
            st.plotly_chart(fig_lr, use_container_width=True)
        with colB:
            if "gpu_mem_mb" in steps_df.columns:
                fig_mem = go.Figure(go.Scatter(x=steps_df["step"], y=steps_df["gpu_mem_mb"], mode="lines"))
                fig_mem.update_layout(title="GPU memory allocated (MB)", xaxis_title="step", yaxis_title="MB", height=320)
                st.plotly_chart(fig_mem, use_container_width=True)

        if not eval_df.empty and "val_ppl" in eval_df.columns:
            st.subheader("Validation perplexity over training")
            fig_ppl = go.Figure(go.Scatter(x=eval_df["step"], y=eval_df["val_ppl"], mode="lines+markers"))
            fig_ppl.update_layout(xaxis_title="step", yaxis_title="perplexity", height=320)
            st.plotly_chart(fig_ppl, use_container_width=True)

    with st.expander("Raw log tail"):
        st.dataframe(df.tail(200), use_container_width=True)

st.divider()
gpu = get_gpu_stats()
if gpu:
    st.subheader("Live GPU status")
    g1, g2, g3 = st.columns(3)
    g1.metric("Utilization", f"{gpu['utilization_pct']:.0f}%")
    g2.metric("VRAM", f"{gpu['mem_used_mb']/1024:.2f} / {gpu['mem_total_mb']/1024:.1f} GB")
    g3.metric("Temperature", f"{gpu['temperature_c']:.0f}°C")

if auto:
    time.sleep(5)
    st.rerun()
