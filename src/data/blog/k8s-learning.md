---
title: Kubernetes Learning
author: Sean Xu
pubDatetime: 2026-01-15T02:48:26.320Z
featured: false
draft: false
tags:
  - k8s
  - learning
description: Learning k8s official tutorial.
---

## Table of contents


# Learn Kubernetes Basics

> [!note] 
> kubernetes官方tutorial https://kubernetes.io/docs/tutorials/


## Create a Cluster
一个kubernetes集群包含：
1. Control Plane：管理集群
2. Nodes：实际运行applications的VM或者物理机

每个node有一个Kubelet，用于管理node、和control plane通信。

部署applications，tell control plane来启动应用容器。
node-level 的组件，比如kubelet，使用Kubernetes API和control plane通信。

### Control plane components

1. kube-apiserver：暴露Kubernetes API
2. etcd：高可用的kv存储，作为kubernetes的backing存储所有cluster的数据，需要备份
3. kube-scheduler：监视新创建的没有分配到node的Pods（一组running的containers），为其挑选合适的node来运行
4. kube-controller-manager：运行 cotroller（监测集群状态的control loop，try to 让当前状态靠向期望状态） 进程的组件
5. cloud-controller-manager：A Kubernetes control plane component that embeds cloud-specific control logic. The cloud controller manager lets you link your cluster into your cloud provider's API, and separates out the components that interact with that cloud platform from components that only interact with your cluster.

### Node components
1. Kubelet：每个node都有的agent，确保containers运行在pod。确保在PosSpecs中描述container正常运行。
1. kube-proxy（optional）：network proxy，管理每个node的网络
3. Container runtime：管理container的execution和lifcycle

## Deploy an App

### Kuternetes Deployments
> Deployment 负责创建和更新application实例

当有一个running的Kubernetes 集群，可以创建一个**Deployments** 来部署容器化应用。Deployment指导Kubernetes如何创建和更新应用实例。当创建了一个Deployment，control plane会schedule应用实例到node上运行。

当应用实例创建之后，a Kubernetes Deployment controller 持续monitor这些instances。如果host这个instance的node goes down或者被删了，Deployment controller会替换这个instance到另一个node。

### Deploying an app

When you create a Deployment, you'll need to specify the container image for your application and the number of replicas that you want to run. 

``` bash
kubectl create deployment kubernetes-bootcamp \
--image=gcr.io/google-samples/kubernetes-bootcamp:v1
```

This performed a few things for you:
- **searched for a suitable node** where an instance of the application could be run (we have only 1 available node)
- **scheduled the application** to run on that Node
- configured the cluster to reschedule the instance on a new Node when needed

