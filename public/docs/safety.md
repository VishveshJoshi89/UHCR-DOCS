# Security & Safety

## Executive Summary

The Universal Hardware-Aware Compute Runtime (UHCR) incorporates a C++ native safety monitor designed to protect host systems from thermal damage, memory corruption, power overloads, and execution lockups during low-level compilation and execution. Operating at a latency overhead under 1%, this safety layer monitors system temperature telemetry and enforces configured resource allocation boundaries. This document outlines features, compilation guidelines, and configuration options.

## Table of Contents

- [Core Protection Layers](#/docs/safety#core-protection-layers)
- [Configuration Reference](#/docs/safety#configuration-reference)
- [Emergency Stop Protocol](#/docs/safety#emergency-stop-protocol)
- [Compilation and Build Pipeline](#/docs/safety#compilation-and-build-pipeline)
- [Platform Support Matrix](#/docs/safety#platform-support-matrix)
- [Operational Guarantees](#/docs/safety#operational-guarantees)
- [Fallback Mode Behavior](#/docs/safety#fallback-mode-behavior)
- [Best Practices](#/docs/safety#best-practices)
- [Troubleshooting](#/docs/safety#troubleshooting)

---

## Core Protection Layers

### Thermal Protection
- **CPU Thermal Tracking**: Continuous polling of processor cores; triggers automatic aborts when exceeding configured limits (default: 85°C).
- **GPU Thermal Tracking**: Monitors VRAM and GPU core junctions; suspends execution paths if the GPU exceeds thresholds (default: 80°C) to prevent throttling and hardware degradation.

### Memory Safety
- **Bounds Checking**: Intercepts JIT memory writes/reads to detect and block buffer overflows at a micro-operation level.
- **Resource Constraints**: Enforces heap allocation limits (default: 16GB) and VRAM limits (default: 8GB) to prevent address space exhaustion and system crashes.
- **Null-Pointer Detection**: Employs virtual guard pages to capture null and out-of-bounds pointers.

### Execution Safeguards
- **Watchdog Timers**: Enforces execution timeouts (default: 5 minutes) to terminate infinite loops in custom JIT kernels.
- **Thread Limit Pinning**: Limits concurrent worker threads (default: 256) to prevent thread explosion.

### Power Management
- **Power Cap Enforcement**: Caps total power draw to prevent electrical circuit trips on high-draw acceleration boards.

---

## Configuration Reference

### Python API Usage

```python
import uhcr
from uhcr.native import get_safety_monitor

# Retrieve safety daemon singleton
monitor = get_safety_monitor()

# Configure threshold limits
monitor.set_max_cpu_temp(85)            # Celsius
monitor.set_max_gpu_temp(80)            # Celsius
monitor.set_max_memory(16 * 1024**3)    # 16GB Limit

# Enable active monitoring checks
monitor.enable()

# Query diagnostic metrics
cpu_temp  = monitor.get_cpu_temperature()
gpu_temp  = monitor.get_gpu_temperature()
mem_usage = monitor.get_memory_usage()

print(f"Diagnostics - CPU: {cpu_temp}°C | GPU: {gpu_temp}°C | Memory: {mem_usage / 1024**3:.2f}GB")
```

### Environment Variables

| Variable | Description | Default |
| :--- | :--- | :--- |
| `UHCR_MAX_CPU_TEMP` | CPU core shutdown temperature in Celsius | `85` |
| `UHCR_MAX_GPU_TEMP` | GPU core shutdown temperature in Celsius | `80` |
| `UHCR_MAX_MEMORY` | Maximum memory pool size in bytes | `17179869184` (16GB) |
| `UHCR_DISABLE_SAFETY` | Disable safety monitoring completely (highly discouraged) | `0` (Enabled) |

---

## Emergency Stop Protocol

When critical thermal or power thresholds are crossed, UHCR invokes the emergency stop protocol:

```python
monitor = get_safety_monitor()

if monitor.is_emergency_stopped():
    print("EMERGENCY SHUTDOWN TRIGGERED!")
    print(f"Error Code: {monitor.get_last_error()}")
    # Runtime blocks all execution; requires temperature drop to reset
```

---

## Compilation and Build Pipeline

The safety monitor is a C++17 library loaded dynamically via `ctypes`.

### Prerequisites
- C++17 compliant compiler (`MSVC` on Windows, `GCC`/`Clang` on Linux/macOS)
- CMake 3.15+ (optional)
- Python 3.10+

### Build Targets

#### Automated Script
```bash
python uhcr/native/build_native.py
```

#### Manual Build (Linux / macOS)
```bash
g++ -std=c++17 -O2 -shared -fPIC safety_monitor.cpp -o safety_monitor.so -pthread
```

#### Manual Build (Windows MSVC)
```bash
cl /EHsc /std:c++17 /O2 /LD safety_monitor.cpp /link /OUT:safety_monitor.dll psapi.lib
```

---

## Platform Support Matrix

| OS Platform | Thermal Telemetry | Memory Guarding | Thread Control |
| :--- | :--- | :--- | :--- |
| **Windows** | Fully Supported (WMI API) | Fully Supported | Fully Supported |
| **Linux** | Fully Supported (sysfs) | Fully Supported | Fully Supported |
| **macOS** | Limited | Fully Supported | Fully Supported |

---

## Operational Guarantees

With the native monitor compiled and active, UHCR guarantees:
- **Zero Thermal Failure**: Automatically halts tasks before hitting CPU/GPU hardware trip points.
- **Paranoid Buffer Checking**: Detects memory out-of-bound errors before assembly execution.
- **No Thread Starvation**: Caps thread allocation to prevent thread leaks from locking the host OS.

---

## Fallback Mode Behavior

If the native C++ library cannot be compiled or loaded:

```
⚠️ WARNING: Native safety monitor not found. Running without hardware protection.
   Run 'python uhcr/native/build_native.py' to compile the safety layer.
```

> [!WARNING]
> In fallback mode, thermal protection is disabled, memory checks rely entirely on Python boundaries, and execution timeouts are not enforced. Fallback mode is **not recommended** for production deployments.

---

## Best Practices

1. **Keep Safety Active in Production**: Never disable the safety monitor in cluster environments where untrusted user code is compiled.
2. **Profile Thermal Characteristics**: Run benchmarks on host machines to establish baseline temperatures under load, and set safety thresholds accordingly.
3. **Use Aligned Buffers**: Leverage `AlignedBuffer` structures to prevent segmentation faults when passing data to compiled JIT segments.

---

## Troubleshooting

### Error: "Native safety monitor not found"
*Cause*: The `safety_monitor` dynamic library (`.so`/`.dll`) has not been compiled or is missing from the search path.  
*Solution*: Run `python uhcr/native/build_native.py` and ensure a compiler is accessible on your path.

### CPU Temperature Always Reports -1
*Cause*: Missing administrator/root privileges or unsupported hardware platform (e.g., virtual machines with hidden thermal interfaces).  
*Solution*: Ensure the user has permission to read WMI values (Windows) or sysfs nodes (Linux).

---

## Related Documentation

- [Safety Integration Hook Guide](#/docs/safety-integration)
- [IR Safety Verification Summary](#/docs/ir-safety-summary)
- [Hardware Protection Scheme Checklist](#/docs/hardware-protection)
- [CLI Reference](#/docs/cli)

## Next Steps

- Previous: [Performance Tuning](#/docs/benchmarks)
- Home: [Documentation Home](#/)
- Next: [Safety Integration Hook Guide](#/docs/safety-integration)
