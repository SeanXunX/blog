---
title: StreamingVLM
author: Sean Xu
pubDatetime: 2026-03-16T21:10:08.951+08:00
featured: false
draft: false
tags:
  - paper
description: Notes about StreamingVLM
---
# 背景

目标：理解无限长的视频，稳定实时响应

## 常见的方法及问题

1. Full Attention: 消耗大量memory和高延迟
2. Sliding Window without overlapping: 每个窗口会频繁地重置上下文，导致丢失前后窗口之间的一致性
3. Sliding Window with overlapping: 保留最近的token，但是多次重新计算attention，效率低

此外，训练和推理无法对齐，无法使用非常长的视频进行training

# 方法

## 1. Inference Scheme

### Streaming-aware KV cache

维护 KV cache：
1. 一组 sink text tokens
2. 一个 long window 保存最近的 text tokens
3. 一个short window 保存最近的 vision tokens

cache 清理：
- older vision tokens 最先被 evicted
- 当cache不够时，才会 evict text

> [!note]
> [**Attention Sink**](https://arxiv.org/pdf/2309.17453)
> 在 autoregressive LLM 中，会有很大一部分的attention权重分配给 initial tokens，尽管在语义上和当前的生成无关：
> - 由于Softmax操作时候所有attention的权重和为1
> - 如果当前的query和前面的tokens无关，还是需要分配这些多余的权重
> - 由于initial tokens对所有的token都是可见的，所以倾向于把多余的attention权重分配给initial tokens

### Contiguous RoPE
- 在evict之后，全局平移，保证在cache中的 RoPE 相对 indices 是连续的
- 在视频长度超过window size，不再增长RoPE indices
## 2. 训练
- 将长视频分割成连续的小chunk，相邻的chunk有部分重叠。
- 每个chunk以1秒为间隔，穿插 vision 和 text tokens
- 每个chunk作为独立的训练实例，进行full attention （不使用sliding window）
## 3. dataset
### 构建流程
1. 用WhisperX提取文字
2. 用GPT清理数据，去除非commentary
### SFT和evaluation
- train and validation: 分隔后，所有前面segment中的comment都作为previous text，同时拿来上一个中的$T_{sink}$和$T_{window}$
- evaluation: 用大模型评分
### annealing data
构建了更精细的data，强调“real-time commentary”

# 相关工作

1. VLM：主要处理有限的视频片段，且将vision token放在text之前，无法实现无限长度、实时交互
2. Streaming in Text LLMs：有相关的attention sink、sliding window、contiguous rope的技术，但是没有对齐trainning和inference
3. Streaming and Online Video LLMs：现有模型在过长的任务上延迟过高，性能下降明显
4. 相关数据集：没有对 frame 级别的理解
