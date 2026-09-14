# 2. Data Understanding

## Pretraining corpus: TinyStories (GPT-4 regenerated version)
- Source: `roneneldan/TinyStories` on the Hugging Face Hub, files
  `TinyStoriesV2-GPT4-train.txt` / `TinyStoriesV2-GPT4-valid.txt`.
- Short (~150-800 char), simple, synthetically generated children's stories using
  only a vocabulary a 3-4 year old would understand. Chosen deliberately: it lets
  a ~26M parameter model — far too small to model general web text — learn
  grammatical, coherent English within a few GPU-hours, which is the point of a
  "fits on a laptop GPU" project.
- License: the dataset card designates it CDLA-Sharing 1.0.
- Rough scale: train file ~2.1M stories / ~1.9GB of raw text; we may subsample
  for wall-clock reasons (see `data/processed/stats.json` after prep for the
  exact numbers used, surfaced live in the dashboard's Data Overview page).

## Instruction-tuning corpus: Databricks Dolly 15k
- Source: `databricks/databricks-dolly-15k`, file `databricks-dolly-15k.jsonl`.
- ~15,000 human-written instruction/response pairs across 8 task categories
  (open QA, closed QA, brainstorming, classification, summarization, creative
  writing, information extraction, general QA). Some records include a `context`
  field.
- License: CC BY-SA 3.0.
- Used to teach the base (TinyStories-pretrained) model to follow an
  instruction/response chat template — quality will be modest given the base
  model is only story-trained, but it demonstrates the full pretrain→SFT
  pipeline end to end.

## Data quality checks performed in `scripts/prepare_data.py`
- Encoding validation (UTF-8), de-duplication of exact-duplicate lines/records,
  length filtering (drop empty/near-empty stories and instructions),
  train/validation split preservation (TinyStories ships its own split; Dolly is
  split 95/5 deterministically by hashing the record id).
- Token-length distribution, character-length distribution, and vocabulary
  coverage are computed after tokenizer training and written to
  `data/processed/stats.json`, which the dashboard reads directly — no numbers
  are hard-coded in the app.
