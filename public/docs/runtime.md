# Runtime Execution Engine

## Executive Summary

The UHCR Runtime System is the execution engine that manages system memory, thread allocation, compilation caching, and performance diagnostics. This document covers the memory pool structure, the work-stealing scheduler, multi-tier caching, system health monitoring, and adaptive resource management. These runtime components ensure safe, low-overhead native execution of JIT-compiled workloads on various platforms.

## Table of Contents

- [Memory Management & Alignment](#/docs/runtime#memory-management--alignment)
- [Thread Scheduling & Affinities](#/docs/runtime#thread-scheduling--affinities)
- [Multi-Tier Function Caching](#/docs/runtime#multi-tier-function-caching)
- [Performance Monitoring & Profiling](#/docs/runtime#performance-monitoring--profiling)
- [Dynamic Resource Allocation](#/docs/runtime#dynamic-resource-allocation)
- [Error Handling & Failure Recovery](#/docs/runtime#error-handling--failure-recovery)
- [Best Practices](#/docs/runtime#best-practices)
- [Troubleshooting](#/docs/runtime#troubleshooting)

---

## Memory Management & Alignment

To execute vector instructions (such as AVX2 or AVX512), memory buffers must be aligned to 64-byte boundaries. Standard Python allocations do not guarantee this, so UHCR utilizes a custom memory subsystem.

### Aligned Memory Allocation
The `MemoryPool` manages pre-allocated `AlignedBuffer` blocks, avoiding system allocation overhead during runtime hot paths.

```python
import uhcr
from uhcr.storage.memory_pool import MemoryPool

# Initialize a 2GB memory pool with 64-byte SIMD alignment
pool = MemoryPool(size="2GB", alignment=64)

# Acquire an aligned memory block
buffer = pool.allocate(1024 * 1024)  # 1MB buffer
print(f"Allocated Address: {hex(buffer.address)}")
print(f"SIMD Confirmed: {buffer.address % 64 == 0}")

# Map directly to NumPy arrays with zero copy
import numpy as np
aligned_array = np.frombuffer(buffer, dtype=np.float32)
```

---

## Thread Scheduling & Affinities

To maximize CPU utilization and prevent thread migration overhead, UHCR implements a custom work-stealing task scheduler.

### Work-Stealing Task Scheduler
The thread scheduler balances CPU cores by allowing idle worker threads to pull tasks from other queues.

```python
from uhcr.runtime.scheduler import Scheduler

# Instantiates a scheduler bound to detected system cores
scheduler = Scheduler()

# Define parallel workload
def compute_chunk(start, end):
    accumulator = 0
    for i in range(start, end):
        accumulator += i * i
    return accumulator

# Run parallel execution path
results = scheduler.parallel_for(
    start=0,
    end=100000,
    func=compute_chunk,
    chunk_size=10000
)
print(f"Parallel Sum: {sum(results)}")
```

### Core Pinning & NUMA Affinities
To prevent cache invalidation, threads can be pinned to specific physical cores or NUMA nodes:

```python
# Pin scheduler worker threads to physical CPU cores
scheduler.set_thread_affinity({
    0: [0, 1],  # Worker Thread 0 -> Cores 0 & 1
    1: [2, 3],  # Worker Thread 1 -> Cores 2 & 3
})

# Bind scheduler process to a specific NUMA node
numa_scheduler = Scheduler(numa_aware=True)
numa_scheduler.bind_to_numa_node(0)
```

---

## Multi-Tier Function Caching

UHCR caches compiled machine binaries to avoid recompiling hot paths. It uses a three-tier cache architecture:

```
[ JIT Call ] 
     │
     ├── L1 Cache (Hot RAM - Local process) ──► [Hit: Run Native]
     │
     └── L2 Cache (Warm RAM - Shared Redis) ──► [Hit: Load & Run]
     │
     └── L3 Cache (Cold Disk - Persistent)  ──► [Hit: Decompress & Run]
     │
     └── [Miss: Trigger Compiler]
```

### Caching Implementation
```python
import uhcr
from uhcr.storage.persistent_cache import PersistentCache

# Configure persistent cache parameters
cache = PersistentCache(
    cache_dir="~/.uhcr/cache",
    max_size="1GB",
    compression=True
)

uhcr.config.set('cache.persistent', True)
uhcr.config.set('cache.directory', cache.cache_dir)

# Decorated functions persist signatures across restarts
@uhcr.jit(persistent_cache=True)
def heavy_compute(data):
    return sum(x ** 2 for x in data)
```

---

## Performance Monitoring & Profiling

UHCR collects execution metrics and tracks compilation times.

```python
from uhcr.runtime.profiler import RuntimeProfiler

profiler = RuntimeProfiler()
profiler.enable()

@uhcr.jit(profile=True)
def matrix_op(n):
    # Perform math
    return [x * 2.0 for x in range(n)]

matrix_op(50000)

metrics = profiler.get_metrics('matrix_op')
print(f"JIT Compile Time: {metrics['compile_time']:.3f}ms")
print(f"Native Execution Time: {metrics['execute_time']:.3f}ms")
print(f"Measured Speedup vs. Interpreter: {metrics['speedup']:.2f}x")
```

---

## Dynamic Resource Allocation

UHCR monitors CPU and GPU load to dynamically scale thread and memory allocations.

```python
from uhcr.runtime.resources import CPUResourceManager, GPUResourceManager

cpu_mgr = CPUResourceManager()
cpu_mgr.set_limits(max_threads=8, cpu_percent=80.0)

if GPUResourceManager.available():
    gpu_mgr = GPUResourceManager()
    gpu_mgr.set_memory_limit(0.8)  # Limit allocation to 80% VRAM
```

---

## Error Handling & Failure Recovery

If compilation or hardware limits are breached, the runtime automatically falls back to safe execution modes.

```python
from uhcr.runtime.errors import RuntimeErrorHandler

class SystemErrorHandler(RuntimeErrorHandler):
    def handle_error(self, error, context):
        # Log failure reason
        self.logger.warning(f"Native execution failed: {error}. Falling back.")
        # Re-route to standard Python interpreter
        return self._fallback_to_python(context)

# Bind error handler to runtime
uhcr.set_error_handler(SystemErrorHandler())
```

---

## Best Practices

1. **Verify Alignments**: Ensure numpy arrays imported via `frombuffer` are created from aligned memory addresses to prevent bus errors on strict architectures.
2. **Match Thread Counts to Cores**: Do not allocate more threads than physical CPU cores to avoid context-switching overhead.
3. **Configure TTL for Remote Caches**: When using Redis caching, set a Time-To-Live (TTL) to prevent cache memory growth.

---

## Troubleshooting

### Memory Fragmentation
*Symptoms*: Allocations fail even when total free space is sufficient.  
*Solution*: Trigger a garbage collection pass: `uhcr.gc.collect()`, or pre-allocate larger buffers.

### Core Pinning Failures
*Symptoms*: Thread affinity errors.  
*Solution*: Verify the user account has appropriate permissions to modify process affinities. On Linux, this may require `CAP_SYS_NICE`.

---

## Related Documentation

- [Runtime Architecture Overview](#/docs/architecture)
- [Storage and Caching](#/docs/storage)
- [Performance Tuning and Benchmarks](#/docs/benchmarks)
- [Hardware Support Matrix](#/docs/hardware-reference)

## Next Steps

Continue with:

- Previous: [Runtime Architecture Overview](#/docs/architecture)
- Home: [Documentation Home](#/)
- Next: [Storage and Caching](#/docs/storage)