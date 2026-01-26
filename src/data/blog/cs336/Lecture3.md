---
author: Sean Xu
title: Lecture 3 - Architecture
pubDatetime: 2026-1-16T19:05:43.689Z
tags:
  - cs336
  - deep learning
  - learning
description: Note.
---

# Architecture

## Pre-norm vs Post-norm

Almost all modern LMs use pre-norm.

pre-norm 提高训练的稳定性，将 normalization 放在 residual stream 之外，提高input 传递的流畅性。

residual stream 中只放 identify connection $f(x) = x$

### double norm

尝试结合 pre-norm 和 post-norm，既然将 normalization 放在 residual norm 中不好，把 post-norm 放到残差连接的外部。

![double-norm](@/assets/images/cs336/double-norm.png)

## LayerNorm vs RMSNorm

- LayerNorm - In original transformers. Normalizes the mean and variance across $d_{model}$
$$
y = \frac{x - E(x)}{\sqrt{Var(x) + \epsilon}} * \gamma + \beta
$$
- RMSNorm - does not subtract mean or add a bias term
$$
y = \frac{x}{\sqrt{mean(x^2) + \epsilon}} * \gamma
$$ 

Why RMSNorm?

Modern explanation - faster and just as good:
- Fewer operations (no mean calculations)
- Fewer parameters (no bias term to store)

Really make sense?

Matrix multiplies are the vast majority of FLOPs and memory.

> [!caution]
> FLOPs are not runtime!

RMSNorm 能减少整体runtime是因为减少了data movement

## More generally: dropping bias terms

Most modern transformers don't have bias terms.

Reasons:
- less memory movement
- optimization stability

## Activations

TODO: GeLU

### Gated activations (*GLU)

GLUs modify the first part of a FF (Feed Forward) layer.

From ReLU to ReGLU:

$$
\max(0, xW_1) \rArr \max(0, xW_1) \odot (xV)
$$

GeGLU:

$$
FFN_{GeGLU}(x, W, V, W_2) = (GeLU(xW) \odot xV)W_2
$$

SwiGLU (swish is x * sigmoid(x)):

$$
FFN_{SwiGLU}(x, W, V, W_2) = (Swish(xW) \odot xV)W_2
$$

## Serial vs Parallel layers

Normal transformer blocks are serial - they compute attention, then the MLP:

$$
y = x + MLP(LayerNorm(x + Attention(LayerNorm(x))))
$$

Try parallelization:

$$
y = x + MLP(LayerNorm(x)) + Attention(LayerNorm(x))
$$

No extremely serious ablations, but has a compute win.

# RoPE: Rotary Position Embedding

> [!tip]
> Position embeddings: 给原始的输入添加位置信息

TODO: more specific & different position embeddings

## Many variations in position embeddings

- Sine embeddings: add sines and cosines that enable localization
- Absolute embeddings: add a position vector to the embedding
- Relative embeddings: add a vector to the attention computation
- RoPE

