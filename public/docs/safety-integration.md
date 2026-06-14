# Safety Integration

## Executive Summary

The C++ native safety monitor is integrated directly into the critical execution and compilation hooks of the Universal Hardware-Aware Compute Runtime (UHCR). By intercepting routines in the JIT compiler, the IR builder, the memory manager, and backend engines, the safety subsystem blocks execution before instructions reach hardware. This document details the exact files and methods modified to support safety checks, provides transaction call flows, and defines performance overhead profiles.

## Table of Contents

- [Integration Point Reference](#/docs/safety-integration#integration-point-reference)
- [Control Flow Sequence Diagrams](#/docs/safety-integration#control-flow-sequence-diagrams)
- [Safety Validation Matrix](#/docs/safety-integration#safety-validation-matrix)
- [Performance & Latency Overhead](#/docs/safety-integration#performance--latency-overhead)
- [Runtime Verification & Testing](#/docs/safety-integration#runtime-verification-testing)
- [Best Practices](#/docs/safety-integration#best-practices)
- [Troubleshooting](#/docs/safety-integration#troubleshooting)

---

## Integration Point Reference

### 1. Runtime Compiler Interface
- **Path**: [`uhcr/runtime/runtime.py`](file:///c:/Users/dell/source/repos/VishveshJoshi89/UHCR/uhcr/runtime/runtime.py) (Function: `UHCRRuntime.compile`)
- **Action**: Intercepts JIT entry, verifying CPU/GPU thermal limits before initiating AST parsing or lowering.

### 2. Executable Memory Manager
- **Path**: [`uhcr/compiler/x86_64/executable_memory.py`](file:///c:/Users/dell/source/repos/VishveshJoshi89/UHCR/uhcr/compiler/x86_64/executable_memory.py) (Functions: `ExecutableMemory.__init__`, `ExecutableMemory.write`)
- **Action**: Validates size allocations prior to calling OS allocation APIs (`VirtualAlloc`/`mmap`), and runs bounds verification before write operations.

### 3. Hardware Feature Detection
- **Path**: [`uhcr/hardware/cpuid.py`](file:///c:/Users/dell/source/repos/VishveshJoshi89/UHCR/uhcr/hardware/cpuid.py) (Function: `_allocate_executable_memory`)
- **Action**: Blocks CPUID instruction execution if the CPU is overheating, preventing thermal spikes on fragile hardware.

### 4. GPU Compiler Backend
- **Path**: [`uhcr/backends/cuda_backend.py`](file:///c:/Users/dell/source/repos/VishveshJoshi89/UHCR/uhcr/backends/cuda_backend.py) (Functions: `CUDABackend.compile`, `cuda_runner`)
- **Action**: Monitors GPU temperatures before kernel launch and terminates kernels exceeding execution timeouts.

### 5. Vector CPU Compiler Backend
- **Path**: [`uhcr/backends/cpu_avx2.py`](file:///c:/Users/dell/source/repos/VishveshJoshi89/UHCR/uhcr/backends/cpu_avx2.py) (Function: `CPUAVX2Backend.compile`)
- **Action**: Verifies that compiler processes have sufficient thermal headroom prior to emitting complex vector loops.

### 6. Compiler Optimization Passes
- **Path**: [`uhcr/compiler/passes/pipeline.py`](file:///c:/Users/dell/source/repos/VishveshJoshi89/UHCR/uhcr/compiler/passes/pipeline.py) (Function: `OptimizationPipeline.run`)
- **Action**: Starts a watchdog timer to stop infinite loops during dead-code elimination and constant folding phases.

### 7. Aligned Memory Pool
- **Path**: [`uhcr/storage/memory_pool.py`](file:///c:/Users/dell/source/repos/VishveshJoshi89/UHCR/uhcr/storage/memory_pool.py) (Function: `MemoryPool.allocate`)
- **Action**: Halts allocation tasks if system RAM consumption would cross safety parameters.

### 8. Intermediate Representation Builder
- **Path**: [`uhcr/compiler/ir_builder.py`](file:///c:/Users/dell/source/repos/VishveshJoshi89/UHCR/uhcr/compiler/ir_builder.py) (Function: `IRBuilder._emit`)
- **Action**: Evaluates temperature before appending heavy vector opcodes (e.g. `VADD`, `VFMADD`) and stops if emergency flag is raised.

### 9. IR Function Structure
- **Path**: [`uhcr/compiler/ir.py`](file:///c:/Users/dell/source/repos/VishveshJoshi89/UHCR/uhcr/compiler/ir.py) (Function: `Function.create_block`)
- **Action**: Restricts graph complexity (>1000 blocks) during thermal limit alerts.

---

## Control Flow Sequence Diagrams

### Successful Compilation Sequence

```
User App         UHCRRuntime       SafetyMonitor      CodeGenerator      ExecMemory
   │                  │                  │                  │                 │
   │── compile() ────>│                  │                  │                 │
   │                  │── check_temp() ─>│                  │                 │
   │                  │<─── [OK] ────────│                  │                 │
   │                  │                  │                  │                 │
   │                  │── compile_bytes ───────────────────>│                 │
   │                  │                  │                  │                 │
   │                  │<─── [Bytes] ────────────────────────│                 │
   │                  │                  │                  │                 │
   │                  │── allocate_mem() ────────────────────────────────────>│
   │                  │                  │── validate() ───>│                 │
   │                  │                  │<─── [OK] ────────│                 │
   │                  │<── [Ready] ───────────────────────────────────────────│
   │                  │                  │                  │                 │
```

### Aborted JIT Sequence (Thermal Threshold Exceeded)

```
User App         UHCRRuntime       SafetyMonitor      CodeGenerator
   │                  │                  │                  │
   │── compile() ────>│                  │                  │
   │                  │── check_temp() ─>│                  │
   │                  │<── [Hot: 92°C] ──│                  │
   │                  │                  │                  │
   │<── Raise Exception ─────────────────│                  │
   │    "CPU Temp Limit Exceeded"        │                  │
```

---

## Safety Validation Matrix

| Subsystem Location | Guard Call | Target Threat |
| :--- | :--- | :--- |
| **Compilation Phase** | `check_cpu_temperature` | Prevent compiler stress on hot silicon |
| **Vector IR Building** | `check_cpu_temperature` | Stop SIMD compilation during overheating |
| **Block Appending** | `check_cpu_temperature` | Cap function complexity size |
| **CPUID Execution** | `check_cpu_temperature` | Prevent assembly lockups |
| **Memory Allocation** | `validate_memory` | Block stack exhaustions |
| **Memory Write** | `validate_memory(write=True)` | Block buffer overflows |
| **CUDA Kernel Launch**| `check_gpu_temperature` | Stop GPU thermal damage |
| **Optimization Passes**| `check_timeout` | Terminate infinite compiler loops |

---

## Performance & Latency Overhead

The safety hooks introduce negligible latency when compared to compilation steps:

| Guard Point | Telemetry Method | Overhead Cost | Frequency |
| :--- | :--- | :--- | :--- |
| **Emergency Flag** | Memory check | ~5 ns | Per operation |
| **Memory Bounds** | Boundary checking | ~20 ns | Per allocation |
| **IR Builder Emission**| Opcode parsing | ~50 ns | Per instruction |
| **CPUID Run** | IO check | ~50 ns | Per request |
| **Thermal Telemetry** | OS sysfs polling | ~1 µs | Per compile (cached) |

---

## Runtime Verification & Testing

Verify that safety gates function correctly by setting low threshold values:

```python
from uhcr.native import get_safety_monitor
import uhcr

monitor = get_safety_monitor()

# 1. Test CPU Thermal Trip
monitor.set_max_cpu_temp(35) # Artificially low ceiling
try:
    @uhcr.jit(eager=True)
    def thermal_test(a, b): return a + b
except RuntimeError as e:
    print(f"Gate Verified: {e}")

# 2. Test Emergency Shutdown Block
monitor.emergency_stop()
try:
    @uhcr.jit(eager=True)
    def stop_test(a, b): return a + b
except RuntimeError as e:
    print(f"Emergency Gate Verified: {e}")
```

---

## Best Practices

1. **Test Compile Paths**: Ensure your unit tests verify behavior in fallback mode by running with `UHCR_DISABLE_SAFETY=1` in sandboxed test instances.
2. **Handle Exceptions**: Wrap `@uhcr.jit` compile calls in `try/except RuntimeError` blocks to allow applications to fail gracefully under thermal limits.
3. **Use Watchdog Limits**: Set optimization timeouts (`check_timeout`) to match system speeds, adjusting upward on embedded AArch64/RISC-V devices.

---

## Troubleshooting

### Exception: "CPU too hot for vector operation vadd"
*Cause*: Active workload has pushed CPU temperatures past the default thermal threshold (85°C) during IR construction.  
*Solution*: Verify system cooling, reduce concurrent worker threads using the CLI `--workers` flag, or configure a higher limit if safe.

### Segfault in ExecutableMemory.write
*Cause*: Custom backend compiler attempted to write bytes outside the allocated memory address space.  
*Solution*: Review register offsets in the backend compiler assembly generator to ensure code layout remains within target allocations.

---

## Related Documentation

- [Security & Safety Overview](#/docs/safety)
- [IR Safety Verification Summary](#/docs/ir-safety-summary)
- [Hardware Protection Scheme Checklist](#/docs/hardware-protection)
- [JIT Compilation Guide](#/docs/jit-guide)

## Next Steps

- Previous: [Security & Safety Overview](#/docs/safety)
- Home: [Documentation Home](#/)
- Next: [IR Safety Verification Summary](#/docs/ir-safety-summary)
