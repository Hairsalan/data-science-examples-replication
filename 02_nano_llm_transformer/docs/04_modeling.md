# 4. Modeling

## Architecture (`src/nano_llm/model.py`)
A decoder-only transformer (~26M params, see `config/model_config.yaml`) built
from scratch with primitives used by current production LLMs, scaled down:

- **RMSNorm** (pre-norm) instead of LayerNorm — cheaper, no mean-subtraction,
  used by LLaMA/Mistral/Qwen.
- **Rotary positional embeddings (RoPE)** applied to Q/K — no learned position
  embedding table, extrapolates better than absolute positions.
- **Grouped-query attention (GQA)** — 8 query heads share 2 key/value heads,
  cutting KV-cache size and attention-projection parameters versus full
  multi-head attention, at negligible quality cost at this scale.
- **SwiGLU MLP** (`silu(xW_gate) * (xW_up) @ W_down`) instead of a plain
  ReLU/GELU MLP — the gated-activation FFN used by LLaMA/PaLM.
- **Weight tying** between the token embedding and the output projection.
- Attention is computed via `torch.nn.functional.scaled_dot_product_attention`,
  which on Pascal (GTX 1060) automatically falls back to the memory-efficient
  kernel (no flash-attention kernel exists for this GPU generation, but SDPA
  still avoids materializing the full attention matrix versus a naive
  implementation).
- **KV-cache** decoding for autoregressive generation (`model.generate`), so
  chat inference doesn't recompute the whole prefix each token.

## Training (`scripts/train_pretrain.py`, `scripts/train_sft.py`)
- Mixed precision via `torch.autocast(dtype=float16)` + `GradScaler` (fp16, not
  bf16 — Pascal has no bf16 tensor core support).
- AdamW, cosine LR schedule with linear warmup, gradient accumulation to reach
  a larger effective batch size than fits in 6GB at once, gradient clipping.
- Both scripts support `--smoke-test` (a few hundred steps, to verify the
  pipeline end-to-end quickly) and full runs, and both append structured JSONL
  logs to `logs/pretrain.jsonl` / `logs/sft.jsonl` — the dashboard's
  **Training Monitor** page tails these files live.
- Checkpoints (`checkpoints/pretrain/`, `checkpoints/sft/`) store model weights,
  optimizer state, step, and config, so runs are resumable.

## Two-stage training
1. **Pretraining** on TinyStories teaches the base model general (simple)
   English language modeling.
2. **Supervised fine-tuning (SFT)** on Dolly, initialized from the pretrained
   checkpoint, teaches the instruction/response chat format on top.
