---
title: Lecture 1
author: Sean Xu
pubDatetime: 2026-06-14T23:09:22.971+08:00
featured: false
draft: false
tags:
  - others
description: Notes about Lecture 1
---

# Tokenization
## Byte Pair Encoding

Intuition: common sequences of bytes are represented by a single token, rare sequences are represented by many tokens.

不断合并最高频率的pair
## Summary:
- Tokenizer: strings ↔ tokens (indices)
- Character-based, byte-based, word-based tokenization are highly suboptimal
- BPE is an effective heuristic that is data-driven
- Tokenization is a separate step, maybe one day do it end-to-end from bytes...