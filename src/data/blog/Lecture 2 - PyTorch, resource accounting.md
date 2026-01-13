---
author: Sean Xu
title: Lecture 2 - PyTorch, resource accounting
pubDatetime: 2025-12-21T14:05:43.689Z
description: Note.
---
# 1. Memory Accounting

Almost everything (parameters, gradients, activations, optimizer states) are stored as floating point numbers.

不同类型的 floating point numbers:
- float32 (fp32, single precision)
- float16 (fp16, half precision)
- bfloat16: 和fp16使用相同的memory，但是通过牺牲精度（减少fraction bits），来提高可表示的范围（增加 exponent bits）
- fp8

> **Intuition**: When to use float32 and bf16?

- **float32**: Basically for parameters and optimizers. Accumulate over time needing higher precision.
- **bf16**: Transitory. Take parameters and cast them into bf16. Run ahead.
---
# 2. Compute Accounting
## 2.1 Tensor on GPU

默认tensor store在 CPU 内存中，使用`.to("cuda")`, `device = "cuda`，放到 GPU memory中。

---
## 2.2 Tensor Operations

### Tensor Storage

PyTorch tensors 实际上是 pointer 指向分配的 memory，有 metadata describe 怎么获取其中的 element。

> `stride(i)`: 在第$i$维度，移动到下一个element，需要skip多少element

### Tensor Slicing

很多操作只提供了一个 different **view** of the tensor，此时底层没有 copy，注意修改会影响其他的 tensor。

例如：
- Get row / column, 下标索引
- View $2 \times 3$ matrix as $3 \times$ 2 matrix: `y = x.view(3, 2)`
- Transpose: `y = x.transpose(1, 0)`

Note that some views are non-contiguous entries, which means that further views aren't possible.
```python
x = torch.tensor([[1., 2, 3], [4, 5, 6]]) # @inspect x
y = x.transpose(1, 0) # @inspect y
assert not y.is_contiguous()
try:
	y.view(2, 3)
	assert False
except RuntimeError as e:
	assert "view size is not compatible with input tensor's size and stride" in str(e)
```

但是可以先 enforce a tensor to be contiguous:
```python
y = x.transpose(1, 0).contiguous().view(2, 3)
```
注意此时底层发生了 copy

### Tensor Elementwise

These operations apply some operation to each element of the tensor and return a (new) tensor of the same shape.

> `triu` takes the upper triangular part of a matrix.

### Tensor Matmul

matrix multiplication

> **==the bread and butter== = 赖以生存的根本 / 最核心、最基础、最稳定的收入或技能来源**

---
## 2.3 Tensor Einops

[Einops](https://einops.rocks/) is a library for manipulating tensors where dimensions are named.

### Jaxtyping Basics

[jaxtyping](https://docs.kidger.site/jaxtyping/) is a library providing type annotations **and runtime type-checking** for:
1. shape and dtype of [JAX](https://github.com/google/jax) arrays; _(Now also supports PyTorch, NumPy, MLX, and TensorFlow!)_
2. [PyTrees](https://jax.readthedocs.io/en/latest/pytrees.html).

- [ ] TODO: 组合技实战

---
## 2.4 Tensor Operations FLOPs

> A FLOP (floating-point operation) is a basic operation like addition or multiplication.

Matrix multiplication 一次需要$2 * B * D * K$ flops：每次multiply之后还要add

Interpretation:
- B is the number of data points
- (D K) is the number of parameters
- FLOPs for **forward** pass is $2 * tokens * parameters$

### Model FLOPs utilization (MFU)

**Definition**: 
$$
\frac{actual FLOP/s}{promised FLOP/s}
$$
Usually, MFU of >= 0.5 is quite good (and will be higher if matmuls dominate).

---
## 2.5 Gradients

Consider a weight _w_ that connects an input unit _i_ to an output unit _j_ . For each example in the batch, the weight _w_ generates exactly 6 FLOPs combined in the forward and backward pass:

1. The unit _i_ multiplies its output _h(i)_ by _w_ to send it to the unit _j_.
2. The unit _j_ adds the unit _i_’s contribution to its total input _a(j)_.
3. The unit _j_ multiplies the incoming loss gradient _dL/da(j)_ by _w_ to send it back to the unit i.
4. The unit _i_ adds the unit _j_’s contribution to its total loss gradient _dL/dh(i)_.
5. The unit j multiplies its loss gradient _dL/da(j)_ by the unit i’s output _h(i)_ to compute the loss gradient _dL/dw_ **for the given example**.
6. (The sneakiest FLOP, IMHO) The weight _w_ adds the contribution from step 5 to its loss gradient accumulator _dL/dw_ that aggregates gradients **for all examples**.

Putting it togther:
- Forward pass: 2 (# data points) (# parameters) FLOPs
- Backward pass: 4 (# data points) (# parameters) FLOPs
- Total: 6 (# data points) (# parameters) FLOPs

---
# 3. Models
## 3.1 Module Parameters

Model parameters are stored in PyTorch as `nn.Parameter` objects. 自动求梯度
### Parameter Initialization

TODO：两种初始化
- [ ] Xavier 初始化 [paper](https://proceedings.mlr.press/v9/glorot10a/glorot10a.pdf)
- [ ] Kaiming He 初始化
---
## 3.2 Custom Model

注意model放到GPU，`modle.to(device)`

---
## 3.3 Randomness

Randomness shows up in many places: parameter initialization, dropout, data ordering, etc.

For reproducibility, we recommend you always pass in a different random seed for each use of randomness.

```python
# Torch
seed = 0
torch.manual_seed(seed)

# NumPy
import numpy as np
np.random.seed(seed)

# Python
import random
random.seed(seed)
```

---
## 3.4 Data Loading

Don't want to load the entire data into memory at once (LLaMA data is 2.8TB).

Use `memmap` to lazily load only the accessed parts into memory.

---
## 3.5 Optimizer

TODO:
- momentum = SGD + exponential averaging of grad
- AdaGrad = SGD + averaging by $grad^2$
- RMSProp = AdaGrad + exponentially averaging of $grad^2$
- Adam = RMSProp + momentum

---
## 3.6 Checkpointing

Training language models take a long time and certainly will certainly crash.

You don't want to lose all your progress.During training, it is useful to periodically save your model and optimizer state to disk.

---
## 3.7 Mixed Precision Training

Choice of data type (float32, bfloat16, fp8) have tradeoffs:
- Higher precision: more accurate/stable, more memory, more compute
- Lower precision: less accurate/stable, less memory, less compute

Solution: use float32 by default, but use {bfloat16, fp8} when possible.

A concrete plan:
- Use {bfloat16, fp8} for the forward pass (activations).
- Use float32 for the rest (parameters, gradients).

 Mixed precision training [Micikevicius+ 2017](https://arxiv.org/pdf/1710.03740.pdf)
 
Pytorch has an automatic mixed precision (AMP) library.
[https://pytorch.org/docs/stable/amp.html](https://pytorch.org/docs/stable/amp.html)

