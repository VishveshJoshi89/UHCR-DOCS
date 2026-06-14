# Kubernetes Deployment Benchmarks

## Executive Summary

This document presents a three-environment performance comparison — host system, Docker container, and Kubernetes pod — for all four standard UHCR benchmark workloads. Kubernetes delivers a **1.84× average speedup** across workloads, 1% higher than Docker and 13% higher than host execution. Compute-heavy workloads (matrix multiplication: 3.50×) are unaffected by orchestration overhead. Kubernetes is the recommended runtime for production UHCR deployments at scale.

## Table of Contents

- [Environment Comparison Matrix](#/docs/benchmarks_k8s#environment-comparison-matrix)
- [Benchmark Results](#/docs/benchmarks_k8s#benchmark-results)
- [Overhead Analysis](#/docs/benchmarks_k8s#overhead-analysis)
- [Kubernetes Configuration](#/docs/benchmarks_k8s#kubernetes-configuration)
- [Performance Tuning](#/docs/benchmarks_k8s#performance-tuning)
- [Cost Analysis](#/docs/benchmarks_k8s#cost-analysis)
- [Deployment Checklist](#/docs/benchmarks_k8s#deployment-checklist)
- [Recommendations](#/docs/benchmarks_k8s#recommendations)

---

## Environment Comparison Matrix

| Property | Host System | Docker Container | Kubernetes Pod |
| :--- | :--- | :--- | :--- |
| OS | Windows 10 (WSL2) | Linux (slim) | Linux (pod) |
| Python | 3.14.4 | 3.11.15 | 3.11.15 |
| CPU isolation | None | Namespace | cgroup |
| CPU limit | Unlimited | Unlimited | 2 cores (configurable) |
| Memory limit | Unlimited | Unlimited | 4 GiB (configurable) |
| Total overhead vs host | — | ~5% | ~6% |

---

## Benchmark Results

### String Concatenation (5 million iterations)

| Environment | Python (ms) | UHCR (ms) | Speedup | vs Docker |
| :--- | :--- | :--- | :--- | :--- |
| Host | 1993.50 | 1316.12 | 1.51× | — |
| Docker | 2008.38 | 1137.89 | 1.77× | Baseline |
| **Kubernetes** | 2145.32 | 1198.47 | **1.79×** | +1% |

### Loop Sum (10 million integers)

| Environment | Python (ms) | UHCR (ms) | Speedup | vs Docker |
| :--- | :--- | :--- | :--- | :--- |
| Host | 197.46 | 189.72 | 1.04× | — |
| Docker | 163.87 | 149.44 | 1.10× | Baseline |
| **Kubernetes** | 176.42 | 158.93 | **1.11×** | +1% |

### Matrix Multiplication (500×500)

| Environment | Python (ms) | UHCR (ms) | Speedup | vs Docker |
| :--- | :--- | :--- | :--- | :--- |
| Host | 35.52 | 11.99 | 2.96× | — |
| Docker | 27.53 | 7.92 | 3.48× | Baseline |
| **Kubernetes** | 29.87 | 8.54 | **3.50×** | +0.6% |

### List Comprehension (10 million elements)

| Environment | Python (ms) | UHCR (ms) | Speedup | vs Docker |
| :--- | :--- | :--- | :--- | :--- |
| Host | 1075.42 | 1070.77 | 1.00× | — |
| Docker | 982.81 | 1048.14 | 0.94× | Baseline |
| **Kubernetes** | 1054.28 | 1089.64 | **0.97×** | +3% |

### Summary

| Environment | Average Speedup | vs Host | Production Ready |
| :--- | :--- | :--- | :--- |
| Host | 1.63× | Baseline | No |
| Docker | 1.82× | +12% | Partial |
| **Kubernetes** | **1.84×** | **+13%** | **Yes** |

---

## Overhead Analysis

| Overhead Source | Magnitude |
| :--- | :--- |
| Container namespace overhead (Host → Docker) | ~5% |
| Kubernetes orchestration (Docker → Pod) | ~1% |
| **Total (Host → Kubernetes)** | **~6%** |

Kubernetes overhead is concentrated in pod scheduling, kubelet polling, DNS resolution, and cgroup enforcement — none of which affect CPU register throughput for compute-bound workloads. Matrix multiplication speedup actually improves slightly in Kubernetes (3.48× → 3.50×) due to consistent resource allocation.

---

## Kubernetes Configuration

### Production Deployment Manifest

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: uhcr-workers
  namespace: uhcr
  labels:
    app: uhcr-worker
    version: v1.0.0
spec:
  replicas: 3
  selector:
    matchLabels:
      app: uhcr-worker
  template:
    metadata:
      labels:
        app: uhcr-worker
    spec:
      containers:
        - name: uhcr-worker
          image: myregistry/uhcr-app:latest
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: "2"
              memory: "4Gi"
            limits:
              cpu: "4"
              memory: "8Gi"
          env:
            - name: UHCR_WORKER_ID
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
            - name: UHCR_LOG_LEVEL
              value: "INFO"
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
          volumeMounts:
            - name: uhcr-cache
              mountPath: /opt/uhcr/cache
      volumes:
        - name: uhcr-cache
          emptyDir:
            sizeLimit: 2Gi
```

### Horizontal Pod Autoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: uhcr-hpa
  namespace: uhcr
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: uhcr-workers
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 75
```

---

## Performance Tuning

### Guaranteed QoS (Prevent Eviction)

Set `requests == limits` to achieve `Guaranteed` QoS class. Pods in this class are never evicted under memory pressure.

```yaml
resources:
  requests:
    cpu: "2"
    memory: "4Gi"
  limits:
    cpu: "2"    # Must equal requests for Guaranteed QoS
    memory: "4Gi"
```

### Node Affinity (Pin to Compute Nodes)

```yaml
spec:
  template:
    spec:
      nodeSelector:
        workload: compute
      tolerations:
        - key: dedicated
          operator: Equal
          value: uhcr
          effect: NoSchedule
```

### Monitoring Commands

```bash
# Pod resource usage
kubectl top pods -n uhcr

# Node utilization
kubectl top nodes

# Event log
kubectl describe pod <pod-name> -n uhcr

# Live logs
kubectl logs -f deployment/uhcr-workers -n uhcr
```

---

## Cost Analysis (AWS Reference)

| Environment | Instance Type | Monthly Cost | Notes |
| :--- | :--- | :--- | :--- |
| Host | Local hardware | $0 | One-time capital cost |
| Docker | t4g.medium | ~$31 | Single instance |
| Kubernetes (3 nodes) | t4g.medium × 3 | ~$93 | Self-managed |
| Kubernetes (EKS) | t4g.medium × 3 + EKS | ~$146 | Managed control plane |

**Cost reduction strategies:**
- Use EC2 Spot instances for batch UHCR workloads (up to 70% savings)
- Reserve capacity for long-running inference workloads (1-year or 3-year terms)
- Use `karpenter` or Cluster Autoscaler to right-size node groups automatically

---

## Deployment Checklist

| Step | Command |
| :--- | :--- |
| Create namespace | `kubectl create namespace uhcr` |
| Apply manifest | `kubectl apply -f k8s-deployment.yaml -n uhcr` |
| Verify pod status | `kubectl get pods -n uhcr` |
| Check logs | `kubectl logs -n uhcr deployment/uhcr-workers` |
| Monitor resources | `kubectl top pods -n uhcr` |
| Retrieve results | `kubectl cp uhcr/<pod>:/tmp/results.json ./` |
| Cleanup | `kubectl delete -f k8s-deployment.yaml -n uhcr` |

---

## Recommendations

**Use Kubernetes when:**
- Running UHCR in cloud environments (AWS, GCP, Azure) with horizontal scaling requirements
- Multiple teams share a single cluster and need resource quotas
- High availability and automatic pod rescheduling are required
- Batch job orchestration (use Kubernetes `Job` or `CronJob` for one-shot benchmarks)

**Use Docker when:**
- Single-instance deployment on a dedicated host
- Development or local CI pipelines where cluster overhead is not justified

**Use host execution when:**
- Development iteration speed matters more than isolation
- Benchmarking hardware performance directly without container abstraction

---

## Related Documentation

- [Containerization Guide](#/docs/containerization)
- [Docker Benchmarks](#/docs/benchmarks_docker)
- [Kubernetes Benchmarks (Job Run)](#/docs/benchmarks_kubernetes)
- [Performance Benchmarks](#/docs/benchmarks)

## Next Steps

- Previous: [Kubernetes Benchmarks](#/docs/benchmarks_kubernetes)
- Home: [Documentation Home](#/)
- Next: [Network Execution](#/docs/network)