[Pods](https://kubernetes.io/docs/concepts/workloads/pods/) that are running inside Kubernetes are running on a private, isolated network. By default they are visible from other pods and services within the same Kubernetes cluster, but not outside that network. 

## Explore APP: Viewing Pods and Nodes

Pods

A Pod is a Kubernetes abstraction that represents **a group of one or more application containers** (such as Docker), and some **shared resources** for those containers. Those resources include:

- Shared storage, as Volumes
- Networking, as a unique cluster IP address
- Information about how to run each container, such as the container image version or specific ports to use

### Nodes

Pod运行在Node上。Node是worker machine，虚拟机或者物理机。每个Node都归control plane管。Node可以有多个pod，control plane自动schedule pods across nodes in the 集群。

一个Node至少运行：
- Kubelet：负责control plane和node间通信的进程；管理pods和containers
- container runtime：负责pulling the container image from a registry, unpacking the container, and running the application.

### Troubleshooting with kubectl
常见命令：
- `kubectl get` - list resources
- `kubectl describe` - show detailed information about a resource
- `kubectl logs` - print the logs from a container in a pod
- `kubectl exec` - execute a command on a container in a pod

## Using a Service to Expose App

A [Service](https://kubernetes.io/docs/concepts/services-networking/service/) in Kubernetes is an abstraction which defines **a logical set of Pods and a policy by which to access them.** Services enable a **loose coupling between dependent Pods**. The set of Pods targeted by a Service is usually determined by a **label selector**.

Services allow your applications to receive traffic. Services can be exposed in different ways by specifying a type in the spec of the Service:

- ClusterIP (default) - Exposes the Service on an internal IP in the cluster. This type makes the Service only reachable from within the cluster. 集群内pod ip是会随机改变的，不稳定；使用ClusterIP之后ip稳定，背后的pod可变，且可以自动负载均衡。
- NodePort - Exposes the Service on the same port of each selected Node in the cluster using NAT. Makes a Service accessible from outside the cluster using NodeIP:NodePort. Superset of ClusterIP. 固定一个端口port，可以通过任意node的ip加上port来访问。
- LoadBalancer - Creates an external load balancer in the current cloud (if supported) and assigns a fixed, external IP to the Service. Superset of NodePort. 依赖云厂商，分配外部ip，内部和nodeport类似
- ExternalName - Maps the Service to the contents of the externalName field (e.g. foo.bar.example.com), by returning a CNAME record with its value. No proxying of any kind is set up. This type requires v1.7 or higher of kube-dns, or CoreDNS version 0.0.8 or higher.

### Creating a new Service

```bash
kubectl expose deployment/kubernetes-bootcamp --type="NodePort" --port=8080
```
**关于Port的理解：**
- 指定类型 type 为 “NodePort”
- port参数是指service对象本身在cluster集群内部的端口
- 可以通过target-port指定映射到deployment（多个pod的replica）中的端口
- 会自动分配一个NodePort，用于外部访问（NodeIP：NodePort）

```mermaid
flowchart LR
    A[客户端<br/>浏览器 / curl] --> B[NodeIP:NodePort<br/>30681]
    B --> C[kube-proxy 负责转发]
    C --> D[Service ClusterIP:8080]
    D --> E[Pod 的 targetPort:8080]
```

### Using labels
```bash
-l key=value
```

### Deleting a service

To delete Services you can use the delete service subcommand. Labels can be used also here:

```bash 
kubectl delete service -l app=kubernetes-bootcamp
```

## Scale APP: Running Multiple Instances

> Scaling is accomplished by changing the number of replicas in a Deployment.

### 查看相关Deployment的ReplicaSet

```bash
kubectl get rs
```

- *DESIRED* displays the desired number of replicas of the application, which you define when you create the Deployment. This is the desired state.
- *CURRENT* displays how many replicas are currently running.

**scale 命令：**
```bash
kubectl scale deployments/kubernetes-bootcamp --replicas=4
```

## Update App: Performing a Rolling Update

> Rolling updates allow Deployments' update to take place with zero downtime by incrementally updating Pods instances with new ones.

By default, the maximum number of Pods that can be unavailable during the update and the maximum number of new Pods that can be created, is one. Both options can be configured to either numbers or percentages (of Pods).

In Kubernetes, updates are versioned and any Deployment update can be reverted to a previous (stable) version.

> If a Deployment is exposed publicly, the Service will load-balance the traffic only to available Pods during the update.

```bash
kubectl set image deploy/my-deploy c1=image1:tag c2=image2:tag
 
# Roll back 撤销本次升级
kubectl rollout undo deployments/kubernetes-bootcamp
```

# Configuration

ConfigMap是一个API object，用来存储non-confidential（非机密的）的key-value数据。

Pods可以把ConfigMap用作环境变量、命令行参数、配置文件（先mount 到 volume）。

A ConfigMap allows you to 解耦 **decouple environment-specific configuration from your container images**, so that your applications are easily portable.

## Updating Configuration via a ConfigMap

### Update configuration via a ConfigMap mounted as a Volume

```bash
# Use the kubectl create configmap command to create a ConfigMap from literal values:
kubectl create configmap sport --from-literal=sport=football
 
# 在pod中mount，然后使用
            - while true; do echo "$(date) My preferred sport is $(cat /etc/config/sport)";
 
      volumes:
        - name: config-volume
          configMap:
            name: sport
```

Edit the ConfigMap:
```bash
kubectl edit configmap sport
```

修改后，会自动更新

When you have a ConfigMap that is mapped into a running Pod using either a configMap volume or a projected volume, and you update that ConfigMap, the running Pod sees the update almost immediately.
However, your application only sees the change if it is written to either poll for changes, or watch for file updates.

An application that loads its configuration once at startup will not notice a change.

### Update environment variables of a Pod via a ConfigMap
```yaml
...
spec:
...
    spec:
      containers:
        - name: alpine
          image: alpine:3
          env:
            - name: FRUITS
              valueFrom:
                configMapKeyRef:
                  key: fruits
                  name: fruits
...
```

> [!caution] 
> 注意：在ConfigMap中修改对应的vlaue，在正在运行的Pod中不会改变。在Pod中运行的process不会感知到data的改变。需要replace现存的pods。但是新创建的pod会感知到这个改变，比如扩容新的pod但是不rollout，会出现新旧data混合出现的情况。

You can trigger that replacement. Perform a rollout for the Deployment, using `kubectl rollout`:
```bash
# Trigger the rollout
kubectl rollout restart deployment configmap-env-var
# Wait for the rollout to complete
kubectl rollout status deployment configmap-env-var --watch=true
```

### Update configuration via an immutable ConfigMap that is mounted as a volume 

Immutable ConfigMaps are especially used for configuration that is constant and is not expected to change over time. Marking a ConfigMap as immutable allows a performance improvement where the kubelet does not watch for changes.

If you do need to make a change, you should plan to either:
- change the name of the ConfigMap, and switch to running Pods that reference the new name
- replace all the nodes in your cluster that have previously run a Pod that used the old value
- restart the kubelet on any node where the kubelet previously loaded the old ConfigMap
apiVersion: v1
```yaml
data:
  company_name: "ACME, Inc." # existing fictional company name
kind: ConfigMap
immutable: true
metadata:
  name: company-name-20150801
```

# StatefulSet

StatefulSet is the workload API object used to manage stateful applications.
Manages the deployment and scaling of a set of Pods, and provides guarantees about the ordering and uniqueness of these Pods.

和Deployment类似，StatefulSet管理的Pods都是基于同一个container spec构建的；但是和Deployment不同，这些Pod是不可交换的 interchangeable：each has a persistent identifier that it maintains across any rescheduling.

## Creating a StatefulSet

创建一个StatefulSet，要先创建一个[Headless Service](https://kubernetes.io/docs/concepts/services-networking/service/#headless-services)（为了给每个 Pod 提供稳定、可预测、可寻址的网络身份（DNS 名字），而不是一个的负载均衡入口）
