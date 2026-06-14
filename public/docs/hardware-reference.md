# Hardware Detection Engine

## Executive Summary

The Universal Hardware-Aware Compute Runtime (UHCR) uses a runtime hardware detection engine to build a detailed `HardwareProfile` of the system. This profile determines backend selection, SIMD vectorization, memory alignments, and thread affinities. This document details the capabilities structures, instruction feature flags, cache hierarchy discovery, GPU runtime detection, and programmatic APIs.

## Table of Contents

- [Engine Architecture](#/docs/hardware-reference#engine-architecture)
- [Memory Capabilities](#/docs/hardware-reference#memory-capabilities)
- [CPU Capabilities & Features](#/docs/hardware-reference#cpu-capabilities--features)
- [CPUID Cache Line Detection](#/docs/hardware-reference#cpuid-cache-line-detection)
- [GPU Capabilities & Driver Runtimes](#/docs/hardware-reference#gpu-capabilities--driver-runtimes)
- [Programmatic API Examples](#/docs/hardware-reference#programmatic-api-examples)
- [Best Practices](#/docs/hardware-reference#best-practices)
- [Limitations](#/docs/hardware-reference#limitations)
- [Troubleshooting](#/docs/hardware-reference#troubleshooting)

---

## Engine Architecture

The hardware detection engine probes system parameters when `uhcr.detect()` is first called, caching the results for the lifetime of the process.

```
                         ┌──────────────────────┐
                         │    uhcr.detect()     │
                         └──────────┬───────────┘
          ┌─────────────────────────┼─────────────────────────┐
          ▼                         ▼                         ▼
   ┌──────────────┐          ┌──────────────┐          ┌──────────────┐
   │  CPU Prober  │          │  RAM Prober  │          │  GPU Prober  │
   │ (CPUID Leaf) │          │ (OS Sysfs)   │          │ (Driver API) │
   └──────────────┘          └──────────────┘          └──────────────┘
```

---

## Memory Capabilities

The memory prober queries system memory specs, including size, available memory, speed, and DDR generation.

- **Component**: `uhcr.hardware.memory_detect.detect_memory()`

| Attribute | Data Type | Default | Operational Description |
| :--- | :--- | :--- | :--- |
| `total_bytes` | `int` | `0` | Total physical system memory (RAM). |
| `available_bytes` | `int` | `0` | Unused, allocatable memory capacity. |
| `numa_nodes` | `int` | `1` | Number of NUMA memory nodes. |
| `page_size` | `int` | `4096` | Memory page size (bytes). |
| `speed_mhz` | `int` | `0` | Memory bus speed (MHz). |
| `memory_type` | `str` | `"Unknown"` | Memory generation (e.g. DDR3, DDR4, DDR5). |

---

## CPU Capabilities & Features

The CPU prober queries model information, core configurations, and SIMD instruction support.

- **Component**: `uhcr.hardware.cpuid.detect_cpu()`
- **Cache Details**: Populated by `uhcr.hardware.cache_detect.detect_cache()`

| Attribute | Data Type | Default | Operational Description |
| :--- | :--- | :--- | :--- |
| `vendor` | `str` | `"Unknown"` | CPU Vendor ID (e.g. "GenuineIntel", "AuthenticAMD"). |
| `brand` | `str` | `"Unknown"` | Full processor model and frequency string. |
| `cores` | `int` | `1` | Number of physical processing cores. |
| `threads` | `int` | `1` | Number of logical threads (includes hyperthreads). |
| `features` | `List[str]` | `[]` | List of supported SIMD instruction sets. |
| `cache_l1_data_kb` | `int` | `0` | L1 Data Cache capacity (KB). |
| `cache_l2_kb` | `int` | `0` | L2 Cache capacity (KB). |
| `cache_l3_kb` | `int` | `0` | L3 Cache capacity (KB). |

### SIMD Feature Helper Properties
- `has_sse`: Returns `True` if `sse` is supported.
- `has_avx`: Returns `True` if `avx` is supported.
- `has_avx2`: Returns `True` if `avx2` is supported.
- `has_avx512`: Returns `True` if any `avx512` extensions are supported.

---

## CPUID Cache Line Detection

On x86_64 architectures, cache hierarchy is detected using the `CPUID` instruction at leaf `4`. Each subleaf represents a cache level:

- **Line Size (Bytes)**: Read from `EBX[11:0] + 1`
- **Associativity**: Read from `(EBX >> 22) & 0x3FF + 1` (number of ways)
- **Sets**: Read from `ECX + 1`
- **Total Size (Bytes)**: Calculated as `ways * partitions * line_size * sets`

---

## GPU Capabilities & Driver Runtimes

The GPU prober checks for available accelerators and driver environments.

- **Component**: `uhcr.hardware.gpu_detect.detect_gpu()`

| Attribute | Data Type | Default | Operational Description |
| :--- | :--- | :--- | :--- |
| `name` | `str` | `"Unknown"` | GPU model name. |
| `vram_bytes` | `int` | `0` | Total video memory capacity. |
| `driver_version` | `str` | `"Unknown"` | Graphics driver version string. |
| `cuda_available` | `bool` | `False` | True if the CUDA runtime is detected. |
| `cuda_version` | `str` | `"Unknown"` | CUDA runtime version. |

---

## Programmatic API Examples

### Retrieve System Profile
```python
import uhcr

profile = uhcr.detect()

print(f"Processor: {profile.cpu.brand}")
print(f"System RAM: {profile.memory.total_bytes / (1024**3):.1f} GB")
print(f"AVX512 Support: {profile.cpu.has_avx512}")
```

### Capability Fingerprinting
Generate a fingerprint string for system identification:
```python
import uhcr

profile = uhcr.detect()
fingerprint = profile.get_fingerprint()
print(f"Target Fingerprint: {fingerprint}")
# Example: "Linux-AMD64-avx2-cuda_12.2"
```

---

## Best Practices

1. **Verify GPU Availability**: Check `cuda_available` before dispatching large matrix operations to GPU backends.
2. **Configure Affinities for NUMA**: Match thread allocations to the detected `numa_nodes` to optimize memory access.
3. **Respect Memory Limits**: Use the detected `available_bytes` to size memory pools and avoid OOM errors.

---

## Limitations

- **Virtualization Overhead**: Container environments may mask host CPU details. Refer to the Docker guide to ensure feature flags are passed to the container.
- **Elevated Permissions**: Accessing hardware details like memory speeds on Linux typically requires root privileges (to query `dmidecode`).

---

## Troubleshooting

### CPUID Access Denied
```
RuntimeError: Executable memory allocation failed for CPUID probe.
```
*Solution*: The native execution monitor blocks unmapped memory allocations. Ensure Developer Mode is enabled on Windows or run compilation scripts again.

### GPU Not Detected
- Verify the graphics driver is installed.
- Ensure the CUDA library path is in your environment paths (e.g. `LD_LIBRARY_PATH` on Linux).

---

## Related Documentation

- [How UHCR Works](#/docs/how-uhcr-works)
- [Runtime Execution Engine](#/docs/runtime)
- [Storage and Caching](#/docs/storage)
- [API Reference](#/docs/api-reference)

## Next Steps

Continue with:

- Previous: [Storage and Caching](#/docs/storage)
- Home: [Documentation Home](#/)
- Next: [JIT Compilation](#/docs/jit-guide)
