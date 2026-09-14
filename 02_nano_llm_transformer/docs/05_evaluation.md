# 5. Evaluation

`scripts/evaluate.py` runs both quantitative and qualitative evaluation and
writes results to `logs/eval_pretrain.json` / `logs/eval_sft.json`, which the
dashboard's **Model Evaluation** page renders.

## Quantitative
- **Held-out loss & perplexity** on the TinyStories validation split (base
  model) and the Dolly validation split (SFT model), computed with the model in
  `eval()` mode, no dropout, batched.
- **Training curve diagnostics**: train vs. val loss over steps (read straight
  from `logs/*.jsonl`), used to check for overfitting/underfitting.

## Qualitative
- **Fixed-prompt generations**: a small fixed set of story-starter prompts
  (base model) and instructions (SFT model) are generated at evaluation time
  with the same seed, so generations are directly comparable across
  checkpoints/runs over training — this is what "is it actually getting
  better" looks like for a generative model, beyond the loss number.
- **Repetition / degeneracy check**: simple n-gram repetition rate on generated
  samples, flagging obviously broken (repeating-loop) checkpoints.

## Interpreting results for this project's scope
Given the base model is pretrained only on TinyStories (a deliberately narrow,
simple corpus) and SFT-tuned on a modest 15k-example instruction set, the bar
for "success" is: grammatical, on-topic, non-repetitive text — not factual
correctness or broad world knowledge. This is documented so evaluation numbers
are read in the right context.
