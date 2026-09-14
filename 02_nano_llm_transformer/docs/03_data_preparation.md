# 3. Data Preparation

Pipeline: `scripts/download_data.py` → `scripts/prepare_data.py` → tokenizer training.

1. **Download** (`scripts/download_data.py`): pulls the raw TinyStories `.txt`
   files and the Dolly `.jsonl` file from the Hugging Face Hub into `data/raw/`.
   Idempotent — skips files already present.
2. **Clean & split** (`scripts/prepare_data.py --stage clean`): de-duplicates,
   filters degenerate records, writes cleaned train/val text/JSONL into
   `data/processed/`.
3. **Tokenizer training** (`src/nano_llm/tokenizer.py`, invoked by
   `scripts/prepare_data.py --stage tokenizer`): trains a byte-level BPE
   tokenizer (vocab size 8,192, matching `config/model_config.yaml`) on the
   cleaned TinyStories training text using Hugging Face `tokenizers`. Saved to
   `data/tokenizer/tokenizer.json`. A small vocabulary keeps the embedding
   table a small fraction of total parameters at this model scale.
4. **Packing** (`scripts/prepare_data.py --stage pack`): tokenizes the cleaned
   corpus and packs it into fixed-length `block_size` sequences stored as a
   single `uint16` memory-mapped `.bin` file per split (`train.bin`, `val.bin`)
   for fast, low-RAM random access during training — the standard nanoGPT-style
   data format.
5. **SFT formatting** (`scripts/prepare_data.py --stage sft`): renders each
   Dolly record through a simple chat template
   (`### Instruction / ### Context / ### Response`), tokenizes, and packs into
   `sft_train.bin` / `sft_val.bin` with response tokens marked so the training
   loss can optionally be masked to response-only tokens.

All statistics produced along the way (record counts, dedup counts, token/char
length histograms, final vocab, split sizes) are written to
`data/processed/stats.json`, which is the single source of truth the dashboard's
**Data Overview** page renders.
