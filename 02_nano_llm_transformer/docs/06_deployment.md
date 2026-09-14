# 6. Deployment

## Chatbot
- `scripts/run_chat.py` — CLI chat loop against the latest SFT checkpoint,
  using KV-cache generation, configurable temperature/top-p/top-k/max tokens.
- `src/nano_llm/chat.py` — the reusable chat-session class (prompt templating,
  history management, generation) used by both the CLI and the dashboard's
  Chat Playground page, so behavior is identical in both places.

## Data science admin dashboard (`dashboard/app.py`, Streamlit)
A multi-page local app giving full visibility into the pipeline:

| Page | Contents |
|---|---|
| **Data Overview** | Dataset sizes, dedup stats, char/token length histograms, vocab coverage — all read from `data/processed/stats.json` |
| **Training Monitor** | Live-refreshing train/val loss curves, learning-rate schedule, tokens/sec throughput, GPU memory & utilization (via `nvidia-smi`/`psutil`), tailed from `logs/*.jsonl` |
| **Model Evaluation** | Perplexity table, fixed-prompt generation samples across checkpoints, repetition-rate diagnostics, from `logs/eval_*.json` |
| **Chat Playground** | Live chat against the current SFT checkpoint, with sampling-parameter controls, reusing `src/nano_llm/chat.py` |

Run with:
```
.venv\Scripts\streamlit run dashboard/app.py
```

## Running the full pipeline
```
.venv\Scripts\python scripts\download_data.py
.venv\Scripts\python scripts\prepare_data.py --stage all
.venv\Scripts\python scripts\train_pretrain.py --smoke-test   # verify pipeline
.venv\Scripts\python scripts\train_pretrain.py                # full run
.venv\Scripts\python scripts\train_sft.py --smoke-test
.venv\Scripts\python scripts\train_sft.py
.venv\Scripts\python scripts\evaluate.py --stage both
.venv\Scripts\python scripts\run_chat.py
```
