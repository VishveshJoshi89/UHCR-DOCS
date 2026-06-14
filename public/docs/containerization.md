# Containerization Guide

## Executive Summary

UHCR ships production-ready Docker images and Kubernetes manifests. This guide covers CPU and GPU Dockerfile patterns, multi-container `docker-compose` topologies, Kubernetes Deployment and HPA configuration, health check endpoints, and container-specific tuning for hardware detection, memory, and CPU affinity.

## Table of Contents

- [Docker Images](#/docs/containerization#docker-images)
- [Multi-stage Build](#/docs/containerization#multi-stage-build)
- [GPU Support](#/docs/containerization#gpu-support)
- [docker-compose Setup](#/docs/containerization#docker-compose-setup)
- [Kubernetes Deployment](#/docs/containerization#kubernetes-deployment)
- [Health Checks](#/docs/containerization#health-checks)
- [Hardware Detection in Containers](#/docs/containerization#hardware-detection-in-containers)
- [Resource Tuning](#/docs/containerization#resource-tuning)
- [Security](#/docs/containerization#security)
- [Troubleshooting](#/docs/containerization#troubleshooting)

---

## Docker Images

### CPU-only Image

```dockerfile
FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    build-essential \
    libnuma-dev \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONUNBUFFERED=1
ENV UHCR_CACHE_DIR=/opt/uhcr/cache
ENV UHCR_LOG_LEVEL=INFO

RUN mkdir -p /opt/uhcr/cache /app
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8080 9090

CMD ["python", "main.py"]
```

---

## Multi-stage Build

Use a multi-stage build to keep the runtime image small by separating the build-time dependencies.

```dockerfile
# Stage 1: Build
FROM python:3.11 AS builder

RUN pip install --user uhcr numpy

# Stage 2: Runtime
FROM python:3.11-slim

COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

COPY app.py .
CMD ["python", "app.py"]
```

---

## GPU Support

Use the official NVIDIA CUDA base image. Pass `--gpus all` when running the container.

```dockerfile
FROM nvidia/cuda:11.8-devel-ubuntu22.04

RUN pip install uhcr[cuda]

ENV NVIDIA_VISIBLE_DEVICES=all
ENV NVIDIA_DRIVER_CAPABILITIES=compute,utility

COPY app.py .
CMD ["python", "app.py"]
```

**Runtime command:**

```bash
docker run --gpus all myregistry/uhcr-app:cuda-latest
```

---

## docker-compose Setup

### Coordinator-Worker Topology

```yaml
# docker-compose.yml
version: "3.8"
services:
  uhcr-coordinator:
    image: uhcr/coordinator:latest
    ports:
      - "8080:8080"
    environment:
      - UHCR_MODE=coordinator
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis

  uhcr-worker:
    image: uhcr/worker:latest
    deploy:
      replicas: 4
      resources:
        limits:
          cpus: "4.0"
          memory: 8G
        reservations:
          cpus: "2.0"
          memory: 4G
    environment:
      - UHCR_MODE=worker
      - COORDINATOR_URL=http://uhcr-coordinator:8080
      - REDIS_URL=redis://redis:6379
      - UHCR_MAX_THREADS=4
      - UHCR_MEMORY_LIMIT=6G
    volumes:
      - uhcr_cache:/opt/uhcr/cache
    depends_on:
      - uhcr-coordinator
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  uhcr_cache:
```

---

## Kubernetes Deployment

### Deployment Manifest

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: uhcr-workers
  labels:
    app: uhcr-worker
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
              cpu: "2000m"
              memory: "4Gi"
            limits:
              cpu: "4000m"
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
          averageUtilization: 70
```

### Network Policy

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: uhcr-network-policy
spec:
  podSelector:
    matchLabels:
      app: uhcr-worker
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: uhcr-coordinator
      ports:
        - protocol: TCP
          port: 8080
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: redis
      ports:
        - protocol: TCP
          port: 6379
```

---

## Health Checks

Implement `/health` (liveness) and `/ready` (readiness) endpoints using any HTTP framework.

```python
# health.py
from fastapi import FastAPI, Response
import uhcr

app = FastAPI()

@app.get("/health")
def health():
    """Kubernetes liveness probe — returns 200 if UHCR is functional."""
    try:
        @uhcr.jit(eager=True)
        def _probe():
            return 42
        _probe()
        return {"status": "healthy"}
    except Exception as e:
        return Response(content=str(e), status_code=500)

@app.get("/ready")
def ready():
    """Kubernetes readiness probe — returns 200 if UHCR is initialized."""
    try:
        profile = uhcr.detect()
        return {
            "status": "ready",
            "backend": profile.get_optimal_backend(),
        }
    except Exception as e:
        return Response(content=str(e), status_code=503)
```

---

## Hardware Detection in Containers

Containers present a restricted CPU view. Configure UHCR to respect cgroup limits:

```python
import uhcr
import os

def configure_for_container():
    if os.environ.get("KUBERNETES_SERVICE_HOST"):
        uhcr.config.set("backend.prefer_cpu", True)
        uhcr.config.set("memory.pool_size", "512MB")

    profile = uhcr.detect()
    print(f"Detected: {profile.cpu.cores} core(s), "
          f"{profile.memory.total_bytes // (1024**3)} GB RAM")
    return profile

profile = configure_for_container()
```

---

## Resource Tuning

### CPU Affinity

```python
import uhcr, os

cpu_quota = int(os.environ.get("UHCR_CPU_QUOTA", "0"))
if cpu_quota > 0:
    uhcr.config.set("scheduler.cpu_affinity", True)
    uhcr.config.set("scheduler.max_threads", cpu_quota)
```

### Memory Pool

```python
import uhcr, os

memory_limit = os.environ.get("UHCR_MEMORY_LIMIT", "4G")
uhcr.config.set("memory.pool_size", memory_limit)
uhcr.config.set("memory.gc_threshold", 0.8)
uhcr.memory.preallocate()
```

---

## Security

- **Run as non-root**: Add `USER 1000` to your Dockerfile to avoid running as root.
- **Read-only filesystem**: Mount the container root as read-only; use a writable volume only for `/opt/uhcr/cache`.
- **Secrets**: Pass sensitive values (database URLs, API keys) via Kubernetes Secrets mounted as environment variables, not baked into images.
- **TLS between services**: Enable `uhcr.config.set("security.enable_tls", True)` when workers and coordinators communicate over a network.

---

## Troubleshooting

### UHCR Fails to Detect CPU Features
*Cause*: Seccomp or AppArmor profile blocks CPUID.  
*Solution*: Run with `--security-opt seccomp=unconfined` for debugging; in production, allow only the required CPUID syscall in your seccomp profile.

### Out-of-Memory Kills
*Cause*: UHCR memory pool pre-allocation exceeds the container's cgroup memory limit.  
*Solution*: Set `UHCR_MEMORY_LIMIT` to at most 75% of the container memory limit.

### GPU Not Visible
*Cause*: Container started without `--gpus all` or the NVIDIA device plugin is not installed on the node.  
*Solution*: Confirm `nvidia-smi` runs inside the container; install the [NVIDIA device plugin](https://github.com/NVIDIA/k8s-device-plugin) for Kubernetes GPU scheduling.

### High Compilation Latency on Cold Start
*Cause*: JIT warm-up occurs on the first request.  
*Solution*: Run a warm-up call inside the `startup` event handler so pods are hot before the readiness probe passes.

```python
@app.on_event("startup")
async def warmup():
    @uhcr.jit(eager=True)
    def _warmup(a, b): return a + b
    _warmup(1, 2)
```

---

## Related Documentation

- [Network Execution](#/docs/network)
- [Kubernetes Benchmarks](#/docs/benchmarks_kubernetes)
- [Docker Benchmarks](#/docs/benchmarks_docker)
- [Hardware Detection](#/docs/hardware-reference)

## Next Steps

- Previous: [Development Guides](#/docs/guides)
- Home: [Documentation Home](#/)
- Next: [Docker Benchmarks](#/docs/benchmarks_docker)
