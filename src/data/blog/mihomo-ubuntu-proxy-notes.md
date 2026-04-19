---
title: 配置 Mihomo 代理
author: Sean Xu
pubDatetime: 2026-04-19T14:00:00.000+08:00
featured: false
draft: false
tags:
  - tech
  - proxy
  - mihomo
description: 记录服务器上安装 Mihomo、systemd 托管、订阅与自建节点的配置与踩坑，以及订阅不可用时的配置来源与在 Mac 上跑 amd64 Ubuntu 图形环境的做法。
---

## 背景

在 Ubuntu 服务器上按 [Mihomo（Meta Cube）文档](https://wiki.metacubex.one/en/) 装好了内核，用 **systemd** 做成常驻服务（参考 [Service 启动说明](https://wiki.metacubex.one/en/startup/service/)），配置则对照 [示例配置](https://wiki.metacubex.one/en/example/conf/)，分别试了 **订阅** 和 **自建节点** 两种用法。

下面只记步骤里容易忘的两处坑，以及订阅链接失效时怎么找回一份可用的 Clash 配置；在 Mac 上需要 **amd64 Ubuntu + 图形界面** 时，可以和另一篇 [Dev Containers](/posts/dev-containers) 里的做法结合起来用。

---

## systemd 与配置思路

- 按官方 Wiki 安装 Mihomo 后，用 `systemctl` 管理进程，开机自启、崩溃重启都交给单元文件即可（详见 Wiki 的 Service 章节）。
- 配置骨架可直接从示例页抄起，再按你是 **远程订阅** 还是 **手写/自建节点** 去改 `proxies`、`proxy-groups` 等段落。

---

## 坑一：Yacd 面板连不上 `external-controller`

用 [Yacd](https://github.com/haishanh/yacd) 这类 Web 面板时，若 Mihomo 里仍使用文档常见的：

```yaml
external-controller: 127.0.0.1:9090
```

面板跑在别的机器或容器里时，只能连到本机回环，**外部访问不到**。需要改成监听所有接口，例如：

```yaml
external-controller: 0.0.0.0:9090
```

（若暴露在公网，务必配合防火墙、鉴权或仅内网访问，避免 REST API 被任意调用。）

---

## 坑二：自建节点时流量默认走直连

在用 **自建节点** 时，若代理组里仍沿用示例的默认策略，可能出现 **默认选项落在 `DIRECT`（直连）** 上，导致你以为走了代理实际没走。需要在对应的 `proxy-groups` 里把默认/回落改到正确的代理或 `fallback`/`url-test` 组，并确认规则里希望走代理的流量确实匹配到该组。

---

## 订阅链接没了：从 GC Client 本地配置里抄一份

之前用的机场突然不提供订阅 URL 时，用的套壳前端，linux中安装了提供的客户端 **GC Client**（包名里常见 `net.gcclient.app`），可以尝试直接读它已经落盘的 Clash 配置，例如：

```text
/home/vscode/.local/share/net.gcclient.app/clash/config.yaml
```

路径里的用户名随环境而变（Dev Container 里常见为 `vscode`）。把其中可用的 `proxies` / `proxy-groups` / `rules` 合并进 Mihomo 配置时，注意与 Mihomo 语法差异（以 [官方 Wiki](https://wiki.metacubex.one/en/) 为准）。

在 **Mac** 上若需要 **图形界面的 amd64 Ubuntu**（例如跑只提供 Linux 客户端或 x86 图形程序的工具），可以用 VS Code **Dev Containers** 起 amd64 镜像并做 GUI 转发；具体步骤见：[Dev Containers](/posts/dev-containers)。

---

## 参考链接

- [Mihomo Wiki（英文）](https://wiki.metacubex.one/en/)
- [以 systemd 托管](https://wiki.metacubex.one/en/startup/service/)
- [配置示例](https://wiki.metacubex.one/en/example/conf/)
- [Yacd](https://github.com/haishanh/yacd)
