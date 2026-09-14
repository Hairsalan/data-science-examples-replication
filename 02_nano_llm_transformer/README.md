# nano-llm-transformer

A small, from-scratch decoder-only LLM and instruction-following chatbot,
trained end-to-end on a single 6GB laptop GPU (GTX 1060 / Pascal — no tensor
cores, no flash-attention), built with modern architecture primitives at a
scale that actually fits, and developed following the **CRISP-DM** framework.

## Architecture (~26M params)
RMSNorm · Rotary positional embeddings (RoPE) · Grouped-query attention (GQA) ·
SwiGLU MLP · weight-tied embedding/output head · KV-cache decoding. See
`docs/04_modeling.md` for details and `config/model_config.yaml` for the exact
sizing.

## CRISP-DM structure
| Phase | Where |
|---|---|
| 1. Business Understanding | `docs/01_business_understanding.md` |
| 2. Data Understanding | `docs/02_data_understanding.md` |
| 3. Data Preparation | `docs/03_data_preparation.md`, `scripts/download_data.py`, `scripts/prepare_data.py` |
| 4. Modeling | `docs/04_modeling.md`, `src/nano_llm/model.py`, `scripts/train_pretrain.py`, `scripts/train_sft.py` |
| 5. Evaluation | `docs/05_evaluation.md`, `scripts/evaluate.py` |
| 6. Deployment | `docs/06_deployment.md`, `scripts/run_chat.py`, `dashboard/` |

## Quickstart
```powershell
# 1. environment
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt

# 2. data prep (download -> clean -> tokenizer -> pack -> sft format)
.venv\Scripts\python scripts\download_data.py
.venv\Scripts\python scripts\prepare_data.py --stage all

# 3. train (smoke test first, then full run)
.venv\Scripts\python scripts\train_pretrain.py --smoke-test
.venv\Scripts\python scripts\train_pretrain.py
.venv\Scripts\python scripts\train_sft.py --smoke-test
.venv\Scripts\python scripts\train_sft.py

# 4. evaluate
.venv\Scripts\python scripts\evaluate.py --stage both

# 5. chat (CLI) or dashboard
.venv\Scripts\python scripts\run_chat.py
.venv\Scripts\streamlit run dashboard\app.py
```

## Dashboard
A multi-page Streamlit admin dashboard (`dashboard/app.py`) gives full
visibility into every CRISP-DM stage: dataset stats, live training curves +
GPU utilization, evaluation results with sample generations, and a live chat
playground. See `docs/06_deployment.md`.

## Why these choices
Everything here is sized for a 6GB Pascal GPU: a small custom 8,192-token
vocabulary (rather than a 50k GPT-2 vocab, which would make the embedding
table dominate a model this small), fp16 autocast instead of bf16 (Pascal has
no bf16 tensor cores), `scaled_dot_product_attention`'s memory-efficient
backend instead of a flash-attention kernel (unsupported on this GPU
generation), and TinyStories as the pretraining corpus so a ~26M parameter
model can actually learn coherent language in a few GPU-hours instead of
needing a web-scale corpus it's far too small to model. See
`docs/01_business_understanding.md` for the full rationale.
