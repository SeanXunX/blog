---
title: Complementary RL
author: Sean Xu
pubDatetime: 2026-03-24T18:00:43.603+08:00
featured: false
draft: false
tags:
  - others
description: Notes about Complementary RL
---
# 论文学习笔记：《Complementary Reinforcement Learning》

**机构**：Alibaba Group, HKUST
**核心领域**：大语言模型（LLM）、强化学习（RL）、智能体（Agent）、经验学习（Learning from Experience）

---

## 一、 研究背景与痛点
1. **现有痛点**：基于强化学习（RL）训练的 LLM Agent 存在**样本效率低**的问题。通常的 RL 只基于稀疏的最终结果给出奖励，忽略了交互轨迹中丰富的过程信息（如成功策略、失败模式）。
2. **已有方案的缺陷**：现有方法尝试引入“历史经验”来辅助训练，但通常将经验库作为**静态资源**。随着 Actor（智能体）能力的提升，静态经验会逐渐过时（Distributional Misalignment，分布不匹配），导致训练后期经验不仅无用反而起反作用。

## 二、 核心思想 (Complementary RL)
受神经科学中的“互补学习系统（CLS）”启发（大脑新皮层负责慢速结构化知识，海马体负责快速情景记忆），论文提出了 **Complementary RL** 框架，实现 **Actor（策略执行者）** 和 **Extractor（经验提取器）** 的**协同进化（Co-evolution）**。
- **Actor**：通过与环境交互，利用稀疏奖励优化自身策略。
- **Extractor**：根据其提取的经验是否真正帮助了 Actor 成功，来获得奖励并优化自身提取能力。

## 三、 核心算法设计

### 1. 经验提取器 (Experience Extractor, $\pi_\phi$)
- **机制**：在每个 Episode 结束时，Extractor 观察完整的轨迹 $\tau$ 和目标 $g$，生成（蒸馏出）一条文本经验 $m$。
- **奖励分配**：根据这条经验指导的轨迹最终是否成功，分配二元奖励 $r(m) \in \{-1, +1\}$。
- **优化目标 (CISPO)**：采用 Token 级别的带有裁剪机制的重要性采样（Token-level IS clipped）。
  - *为什么用 CISPO*：防止策略更新过大导致经验分布剧烈偏移，保证协同进化的稳定性，同时不浪费长序列中每个 Token 的梯度。

### 2. 策略执行者 (Actor, $\pi_\theta$)
- **机制**：使用 GRPO 算法进行策略优化。
- **关键创新 (Split GRPO)**：如果全部使用“带经验提示”的数据训练，Actor 会产生“经验依赖”，丧失自身泛化能力。
  - *解决方案*：将采样的轨迹平均分为两组：**“经验引导组 (experience-guided)”** 和 **“无经验组 (experience-free)”**。
  - *优势计算*：在**各自的组内**独立计算并标准化优势函数（Advantage），避免两组数据因基础胜率不同导致训练崩溃，促使 Actor 真正内化经验并提升基础能力。

## 四、 异步训练系统架构 (Training Framework)
为了避免 Actor 和 Extractor 相互等待造成算力闲置，设计了完全异步的双循环架构：
1. **主训练循环 (Primary Loop)**：Actor 不断与环境交互、采样轨迹并更新策略。
2. **后台线程 (Background Track)**：Extractor 异步处理完成的轨迹，蒸馏经验并更新经验库。
3. **核心枢纽 (Experience Manager, $\mathcal{H}$)**：
   - 负责统筹并发请求。使用**读写锁**机制：写锁保护经验的添加/更新，防止状态冲突；读锁支持环境并行的 Batch 化语义检索，最大化吞吐量。

## 五、 关键机制与 Tricks

1. **Search-and-Ask (主动查询)**：允许 Actor 在交互的关键决策点，根据当前遇到的困难主动向经验库发起查询，而不是只在任务开头被动接收经验。
2. **Periodic Merge (定期合并)**：经验库会定期触发合并操作，利用 Extractor 识别并合并冗余/冲突的经验，保持经验库的紧凑和高质量。
3. **Retrieval Diversification (检索多样化)**：对检索结果进行重排，惩罚被频繁检索的经验，增加训练数据的多样性。
4. **Count-Aware Advantage Reweighting (经验降权)**：对于在训练 Buffer 中被重复使用的经验，根据其训练次数和更新近期度进行优势降权，防止 Extractor 过拟合。

## 六、 实验结论
1. **单任务表现**：在 MiniHack, WebShop, ALFWorld, SWE-Bench 四个复杂环境上，均显著超越了无经验基线和静态经验基线，且动作效率更高（所需步数更少）。
2. **多任务/泛化表现**：在多任务联合训练中展现出优异的可扩展性，Extractor 能够提炼出跨任务的通用原则（如：如何打破死循环、何时升级策略等），有效避免了固定参数提取器带来的跨任务污染。
3. **系统开销**：精心设计的异步框架和批处理检索几乎没有给 Rollout 收集引入额外的延迟。

**总结**：Complementary RL 将“经验总结”从一个静态的预处理步骤，升格为了与主模型同步成长的一等公民，为大语言模型智能体的长效、持续学习提供了一个优雅且工程友好的范式。