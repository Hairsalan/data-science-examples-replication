import sys
from pathlib import Path

import pandas as pd
import plotly.express as px
import streamlit as st

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import DATA_PROCESSED, TOK_DIR, load_json  # noqa: E402

st.set_page_config(page_title="Data Overview", page_icon="📊", layout="wide")
st.title("📊 Data Overview")
st.caption("CRISP-DM: Data Understanding + Data Preparation — data/processed/stats.json")

stats = load_json(DATA_PROCESSED / "stats.json")
if not stats:
    st.warning("No stats.json found yet. Run `scripts/download_data.py` then `scripts/prepare_data.py --stage all`.")
    st.stop()

tab1, tab2, tab3 = st.tabs(["TinyStories (pretraining)", "Dolly-15k (instruction SFT)", "Tokenizer"])

with tab1:
    cols = st.columns(2)
    for i, split in enumerate(["train", "val"]):
        key = f"tinystories_{split}"
        if key not in stats:
            continue
        s = stats[key]
        with cols[i]:
            st.subheader(split.capitalize())
            st.metric("Stories kept", f"{s['n_stories_kept']:,}")
            st.metric("Dropped (too short)", f"{s['n_dropped_short']:,}")
            st.metric("Dropped (duplicate)", f"{s['n_dropped_duplicate']:,}")
            st.metric("Mean length (chars)", f"{s['mean_char_len']:.0f}")

    if "pack_train" in stats:
        st.divider()
        st.subheader("Packed token counts")
        pack_df = pd.DataFrame([
            {"split": "train", "tokens": stats.get("pack_train", {}).get("n_tokens", 0)},
            {"split": "val", "tokens": stats.get("pack_val", {}).get("n_tokens", 0)},
        ])
        fig = px.bar(pack_df, x="split", y="tokens", title="Total tokens per split")
        st.plotly_chart(fig, use_container_width=True)

    length_df = pd.DataFrame([
        {"split": s, "p50": stats[f"tinystories_{s}"]["p50_char_len"], "p95": stats[f"tinystories_{s}"]["p95_char_len"]}
        for s in ["train", "val"] if f"tinystories_{s}" in stats
    ])
    if not length_df.empty:
        fig2 = px.bar(length_df.melt(id_vars="split", var_name="percentile", value_name="chars"),
                      x="split", y="chars", color="percentile", barmode="group",
                      title="Story length distribution (characters)")
        st.plotly_chart(fig2, use_container_width=True)

with tab2:
    if "dolly" not in stats:
        st.info("Dolly stats not yet computed.")
    else:
        d = stats["dolly"]
        c1, c2, c3, c4 = st.columns(4)
        c1.metric("Total examples", f"{d['n_total']:,}")
        c2.metric("Train", f"{d['n_train']:,}")
        c3.metric("Val", f"{d['n_val']:,}")
        c4.metric("Dropped (empty/dup)", f"{d['n_dropped_empty'] + d['n_dropped_duplicate']:,}")
        st.write("**Task categories present:**", ", ".join(d["categories"]))

        sft_rows = []
        for split in ["train", "val"]:
            key = f"sft_{split}"
            if key in stats:
                sft_rows.append({"split": split, **stats[key]})
        if sft_rows:
            st.divider()
            st.subheader("Packed SFT examples (post chat-template + tokenization)")
            st.dataframe(pd.DataFrame(sft_rows), use_container_width=True)

with tab3:
    if "tokenizer" in stats:
        st.metric("Trained vocab size", stats["tokenizer"]["vocab_size"])
    if TOK_DIR.joinpath("tokenizer.json").exists():
        st.success(f"Tokenizer file present at `{TOK_DIR / 'tokenizer.json'}`")
        try:
            from nano_llm.tokenizer import NanoTokenizer
            tok = NanoTokenizer(str(TOK_DIR))
            sample_text = st.text_input("Try encoding a sentence:", "Once upon a time, a small robot learned to bake bread.")
            if sample_text:
                ids = tok.encode(sample_text)
                st.write(f"**{len(ids)} tokens**")
                pieces = [tok.decode([i]) for i in ids]
                st.code(" | ".join(pieces))
        except Exception as e:
            st.error(f"Could not load tokenizer: {e}")
    else:
        st.warning("Tokenizer not trained yet.")
