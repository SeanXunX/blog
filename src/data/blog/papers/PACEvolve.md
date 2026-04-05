---
title: PACEvolve
author: Sean Xu
pubDatetime: 2026-03-23T19:53:49.841+08:00
featured: false
draft: false
tags:
  - paper
description: Notes about PACEvolve
---
# 已有方法的问题
## Context Pollution
出现不好的结果，存在context里后会污染context，导致LLM持续陷入不好的假设
## Exploration - Exploitation balance不好
模型倾向于选择和过去经验context中类似的方法，导致不能很好explore创新性的想法
## Weak Collaboration hurts parallel search efficiency
使用类似multi-island的算法，只在固定的时间将差的个体替换成最好的个体的复制，没有充分利用不同island之间的知识多样性
# 解决方法
## Hierarchical Context Management (HCM)

### 分离 high-level 的 idea 和具体的解决方法
使用两阶段的过程：
1. idea生成，此阶段将生成的idea使用一个LLM-based classifier决定是用来refine现有的data，或者存成新的entry
2. idea选择
### 两个层次的Context Pruning
1. 在hypothesis-level，压缩相关实验的history
2. 在ideal-level，干掉有大量low-performing hypotheses的idea
### Persisting Failures to Permanent Memory
记录失败，引以为戒
## 动量回溯机制 (Momentum-Based Backtracking, MBB)

**核心目的**：解决进化搜索中的“模式崩溃（Mode Collapse）”和局部最优问题，取代低效的固定频率重启（Fixed-schedule Resets）。

- **核心指标：相对进展 (Relative Progress, Rt​)** 为了消除问题规模（Scale）的影响，定义了一个标量无关的指标，衡量当前进步占剩余优化空间的比例：
    $$
    R_t = \frac{s_{t - 1} -s_t}{s_{t-1} - r}
    $$
    
- **触发信号：相对提升动量 (Relative Improvement Momentum, mt​)** 使用指数加权移动平均（EWMA）平滑 Rt​，作为判断搜索轨迹“健康度”的实时信号：
    
    mt​=β⋅mt−1​+(1−β)⋅Rt​
    
- **干预策略 (Intervention)**：
    - 当动量 mt​ 低于预设阈值时，触发回溯。
    - **动作**：Agent 强制回退到较早的状态。回退点的选择遵循**幂律分布（Power-law distribution）**，倾向于回退到更早的迭代版本。
    - **效果**：显式“卸载（Unlearning）”近期失败的尝试，重置上下文窗口，强行跳出局部最优。
## 自适应协作进化 (Self-Adaptive Collaborative Evolution, CE)

**核心目的**：在多岛屿（Multi-island）并行搜索中，动态平衡“内部探索”与“外部利用”，通过 LLM 自适应地决定知识迁移。

- **全局对比指标：绝对进展 (Absolute Progress, At​)** 用于跨岛屿比较各自的领先程度：
    $$A_t​= \frac{s_0​−s_t}{​s_0−r}​​$$
    _(范围在 [0,1] 之间，表示自搜索开始以来完成的总进度百分比)_
    
- **决策动作集 (Action Set)**： 当某个岛屿 i 发生停滞（mt,i​<εrel​）时，系统在以下动作中进行概率采样：
    1. **Backtrack（内部回溯）**：在当前岛屿内部寻找新路径。
    2. **Crossover（跨岛协作）**：引入其他岛屿 j 的优秀经验。

- **自适应采样三原则 (Sampling Principles)**：
    1. **高收益优先**：优先与那些绝对进展远高于自己的岛屿（At,j​>At,i​）进行交叉（Crossover）。
    2. **强者靠自己**：如果当前岛屿已经是全球最强（At,i​≥At,j​），则由于没有更好的外部经验可借鉴，优先选择回溯（Backtrack）。
    3. **全局状态敏感**：
        - 若双方表现都差（低 At​）：说明大家都卡住了，倾向于回溯以寻找新方向。
        - 若双方表现都好（高 At​）：说明两者都有高质量局部经验，倾向于交叉以追求协同效应（Synergy）。
