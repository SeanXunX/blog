---
title: MemGen
author: Sean Xu
pubDatetime: 2026-03-17T19:05:54.510+08:00
featured: false
draft: false
tags:
  - others
description: Notes about MemGen
---
# 1. 背景
现有的 agent memory 缺乏交叉 reasoning 和 memory 的能力，通常只是通过相似度去 retrieve memory。MemGen让模型像人类一样，在思考的过程中形成记忆。
# 2. 现有的方法
## 2.1 相关的Memory机制
1. parametric memory：catastrophic forgetting
2. retrieval-based: 将过往的经验整理成可以复用的知识、skills，不够灵活，依赖相关流程、上下文的设计
3. latent memory: 缺少 reasoning 和 memory 的协同作用
## 2.2 Latent Computation
将latent states用于reasoning的过程：
1. 直接让llm的推理过程在latent space中，比如将显示的文字的 chain of thought 放到latent space中
2. 不完全取代文本输出，而是利用潜空间向量来**调控**生成质量。当模型在生成文本时，潜空间里的计算结果会实时介入，修正偏差或注入关键信息。
## 2.3 Speculative Decoding and RL
1. speculative decoding：投机采样通过一个轻量级的 Drafter 模型预先生成若干个候选 Token（Draft Tokens），让主模型一次性验证。MemGen 在生成过程中，预先产生并插入一段 Latent Tokens，但是用于 memory 
2. RL：没有结合RL和agent memory去解决self-improving memory的先例
# 3. 方法
设计了俩个模块 `trigger` 和 `weaver`
## 3.1 trigger
本质是一个轻量的LoRA。当reasoner生成token序列的同时，会产生对应的hidden sates sequence，trigger将这个sequence作为当前认知状态来判断是否需要激活memory。

未来避免大量不必要的额外计算，只在预先定义好的delimiter（如逗号，句号等）处去激活memory。

**Training：** 用强化学习训练，在每个每个step选择action invoke / skip。为了避免无用的memory调用，设计了一个penalty，$-\lambda \sum_{i, j}max(0, \tilde{d}_{i, j} - \overline{p})$，$\overline{p}$是高于中位数reward的trajectory的memory激活概率
## 3.2 weaver
也是一个LoRA adapter，使用和trigger同样的 hidden state sequence 来生成 latent memory

**Training：** 目标是最大化最终的reward，且只更新 weaver，不动底层reasoner

# 4. 实验

通过“干预实验”（删掉特定簇的 Latent Tokens）发现，模型内部自发形成了三种功能区：

- **规划记忆 (Planning Memory - Cluster 2)：** 负责“宏观策略”。删掉它，模型就开始胡言乱语，逻辑链条断裂。
- **程序性记忆 (Procedural Memory - Cluster 3)：** 负责“操作细节”。删掉它，模型就不会用工具了，格式也乱了。
- **工作记忆 (Working Memory - Clusters 1 & 4)：** 负责“短期连贯”。删掉它，模型会忘记前几秒发生了什么。



