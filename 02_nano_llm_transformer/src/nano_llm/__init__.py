"""nano_llm: from-scratch small LLM package.

Submodules are imported directly (e.g. `from nano_llm.model import NanoLLM`)
rather than re-exported here, so that pure data-prep code (nano_llm.tokenizer,
nano_llm.data) doesn't force a torch import when torch isn't needed.
"""
