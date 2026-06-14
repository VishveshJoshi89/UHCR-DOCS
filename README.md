# UHCR: Universal Hardware-Aware Compute Runtime

A high-performance Python framework for hardware-optimized computation, feature-rich JIT compilation, and execution across x86_64, AArch64, RISC-V, and CUDA accelerators.

<p align="left">
  <a href="https://uhcrdocs-one.vercel.app/"><img src="https://img.shields.io/badge/docs-Live%20Site-6C3FC5" alt="Docs"></a>
  <a href="https://github.com/VishveshJoshi89/UHCR-DOCS/actions"><img src="https://github.com/VishveshJoshi89/UHCR-DOCS/actions/workflows/ci.yml/badge.svg?branch=uhcr_docs_v1" alt="CI"></a>
  <img src="https://img.shields.io/badge/python-3.10%2B-3776AB" alt="Python 3.10+">
  <img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="License: Apache-2.0">
  <img src="https://img.shields.io/badge/react-19-61DAFB" alt="React 19">
  <img src="https://img.shields.io/badge/vite-8-646CFF" alt="Vite 8">
  <img src="https://img.shields.io/badge/deployed%20on-Vercel-000000" alt="Vercel">
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

## Documentation Site

The documentation site is built with **React 19 + Vite 8 + TypeScript** and deployed on **Vercel**.

🌐 **Live:** [https://uhcrdocs-one.vercel.app/](https://uhcrdocs-one.vercel.app/)

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 |
| Bundler | Vite 8 |
| Language | TypeScript 6 |
| Markdown | react-markdown + remark-gfm |
| Routing | react-router-dom v7 |
| Search | Built-in SearchBar (Ctrl+K) |
| Deployment | Vercel |

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

- [Documentation Portal](https://uhcrdocs-one.vercel.app/)
- [Quick Start Guide](https://uhcrdocs-one.vercel.app/docs/quickstart)
- [JIT Compilation Guide](https://uhcrdocs-one.vercel.app/docs/jit-guide)
- [Architecture Overview](https://uhcrdocs-one.vercel.app/docs/architecture)
- [Security & Safety Manual](https://uhcrdocs-one.vercel.app/docs/safety)
- [Plugin System Reference](https://uhcrdocs-one.vercel.app/docs/plugins)
- [API Reference](https://uhcrdocs-one.vercel.app/docs/api-reference)
- [Benchmarks](https://uhcrdocs-one.vercel.app/docs/benchmarks)

---

## Development (Docs Site)

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Lint
npm run lint

# Build for production
npm run build
```

---

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the Apache-2.0 License - see the [LICENSE](LICENSE) file for details.
