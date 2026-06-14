# Hardware Protection

## Executive Summary

To guarantee system stability when executing low-level assembly compiled on-the-fly, the Universal Hardware-Aware Compute Runtime (UHCR) relies on a structured seven-layer hardware protection scheme. This document serves as the implementation checklist and verification guide detailing these protection boundaries, their critical necessity, emergency stop triggers, and configuration parameters.

## Table of Contents

- [The Seven Protection Layers](#/docs/hardware-protection#the-seven-protection-layers)
- [Safety Guarantees & Attack Vectors](#/docs/hardware-protection#safety-guarantees--attack-vectors)
- [Emergency Stop Recovery](#/docs/hardware-protection#emergency-stop-recovery)
- [Configuration Scenarios](#/docs/hardware-protection#configuration-scenarios)
- [Verification Checklist](#/docs/hardware-protection#verification-checklist)
- [Best Practices](#/docs/hardware-protection#best-practices)
- [Troubleshooting](#/docs/hardware-protection#troubleshooting)

---

## The Seven Protection Layers

```
                               ┌─────────────────────────┐
                        L7     │       Memory Pool       │
                               └────────────┬────────────┘
                               ┌────────────▼────────────┐
                        L6     │   Optimization Pipeline │
                               └────────────┬────────────┘
                               ┌────────────▼────────────┐
                        L5     │    AVX2 / CUDA Backend  │
                               └────────────┬────────────┘
                               ┌────────────▼────────────┐
                        L4     │     UHCRRuntime JIT     │
                               └────────────┬────────────┘
                               ┌────────────▼────────────┐
                        L3     │    Executable Memory    │
                               └────────────┬────────────┘
                               ┌────────────▼────────────┐
                        L2     │    CPUID Instruction    │
                               └────────────┬────────────┘
                               ┌────────────▼────────────┐
                        L1     │   C++ Native Monitor    │
                               └─────────────────────────┘
```

### Layer 1: C++ Native Monitor (`uhcr/native/`)
Provides real-time thermal telemetry, memory boundary enforcement, and thread control via a high-performance C++ shared library.

### Layer 2: Hardware Probing Safeguards
- **File**: [`uhcr/hardware/cpuid.py`](file:///c:/Users/dell/source/repos/VishveshJoshi89/UHCR/uhcr/hardware/cpuid.py)
- **Validation**: CPU temperature checks and emergency flag checks before executing low-level assembler blocks.

### Layer 3: Executable Memory Shielding
- **File**: [`uhcr/compiler/x86_64/executable_memory.py`](file:///c:/Users/dell/source/repos/VishveshJoshi89/UHCR/uhcr/compiler/x86_64/executable_memory.py)
- **Validation**: Strict boundary limits during memory allocation, and read/write permission locks prior to buffer writes.

### Layer 4: JIT Compilation Entry Gate
- **File**: [`uhcr/runtime/runtime.py`](file:///c:/Users/dell/source/repos/VishveshJoshi89/UHCR/uhcr/runtime/runtime.py)
- **Validation**: Validates CPU/GPU thermal limits before initiating parser token execution.

### Layer 5: Target Backend Controls
- **File**: [`uhcr/backends/cuda_backend.py`](file:///c:/Users/dell/source/repos/VishveshJoshi89/UHCR/uhcr/backends/cuda_backend.py) & [`cpu_avx2.py`](file:///c:/Users/dell/source/repos/VishveshJoshi89/UHCR/uhcr/backends/cpu_avx2.py)
- **Validation**: Checks VRAM usage, sets execution watchdogs, and restricts vector compilation on hot CPUs.

### Layer 6: Optimization Pipeline Timeout Watchdog
- **File**: [`uhcr/compiler/passes/pipeline.py`](file:///c:/Users/dell/source/repos/VishveshJoshi89/UHCR/uhcr/compiler/passes/pipeline.py)
- **Validation**: Interrupts execution loops exceeding the configured timeout window (default: 30s).

### Layer 7: Memory Pool Allocation Limit
- **File**: [`uhcr/storage/memory_pool.py`](file:///c:/Users/dell/source/repos/VishveshJoshi89/UHCR/uhcr/storage/memory_pool.py)
- **Validation**: Enforces strict allocation caps (default: 16GB) to prevent out-of-memory crashes.

---

## Safety Guarantees & Attack Vectors

| Attack / Fault Vector | Protection Mechanism | Mitigation Action |
| :--- | :--- | :--- |
| **Thermal Runaway** | Live CPU polling | Aborts JIT compilation if temperature >= 85°C |
| **GPU Overheating** | Live GPU junction polling | Blocks CUDA kernel launch if temperature >= 80°C |
| **Memory Corruption** | Bounds checking | Prevents assembly execution on invalid pointers |
| **Buffer Overflow** | Size validation before writing | Aborts memory copy actions exceeding boundaries |
| **Infinite Compilation Loop** | Timer iteration validation | Terminates compilation pass after 30 seconds |
| **Out-Of-Memory Crash** | Memory pool bounds | Rejects allocations exceeding 16GB allocation limit |

---

## Emergency Stop Recovery

If temperature boundaries are violated (e.g. CPU >95°C or GPU >90°C), the system enters emergency stop:

```python
from uhcr.native import get_safety_monitor

monitor = get_safety_monitor()
if monitor.is_emergency_stopped():
    print(f"Emergency stop status: {monitor.get_last_error()}")
    # Recovery requires physical cooling and process restart
```

---

## Configuration Scenarios

Choose limits based on target server capabilities:

```python
# 1. Conservative (Recommended for Production)
monitor.set_max_cpu_temp(85)
monitor.set_max_gpu_temp(80)
monitor.set_max_memory(16 * 1024**3)

# 2. Performance (Water-cooled systems)
monitor.set_max_cpu_temp(90)
monitor.set_max_gpu_temp(85)
monitor.set_max_memory(32 * 1024**3)

# 3. Secure (Datacenters/High-density servers)
monitor.set_max_cpu_temp(75)
monitor.set_max_gpu_temp(70)
monitor.set_max_memory(8 * 1024**3)
```

---

## Verification Checklist

Use this checklist during system staging:

- [x] C++ safety library compiled successfully.
- [x] Python `ctypes` bindings loaded without warnings.
- [x] Core JIT compiler hooks active.
- [x] CPUID access gates verified under thermal load.
- [x] Executable memory allocation boundaries validated.
- [x] CUDA compilation and execution limits working.
- [x] AVX2 vector execution thermal threshold active.
- [x] Optimization pipeline timeouts active.
- [x] Memory pool thresholds enforced.
- [x] Emergency stop triggers verified.

---

## Best Practices

1. **Verify Binary Loading**: Ensure the fallback warning is not triggered in production environments.
2. **Synchronize Thermal Limits**: Match the safety limits in `config.toml` with the physical characteristics of your hardware chassis.
3. **Isolate Worker Nodes**: Run worker processes with unique memory pool boundaries to ensure a single worker crash does not impact other nodes.

---

## Troubleshooting

### Error: "High Risk of Hardware Damage - Fallback Active"
*Cause*: The native compiled binary (`safety_monitor.so`/`.dll`) cannot be found or is not compatible with the current OS architecture.  
*Solution*: Recompile the library on the target machine using `python uhcr/native/build_native.py`.

### Memory Pool Rejects Standard Allocations
*Cause*: The default 16GB memory cap is set too low for the input data arrays, or memory leaks are preventing buffer recycling.  
*Solution*: Wrap allocations in `with` contexts or call `monitor.set_max_memory` to allocate additional memory space.

---

## Related Documentation

- [Security & Safety Overview](#/docs/safety)
- [Safety Integration Hook Guide](#/docs/safety-integration)
- [IR Safety Verification Summary](#/docs/ir-safety-summary)
- [CLI Reference](#/docs/cli)

## Next Steps

- Previous: [IR Safety Verification Summary](#/docs/ir-safety-summary)
- Home: [Documentation Home](#/)
- Next: [Contributing Guide](#/docs/contributing)
