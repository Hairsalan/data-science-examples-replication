# 1. Business Understanding

## Objective
Build a small, from-scratch decoder-only LLM and an instruction-following chatbot
that trains and runs entirely on a single consumer laptop GPU (6GB VRAM, no tensor
cores), while still demonstrating the primitives used in modern production LLMs
(RoPE, RMSNorm, SwiGLU, grouped-query attention, KV-cache decoding).

## Success criteria
- **Technical**: validation loss/perplexity on held-out TinyStories text decreases
  monotonically during pretraining; the SFT model produces on-topic, non-degenerate
  responses to simple instructions.
- **Operational**: the full pipeline (data prep → tokenizer → pretrain → SFT →
  evaluate → chat) runs end-to-end on a GTX 1060 6GB without OOM.
- **Usability**: a data-science admin dashboard gives visibility into every stage —
  dataset stats, tokenizer stats, live training curves, GPU/VRAM utilization,
  evaluation results, and a chat playground — without touching the command line.

## Constraints
- 6GB VRAM, Pascal architecture (no bf16, no flash-attention kernels) → use fp16
  autocast + PyTorch's memory-efficient SDPA backend, and keep the model small
  (~26M params) with a small custom vocabulary (8,192 tokens) instead of a full
  50k-token GPT-2 vocabulary, since the embedding table would otherwise dominate
  the parameter budget of a model this size.
- No pretrained weights are used anywhere — model, tokenizer, and both training
  stages are built from scratch, so quality is bounded by model/data scale. This
  is a learning/demo-grade chatbot, not a production assistant.

## Plan of attack (maps to the rest of this repo)
| CRISP-DM phase | Artifact |
|---|---|
| Business Understanding | this document |
| Data Understanding | `docs/02_data_understanding.md`, `dashboard` → Data Overview page |
| Data Preparation | `scripts/download_data.py`, `scripts/prepare_data.py`, `src/nano_llm/tokenizer.py` |
| Modeling | `src/nano_llm/model.py`, `scripts/train_pretrain.py`, `scripts/train_sft.py` |
| Evaluation | `scripts/evaluate.py`, `dashboard` → Model Evaluation page |
| Deployment | `scripts/run_chat.py`, `dashboard` → Chat Playground page |
