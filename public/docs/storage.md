# Storage and Caching Subsystem

## Executive Summary

The UHCR Storage Subsystem (`uhcr.storage`) manages caching, metadata persistence, and memory allocation. It uses a multi-tier storage design, including pre-allocated memory pools, high-speed Redis caches, SQLite database layers, and I/O optimization pipelines. This system ensures fast binary load times, data integrity, and low-latency execution.

## Table of Contents

- [Subsystem Architecture](#/docs/storage#subsystem-architecture)
- [Memory Pool Manager](#/docs/storage#memory-pool-manager)
- [Redis Cache Layer](#/docs/storage#redis-cache-layer)
- [SQLite Persistence Backend](#/docs/storage#sqlite-persistence-backend)
- [I/O Optimizer](#/docs/storage#io-optimizer)
- [Data Integrity & Checksum Verification](#/docs/storage#data-integrity--checksum-verification)
- [Usage Patterns & Code Examples](#/docs/storage#usage-patterns--code-examples)
- [Best Practices](#/docs/storage#best-practices)
- [Troubleshooting](#/docs/storage#troubleshooting)

---

## Subsystem Architecture

The storage subsystem coordinates memory allocations and binary caching through a unified management layer:

```
                  ┌───────────────────────┐
                  │   StorageOptimizer    │
                  └───────────┬───────────┘
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
   │ MemoryPool  │     │ RedisCache  │     │ SQLiteStore │
   │ (Local RAM) │     │ (Shared KV) │     │ (Disk DB)   │
   └─────────────┘     └─────────────┘     └─────────────┘
```

---

## Memory Pool Manager

To avoid memory fragmentation and system allocation latencies during execution, the `MemoryPool` pre-allocates contiguous memory blocks aligned to 64-byte boundaries.

- **Component**: `uhcr/storage/memory_pool.py`
- **Class**: `MemoryPool`
- **Alignment**: 64-byte boundary alignment (SIMD safe).
- **Thread Safety**: Implements reentrant locks (`RLock`) to support parallel allocations.

```python
from uhcr.storage.memory_pool import MemoryPool

# Create pool with 100 buffers of 1MB each
pool = MemoryPool(buffer_size=1024 * 1024, num_buffers=100)

# Acquire a buffer
buf = pool.acquire()
# Write data...
# Release buffer back to the pool
pool.release(buf)
```

---

## Redis Cache Layer

The Redis Cache layer provides a shared cache for JIT-compiled binaries in clustered or multi-process deployments.

- **Component**: `uhcr/storage/redis_cache.py`
- **Class**: `RedisCache`
- **Serialization**: Encodes binary formats using LZ4 and base64.

```python
from uhcr.storage.redis_cache import RedisCache

# Connect to Redis
cache = RedisCache(host='localhost', port=6379, db=0)

# Cache a compiled binary with a 1-hour Time-To-Live (TTL)
cache.set('kernel_hash_avx2', compiled_bytes, ttl=3600)
```

---

## SQLite Persistence Backend

The SQLite persistence backend stores job metadata, execution metrics, and historical runs.

- **Component**: `uhcr/storage/sqlite_backend.py`
- **Class**: `SQLiteStore`
- **Data Schema**: Stores `job_id`, `status`, `duration`, `vram_allocated`, and `timestamp`.

```python
from uhcr.storage.sqlite_backend import SQLiteStore

# Open SQLite database
store = SQLiteStore(db_path='uhcr_jobs.db')

# Record job metadata
store.record_job(
    job_id='job_99824',
    status='completed',
    duration=0.045,  # seconds
    result={'output_shape': (200, 200)}
)
```

---

## I/O Optimizer

The I/O Optimizer uses memory-mapped files and LZ4 compression to speed up disk operations.

- **Component**: `uhcr/storage/io_optimizer.py`
- **Class**: `IOOptimizer`

```python
from uhcr.storage.io_optimizer import IOOptimizer

# Setup optimizer
optimizer = IOOptimizer(batch_size=5000, compression='lz4')

# Write batch data efficiently
optimizer.write_batch(dataset_list, output_file='dataset.bin')

# Read data using memory mapping (zero copy)
data = optimizer.read_mmap('dataset.bin')
```

---

## Data Integrity & Checksum Verification

To prevent execution of corrupted or tampered JIT binaries, the storage layer uses SHA256 checksums to verify files before loading them into memory.

- **Component**: `uhcr/storage/checksum.py`
- **Class**: `ChecksumValidator`

```python
from uhcr.storage.checksum import ChecksumValidator

validator = ChecksumValidator()
checksum = validator.compute(compiled_bytes)

# Verify checksum
assert validator.verify(compiled_bytes, checksum) is True
```

---

## Usage Patterns & Code Examples

### End-to-End JIT Caching Flow
```python
import uhcr
from uhcr.storage.redis_cache import RedisCache
from uhcr.storage.checksum import ChecksumValidator

cache = RedisCache()
validator = ChecksumValidator()

@uhcr.jit
def vector_add(x, y):
    return x + y

# First call compiles and caches the binary
res1 = vector_add(10, 20)

# Second call loads the compiled binary directly from the cache
res2 = vector_add(10, 20)
```

---

## Best Practices

1. **Pre-allocate Pool Size**: Set the memory pool size to accommodate peak workloads, reducing runtime system allocation calls.
2. **Implement Cache TTLs**: Use Time-To-Live (TTL) limits in Redis to manage cache size and prevent memory growth.
3. **Index Database Tables**: Ensure SQLite tables are indexed on query keys (such as `job_id` and `timestamp`) to maintain performance.

---

## Troubleshooting

### Connection Timeouts
```
redis.exceptions.ConnectionError: Error connecting to localhost:6379.
```
*Solution*: Verify the Redis server is running and accessible using `redis-cli ping`.

### Database Locks
```
sqlite3.OperationalError: database is locked
```
*Solution*: SQLite supports limited concurrent write operations. Increase the timeout limit or switch to a WAL (Write-Ahead Log) mode:
```sql
PRAGMA journal_mode=WAL;
```

---

## Related Documentation

- [Runtime Architecture Overview](#/docs/architecture)
- [Runtime Execution Engine](#/docs/runtime)
- [Distributed Networking](#/docs/network)
- [Performance Tuning and Benchmarks](#/docs/benchmarks)

## Next Steps

Continue with:

- Previous: [Runtime Execution Engine](#/docs/runtime)
- Home: [Documentation Home](#/)
- Next: [Hardware Reference](#/docs/hardware-reference)
