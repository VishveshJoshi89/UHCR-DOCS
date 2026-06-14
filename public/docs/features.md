# Feature Overview

## Executive Summary

This page provides a concise technical summary of every major UHCR capability. Each feature links to the corresponding in-depth documentation. Use this page as a navigable catalog when assessing fitness for a specific use case or when orienting new contributors.

---

## JIT Compilation

UHCR traces Python arithmetic functions and compiles them to native machine code through a multi-stage pipeline: trace → IR build → optimization → backend selection → native execution.

```python
import uhcr

@uhcr.jit(eager=True)
def compute(a, b):
    return (a + b) * 2

result = compute(10, 11)  # Native execution: 42
```

**Key Properties:**

| Property | Detail |
| :--- | :--- |
| Warm-up | 3 calls in lazy mode; 1 call with `eager=True` |
| Type inference | Inferred from first compilation call |
| Cache key | `(function_name, arg_types, backend_name)` |
| Fallback | Transparent Python execution for unsupported constructs |

**Reference:** [JIT Compilation Guide](#/docs/jit-guide)

---

## Hardware Detection

`uhcr.detect()` probes CPU CPUID, cache topology, memory, and GPU capabilities and returns a structured `HardwareProfile`.

```python
profile = uhcr.detect()

print(profile.cpu.brand)          # "Intel Core i7-10700K"
print(profile.cpu.features)       # ["avx2", "avx512f", "fma", ...]
print(profile.cache.l3_size_kb)   # 16384
print(profile.gpu.cuda_available) # True
```

**Detected Subsystems:**

- CPU: vendor, core count, thread count, ISA feature flags (SSE4.2, AVX2, AVX-512, FMA)
- Cache: L1/L2/L3 sizes and line widths
- Memory: total size, type (DDR4/DDR5)
- GPU: device name, CUDA / Vulkan / ROCm / Metal availability
- NUMA topology

**Reference:** [Hardware Detection](#/docs/hardware-reference)

---

## Adaptive Backend Selection

The runtime evaluates all registered backends against the `HardwareProfile` and dispatches to the highest-priority supported backend automatically.

| Backend | Priority | Requirement | Dispatch Condition |
| :--- | :--- | :--- | :--- |
| `cuda-ptx` | 15 | NVIDIA GPU + CUDA ≥ 11.0 | `profile.gpu.cuda_available` |
| `cpu-avx512` | 10 | AVX-512F CPU flag | `"avx512f" in profile.cpu.features` |
| `cpu-avx2` | 5 | AVX2 CPU flag | `"avx2" in profile.cpu.features` |
| `cpu-generic` | 1 | Any x86_64 | Always true |

**Reference:** [Architecture](#/docs/architecture)

---

## Optimization Pipeline

Every compiled IR module passes through four deterministic optimization passes before code generation.

| Pass | Transform |
| :--- | :--- |
| Constant folding | Evaluates constant sub-expressions at compile time |
| Dead code elimination | Removes instructions with no consumers |
| Strength reduction | Replaces `x * 1 → x`, `x + 0 → x`, `x * 0 → 0`, `x - x → 0` |
| Common subexpression elimination | Deduplicates identical computations |

**Before and after example (constant folding + DCE):**

```
; Before
%0 = add i64 3, 5
%1 = mul i64 %0, 2
%2 = mul i64 %arg0, 10    ; unused
ret %1

; After
ret i64 16
```

**Reference:** [How UHCR Works](#/docs/how-uhcr-works)

---

## Multi-ISA Code Generation

A single IR module can be lowered to native code for x86_64, AArch64, or RISC-V without modification.

| Target | SIMD | Calling Convention | Native Execution |
| :--- | :--- | :--- | :--- |
| x86_64 | AVX2 / AVX-512 | Win64 + SysV AMD64 | Yes |
| AArch64 | NEON 128-bit | AAPCS64 | On ARM64 hosts |
| RISC-V | RVV 1.0 (scalable) | LP64D | On RISC-V hosts |

**Reference:** [Multi-ISA Support](#/docs/multi-isa)

---

## Tensor API

`uhcr.Tensor` provides N-dimensional arrays with hardware-aligned memory and automatic backend dispatch.

```python
import uhcr

a = uhcr.tensor([[1.0, 2.0], [3.0, 4.0]])
b = uhcr.tensor([[5.0, 6.0], [7.0, 8.0]])

c = a.matmul(b)      # Dispatched to CUDA or AVX2
d = a + b            # Element-wise add
numpy_arr = c.to_numpy()
```

**Properties:**

- N-dimensional with 64-byte aligned buffers
- Zero-copy NumPy interop via `.to_numpy()`
- Type safety: `F32`, `F64`, `I64`

**Reference:** [Storage and Tensor System](#/docs/storage)

---

## Storage System

UHCR includes three composable storage backends for caching, persistence, and pre-allocation.

| Component | Class | Purpose |
| :--- | :--- | :--- |
| Memory Pool | `MemoryPool` | Pre-allocated aligned buffers; zero allocation in hot loops |
| Redis Cache | `RedisCache` | Distributed compiled-kernel cache; TTL-controlled |
| SQLite Store | `SQLiteStore` | Durable execution history and performance metrics |

**Reference:** [Storage and Tensor System](#/docs/storage)

---

## Plugin System

The plugin API allows third-party code to register custom backends, kernels, and optimization passes without modifying core runtime files.

```
my_plugin/
├── plugin.toml   # Manifest
├── __init__.py
└── main.py       # Subclass of uhcr.plugins.base.Plugin
```

```python
from uhcr.plugins.base import Plugin

class MyPlugin(Plugin):
    @property
    def name(self): return "my-plugin"

    def initialize(self, runtime):
        self.register_kernel("fast_relu", lambda data: [max(0.0, x) for x in data])
```

**Extension Points:**

- Custom backends (`register_backend`)
- Custom compute kernels (`register_kernel`)
- Custom IR optimization passes (`register_pass`)

**Reference:** [Plugin Development Guide](#/docs/plugin-guide) · [Plugin System Reference](#/docs/plugins)

---

## Safety Monitor

A native C++ safety monitor (integrated via `ctypes`) checks thermal and memory conditions at three critical compilation checkpoints.

| Checkpoint | Trigger |
| :--- | :--- |
| IR emission (`_emit()`) | Before every IR instruction is appended |
| Compilation entry | Before backend code generation starts |
| Kernel launch | Before native code is dispatched for execution |

**Reference:** [Safety Integration](#/docs/safety-integration) · [Hardware Protection](#/docs/hardware-protection)

---

## Distributed / Network Execution

UHCR can distribute compute jobs across multiple nodes using either synchronous or asynchronous protocols.

**Reference:** [Network Execution](#/docs/network)

---

## Docker and Kubernetes Deployment

UHCR ships production-ready Docker images and Kubernetes manifests.

| Artifact | Purpose |
| :--- | :--- |
| `Dockerfile` | CPU-only image |
| `Dockerfile.cuda` | CUDA-enabled GPU image |
| `k8s/deployment.yaml` | Kubernetes Deployment with resource limits |
| `k8s/hpa.yaml` | Horizontal Pod Autoscaler |

**Reference:** [Containerization Guide](#/docs/containerization) · [Kubernetes Benchmarks](#/docs/benchmarks_kubernetes)

---

## Performance Numbers

Measured on Intel i7-10700K + NVIDIA RTX 3070:

| Operation | Python | UHCR (AVX2) | UHCR (CUDA) | Peak Speedup |
| :--- | :--- | :--- | :--- | :--- |
| Vector Add (1M elements) | 45 ms | 2.1 ms | 0.3 ms | 150× |
| Matrix Multiply (512×512) | 890 ms | 18 ms | 3.2 ms | 278× |
| Element-wise ops (1M) | 120 ms | 4.5 ms | 0.8 ms | 150× |

**Reference:** [Benchmarks](#/docs/benchmarks)

---

## Platform Support

| OS | Architectures | Status |
| :--- | :--- | :--- |
| Linux | x86_64, AArch64 | Fully supported |
| macOS | x86_64, Apple Silicon (M1/M2/M3) | Fully supported |
| Windows | x86_64 | Fully supported (MSVC + MinGW) |

---

## Related Documentation

- [Quick Start](#/docs/quickstart)
- [Architecture Overview](#/docs/architecture)
- [API Reference](#/docs/api-reference)
- [Contributing](#/docs/contributing)

## Next Steps

- Previous: [Multi-ISA Support](#/docs/multi-isa)
- Home: [Documentation Home](#/)
- Next: [Development Guides Index](#/docs/guides)
