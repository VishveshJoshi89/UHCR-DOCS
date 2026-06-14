# Distributed Networking

## Executive Summary

The UHCR Network Subsystem (`uhcr.network`) facilitates high-performance distributed task execution across heterogeneous compute clusters. It provides a hybrid communication protocol consisting of gRPC for low-latency, high-throughput model execution/metrics streaming, and REST (HTTP) for configuration management, health telemetry, and standard integration. A hardware-aware coordinator assigns tasks to worker nodes based on their specialized capabilities (e.g., AVX2, AVX-512, CUDA) and tracks job state transition phases.

## Table of Contents

- [Architectural Design](#/docs/network#architectural-design)
- [Protocol Server Coordinator](#/docs/network#protocol-server-coordinator)
- [REST API Endpoints](#/docs/network#rest-api-endpoints)
- [gRPC Service Definition](#/docs/network#grpc-service-definition)
- [Job Lifecycle Manager](#/docs/network#job-lifecycle-manager)
- [Coordinator Node Routing](#/docs/network#coordinator-node-routing)
- [Worker Node Daemon](#/docs/network#worker-node-daemon)
- [Health Monitoring & Diagnostics](#/docs/network#health-monitoring--diagnostics)
- [Telemetry & Metrics Collection](#/docs/network#telemetry--metrics-collection)
- [Best Practices](#/docs/network#best-practices)
- [Limitations](#/docs/network#limitations)
- [Troubleshooting](#/docs/network#troubleshooting)

---

## Architectural Design

The network architecture operates on a coordinator-worker topology. The client application submits jobs to the coordinator, which analyzes the hardware requirements and routes the job to the most appropriate worker.

```
┌─────────────────────────────────────────────────────────┐
│                   Client Application                    │
│              uhcr.submit(), uhcr.status()               │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
    ┌───▼────────┐          ┌────▼──────┐
    │ REST API   │          │ gRPC      │
    │ (HTTP)     │          │ Service   │
    └───┬────────┘          └────┬──────┘
        │                        │
        └────────────┬───────────┘
                     │
        ┌────────────▼────────────┐
        │  Protocol Server        │
        │  (Coordinator)          │
        └────────────┬────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
    ┌───▼──────────┐      ┌──────▼────┐
    │ Worker Node  │      │ Worker    │
    │ (Hardware A) │      │ Node      │
    │              │      │ (Hardware │
    │ Job Manager  │      │ B)        │
    │ Executor     │      │           │
    └──────────────┘      └───────────┘
```

---

## Protocol Server Coordinator

The central daemon `ProtocolServer` listens on both gRPC and HTTP ports, orchestrating communication pools and thread allocation.

```python
from uhcr.network.protocol_server import ProtocolServer

server = ProtocolServer(
    grpc_port=50051,
    rest_port=8080,
    max_workers=10
)
server.start()
```

### Key Capabilities
- **Dual-stack binding**: Serves gRPC and HTTP API concurrently.
- **Graceful shutdown**: Integrates connection draining (`grace_period` default: 30s) to allow ongoing jobs to complete.
- **Worker Registry**: Tracks active workers, their network addresses, and hardware capabilities.

---

## REST API Endpoints

The HTTP REST API is utilized for administration, health check inspection, and client integration with third-party tools.

### Endpoint Matrix

| Method | Path | Description | Input Schema | Response Schema |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/jobs` | Submit remote execution job | `{"code": str, "args": list, "hardware_hint": str}` | `{"job_id": str, "status": "queued"}` |
| `GET` | `/api/v1/jobs/{id}` | Query execution status & results | None | `{"job_id": str, "status": str, "result": any}` |
| `GET` | `/api/v1/jobs` | List active and historical jobs | None | `{"jobs": list}` |
| `DELETE` | `/api/v1/jobs/{id}` | Abort/Cancel running job | None | `{"job_id": str, "status": "cancelled"}` |
| `GET` | `/api/v1/metrics` | Retrieve Prometheus-formatted telemetry | None | Telemetry raw text |
| `GET` | `/api/v1/health` | Liveness check | None | `{"status": "healthy", "uptime": int}` |

---

## gRPC Service Definition

For high-throughput JIT execution and zero-copy metric streaming, the system employs gRPC over HTTP/2.

```protobuf
syntax = "proto3";

package uhcr.network;

service UHCRService {
  rpc SubmitJob(JobRequest) returns (JobResponse);
  rpc GetJobStatus(StatusRequest) returns (StatusResponse);
  rpc CancelJob(CancelRequest) returns (CancelResponse);
  rpc StreamMetrics(MetricsRequest) returns (stream MetricsFrame);
  rpc RegisterWorker(WorkerRegisterRequest) returns (WorkerRegisterResponse);
}
```

```python
from uhcr.network.grpc_service import UHCRServicer

class UHCRImpl(UHCRServicer):
    def SubmitJob(self, request, context):
        # Implementation for JIT compile and dispatch over gRPC
        pass
```

---

## Job Lifecycle Manager

The `JobManager` governs the asynchronous queue, task scheduling, and state persistence.

```python
from uhcr.network.job_manager import JobManager

manager = JobManager()
job_id = manager.submit_job(
    code="def compute(a, b): return a + b", 
    args=[10, 20], 
    hardware_hint="avx2"
)
status = manager.get_status(job_id)
result = manager.get_result(job_id)
```

### State Transition Diagram

```
[queued] ──> [running] ──> [completed]
   │             │
   │             ├──> [failed] (execution error)
   │             │
   └─────────────┴──> [cancelled] (aborted by user/timeout)
```

---

## Coordinator Node Routing

The `CoordinatorNode` handles load-balancing and schedules computations onto optimal workers based on hardware profiles.

```python
from uhcr.network.coordinator import CoordinatorNode

coordinator = CoordinatorNode(
    listen_addr='0.0.0.0',
    listen_port=50051
)
# Workers register themselves with their capabilities profile
coordinator.register_worker(worker_profile)
```

### Dispatch Logic
1. **Target Filtering**: Compares job's `hardware_hint` against worker `HardwareProfile` features.
2. **Workload Pinning**: Selects the worker with the lowest active thread utilization.
3. **Failover**: If a worker fails to respond within the heartbeat window, the job is re-queued and routed to an alternative target.

---

## Worker Node Daemon

Workers run as daemon processes on compute hosts, registering with the central coordinator and running jobs locally.

```python
from uhcr.network.worker import WorkerNode

worker = WorkerNode(
    coordinator_addr='coordinator-host:50051',
    num_threads=8
)
worker.start()
```

Each worker reports its local memory pool availability and CPU execution limits to the coordinator every 5 seconds.

---

## Health Monitoring & Diagnostics

Liveness and readiness checks verify cluster health.

```python
from uhcr.network.health_check import HealthChecker

checker = HealthChecker()
is_alive = checker.is_alive("worker-host:50051")
is_ready = checker.is_ready("worker-host:50051")
```

- **Liveness check**: Fast TCP-ping confirming the server is listening.
- **Readiness check**: Validates worker local thread pool saturation and memory pool reserves.

---

## Telemetry & Metrics Collection

Metrics are collected asynchronously to prevent logging overhead from impacting execution performance.

```python
from uhcr.network.metrics_collector import MetricsCollector

collector = MetricsCollector()
collector.record_job_metrics(
    job_id="job_abc123",
    duration=0.045, # seconds
    memory=45.2,    # MB
    throughput=22.2 # jobs/sec
)
stats = collector.get_aggregate_stats()
```

---

## Best Practices

1. **Prefer gRPC for hot loops**: Avoid utilizing REST endpoints for sub-millisecond computations; the HTTP serialization overhead degrades throughput.
2. **Configure KeepAlives**: In multi-subnet cloud deployments, configure gRPC keep-alive pings to prevent firewalls from dropping idle worker connections.
3. **Isolate local cache directory per worker**: Workers must not share a cached JIT assembly directory over NFS to avoid race conditions during file locks.
4. **Set Memory Limits**: Ensure `UHCR_MEMORY_LIMIT` environment variable is configured below the container container limits to prevent out-of-memory worker restarts.

---

## Limitations

- **No Shared Memory Across Hosts**: Remotely executed JIT functions cannot access shared memory segments (`SharedMemory` structures) or files on the coordinator host.
- **Data Serialization Overhead**: Large inputs (e.g., >100MB tensors) sent over HTTP or gRPC degrade speedup margins due to serialization/deserialization times.

---

## Troubleshooting

### Worker Disconnects Regularly
*Symptom*: Coordinator logs show workers frequently drop and re-register.  
*Cause*: Missing gRPC keep-alive configuration or high CPU saturation causing workers to miss heartbeat intervals.  
*Solution*: Increase heartbeat timeout limit via `UHCR_WORKER_TIMEOUT` or adjust worker CPU quota.

### Serialization Failure
*Symptom*: Remote job fails with `SerializationError`.  
*Cause*: Attempting to pass non-serializable objects (like open file handles, database connections, or unmapped classes) to remote JIT functions.  
*Solution*: Restructure functions to take primitive types or `uhcr.Tensor` payloads.

---

## Related Documentation

- [Runtime Architecture](#/docs/architecture)
- [Storage and Caching](#/docs/storage)
- [CLI Reference](#/docs/cli)
- [Kubernetes Deployment](#/docs/benchmarks-kubernetes)

## Next Steps

- Previous: [Kubernetes Benchmarks](#/docs/benchmarks-k8s)
- Home: [Documentation Home](#/)
- Next: [API Reference](#/docs/api-reference)
