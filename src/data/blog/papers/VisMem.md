---
title: VisMem
author: Sean Xu
pubDatetime: 2026-03-16T13:17:35.118+08:00
featured: false
draft: false
tags:
  - paper
description: Notes about VisMem
---
# 背景

现有VLM在 autoregressive decoding 缺乏 visual memory，具体来说：
- 通常给累积的 textual 形式的上下文更高优先级，但是初始的视觉信息容易被忽视遗忘
- 缺少是视觉信息的语义认知 visual semantic knowledge
# 现有方法
## 增强视觉能力
### 1. 直接对基座模型进行训练
直接post training，如SFT
问题：导致灾难性遗忘，丧失泛化能力，专精于特定领域
### 2. 提供image-level视觉信息
基于输入的视觉输入，使用 bounding box 或者外部的工具提供视觉信息。
问题：修改视觉输入需要更多的计算，导致高延迟，过度依赖特定的工具和特定类型的输入图片。
### 3. 提供token-level的视觉信息
直接将原始的视觉token作为信息。
问题：无法修改已知的视觉信息，导致不充分的精炼
### 4. 使用latent space状态
使用 latent states 优化生成，但是目前主要集中于language model。尽管有尝试 latent vision space，但是需要大量人工标注。 
## 使用memory

现有的memory范式没能很好的解决视觉信息的记忆

# 方法

设计了两种形式的memory：
1. short-term：保存细粒度的视觉信息，用于瞬时使用
2. long-term：将过往的经验抽象成语义，提供总结性的上下文语义信息
## memory invocation 
激活memory的方法，扩展了 vocabulary，听啊家里四个特殊的 memory 操作token，$<m_I^s>, <m_E^s>, <m_I^l>, <m_D^l>$ , 分别用于标识 Short-term 和 Long-term memory 的 Invocation 和 End。

- 扩展了vocabulary，对应的embedding矩阵也需要修改。
- 在初始化 invocation token 的时候，使用的类似分隔符token的 embedding 向量加上微小扰动；end token 作为结构性的token，也类似初始化，且赋予较小的学习率
- 使用 constrained decoding 来促进成对的 invocation-end

## memory formation

### query builder
query builder由一个轻量化的 transformer encoder $B$ 和一个可学习的 $Q_{init}$ 组成。将视觉和语言的hidden states拼接成$H$，加上 $Q_{init}$ 输入到encoder中，获取 memory query
$Q$. 其中attention机制使用masked attention，阻止$H$看到$Q$.
### latent memory former
使用两个轻量的 LoRA adapterer，防止破坏 base 模型的通用能力。

输入：concatenated $[X, Q, M_{init}]$ 
输出：对应short / long的最后 N 个token

## Training Recipe
two-stage training
### stage 1
训练 query builder 和 memory formers，冻结 policy model。
- 初始阶段：在遇到 delimiter 的时候随机激活 short 或者 long term memory。
- 扩展阶段：允许在delimiter之间任意位置位置。

阶段一的目标是最大化提高 memory 加持下的性能表现，提升 memory 信息的质量。
$$
\Delta S(\tau) = S(\tau) - S(\tau_{base})
$$

### stage 2
更新policy model的参数，冻结阶段一中memory formation相关的组件。目标是提升policy model去激活memory的高效性和准确性，即使用正确的 memory 类型和避免不必要的memory调用。引入了两个 penalties，来实现:
1. $p_{type} = \max(0, S(\tau_{rev})-S(\tau))$ 其中$\tau_{rev}$是使用另一种memory类型的情况
2. $p_{neg} = \max(0, \overline{S}-S(\tau))$ 其中 $\overline{S}$ 代表在当前状态下，所有可能采样到的候选路径（Candidate Trajectories）的平均得分。它被用作一个基准线（Baseline）。

所以总的来说是要优化：
$$
\Delta S(\tau) - \alpha( p_{type} + p_{neg})
$$
# 实验

在12个benchmarks上进行测试，任务包括 understanding、reasoning、generation

结果显示有三个主要的提升：
1. 更强、更综合的的视觉能力
2. 跨领域泛化能力：使用latent space的memory可以泛化到其他没见过的的task上。（方法：在Visual CoT 和 Mulberry两个数据集上单独训练，然后在未见过的task上测试。）
3. 避免灾难性遗忘：进行增量测试，最开始在base task上训练，后面增加新的数据集

实验中的观察
1. 兼容不同的base model
2. memory 激活是动态、自适应的，在不同的任务中两种memory的比例不同
3. 提高 performance 的同时带来很少的推理延迟