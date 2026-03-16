---
title: Value Iteration and Policy Iteration
author: Sean Xu
pubDatetime: 2026-03-07T16:54:33.011Z
featured: false
draft: false
tags:
  - learning
  - RL
description: Value iteration, policy iteration and truncated policy iteration.
---
## Value Iteration
### Step 1: Policy update
给定 $v_k$ (初始化随机)，argmax计算出新的policy，用来后面算新的value：
$$
\pi_{k+1} = arg\max_\pi(r_\pi+\gamma P_\pi v_k) 
$$
### Step 2: Value update
根据 step 1 中的新policy，计算一个v：
$$
v_{k+1} = r_{\pi_{k+1}} + \gamma P_{\pi_{k+1}} v_k
$$
> [!notice]
> 此处的是通过新的policy直接作用在 $v_k$ 上来计算，注意并不是Bellman equation，所以不用迭代或者矩阵求解。 因为部署Bellman equation，所以这里所有的$v$都不是state value。

## Policy Iteration
### Step 1: Policy evaluation (PE)
和上面的Value Iteration不同，这里给定 $\pi_k$ ，去计算其对应的state value：
$$
v_{\pi_k} = r_{\pi_k} + \gamma P_{\pi_k}v_{\pi_k}
$$
> [!notice]
> 注意此处实际上是一个Bellman equation，实操时需要通过迭代法去求解state value。
> **和上面的Step 2不同！！！**
### Step 2: Policy improvement (PI)
在求得state value之后就可以去优化得到新的policy，同样是直接argmax：
$$
\pi_{k+1} = arg\max_\pi(r_\pi + \gamma P_\pi v_{\pi_k})
$$
## Intuition -> Truncated policy iteration
- Value iteration：$v_k \rightarrow \pi_{k+1} \rightarrow v_{k+1}$ 不停迭代value直到获得最优的，进一步得到最优的policy
- Policy iteration：$\pi_k \rightarrow v_k \rightarrow \pi_{k+1}$ 整体上迭代policy，但是中间步骤需要迭代来获得state value
![](../Attachments/Pasted%20image%2020260307173942.png)
![](../Attachments/Pasted%20image%2020260307174436.png)
