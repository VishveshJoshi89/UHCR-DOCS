# UHCR: Universal Hardware-Aware Compute Runtime

A high-performance Python framework for hardware-optimized computation, feature-rich JIT compilation, and execution across x86_64, AArch64, RISC-V, and CUDA accelerators.

<p align="left">
  <a href="https://vishveshjoshi89.github.io/UHCR-DOCS/"><img src="https://img.shields.io/badge/docs-GitHub%20Pages-purple" alt="Docs"></a>
  <img src="https://img.shields.io/badge/python-3.10%2B-3776AB" alt="Python 3.10+">
  <img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="License: Apache-2.0">
</p>

---

## Executive Summary

UHCR compiles high-level Python arithmetic and tensor code directly into native instructions. The system dynamically queries CPUID features and GPU topologies to select the highest-priority backend (such as AVX2, AVX-512, or CUDA), applies compiler optimizations (e.g., constant folding, dead-code elimination, and strength reduction), and executes code inside aligned memory structures. A native C++ safety monitor acts as a continuous safety layer to protect systems from thermal runaway and memory corruption.

---

## Core Features

- **Multi-ISA JIT Compiler**: Lower code structures to x86_64, AArch64 (NEON), and RISC-V (RVV 1.0) instructions.
- **Accelerator Support**: Compiles mathematical operations directly to NVIDIA CUDA PTX codes.
- **Hardware-Aware Dispatch**: Probes NUMA, caches, and registers to pin execution to optimal hardware features.
- **C++ Native Safety Guards**: Imposes temperature caps, memory bounds checks, and execution watchdogs.
- **Dynamic Plugin Framework**: Load third-party backends, passes, and kernels via TOML manifests.

---

## Installation

```bash
pip install uhcr
```

To compile with CUDA JIT support:

```bash
pip install uhcr[cuda]
```

---

## Quick Example

```python
import uhcr

# Eager JIT compilation targets the optimal hardware backend automatically
@uhcr.jit(eager=True, verbose=True)
def matrix_accumulate(a, b):
    return (a + b) * 2

result = matrix_accumulate(10, 20)
print(f"Result: {result}")
```

---

## Project Structure

```
uhcr/
├── api/              # High-level Tensor definitions and operators
├── backends/         # Compiler backends (CUDA, AVX-512, AVX2, Fallback CPU)
├── compiler/         # Lowering passes and platform assemblers
├── hardware/         # CPUID/GPU feature detection logic
├── native/           # C++ Safety Monitor source and bindings
├── network/          # Distributed coordinator and HTTP/gRPC server
└── storage/          # Memory pools, Redis cache, SQLite database
```

---

## Related Documentation

For detailed information, please refer to the following documentation sections:

- [Documentation Portal](https://vishveshjoshi89.github.io/UHCR-DOCS/)
- [Installation Guide](https://vishveshjoshi89.github.io/UHCR-DOCS/#/docs/installation)
- [JIT Compilation Guide](https://vishveshjoshi89.github.io/UHCR-DOCS/#/docs/jit-guide)
- [Security & Safety Manual](https://vishveshjoshi89.github.io/UHCR-DOCS/#/docs/safety)
- [Plugin System Reference](https://vishveshjoshi89.github.io/UHCR-DOCS/#/docs/plugins)

---

## License

This project is licensed under the Apache-2.0 License - see the [LICENSE](LICENSE) file for details.
