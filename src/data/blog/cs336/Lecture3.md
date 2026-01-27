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

> [!Note] 
> Gated models use smaller dimensions for the $d_{ff}$ by 2/3.
> 因为GLU多用了一个矩阵，为了不增加总参数量，需要把矩阵变窄。

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
> Position embeddings: 给原始的输入添加位置信息，在attention计算$Q \times K$的时候使用

## Many variations in position embeddings

- Sine embeddings: add sines and cosines that enable localization
$$
Embed(x, i) = v_x + PE_{pos}
$$
- Absolute embeddings: add a position vector to the embedding
- Relative embeddings: add a vector to the attention computation
- RoPE: rotary position embeddings

## RoPE

A relative position embedding should be some f(x, i) s.t.
$$
<f(x, i), f(y, j)> = g(x, y, i - j)
$$

The attention function only gets to depend on the relative position (i - j).

![rope](@/assets/images/cs336/rope.png)

对于二维向量，旋转只要乘一个$2 \times 2$的旋转矩阵，对于经过word embedding的vector，只要两两维度进行切分，乘下面这个大的矩阵：
$$
R(\theta)=
\begin{pmatrix}
\cos\theta_1 & -\sin\theta_1 &        &        \\
\sin\theta_1 &  \cos\theta_1 &        &        \\
           &             & \ddots &        \\
           &             &        & \cos\theta_{d/2} & -\sin\theta_{d/2} \\
           &             &        & \sin\theta_{d/2} &  \cos\theta_{d/2}
\end{pmatrix}
$$

RoPE最终作用在attention的计算$Attn(i) = \Sigma_j softmax(Q_i \cdot K_j)V_j$中的qk相乘部分:
$$
Q_i \leftarrow R(\theta_i)Q_i \quad K_i \leftarrow R(\theta_i)K_i
$$

因为每个位置$i$ 旋转的角度是$i\theta$，而且qk进行inner product，点乘要转置，最终会有计算一个角度差，体现相对位置信息。

# Hyperparameters

- feedforward size compared to hidden size
- head num
- vocab size
- scale - deep or wide

## Feedforward

根据经验, ratio of feedforward dim ($d_{ff}$) and model dim ($d_{model}$):
$$
d_{ff} = 4 d_{model}
$$

> [!note]
> GLU 中$d_{ff} = 4 d_{model}$, 因为$d_{model}$是原来的$\frac{2}{3}$.






