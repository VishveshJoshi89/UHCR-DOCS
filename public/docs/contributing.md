# Contributing Guide

## Executive Summary

Thank you for your interest in contributing to the Universal Hardware-Aware Compute Runtime (UHCR). This guide outlines the development setup, project directory structure, coding standards, backend registration procedures, and pull request workflows. Contributors are expected to maintain the target-independent architecture, ensure C++ safety monitor compliance, and adhere to our clean, type-hinted code standards.

## Table of Contents

- [Development Environment Setup](#/docs/contributing#development-environment-setup)
- [Running the Validation Tests](#/docs/contributing#running-the-validation-tests)
- [Repository Structure Mapping](#/docs/contributing#repository-structure-mapping)
- [Implementing a Custom Compiler Backend](#/docs/contributing#implementing-a-custom-compiler-backend)
- [Implementing a New ISA Target](#/docs/contributing#implementing-a-new-isa-target)
- [Coding Guidelines & Style](#/docs/contributing#coding-guidelines--style)
- [Commit Message Protocol](#/docs/contributing#commit-message-protocol)
- [Pull Request Process](#/docs/contributing#pull-request-process)
- [Best Practices](#/docs/contributing#best-practices)

---

## Development Environment Setup

To begin development, clone the repository and install the package in editable mode along with development dependencies:

```bash
git clone https://github.com/VishveshJoshi89/UHCR.git
cd UHCR
pip install -e ".[dev]"
```

---

## Running the Validation Tests

Ensure all regression and integration tests pass before submitting changes:

```bash
python -m pytest tests/ -v
```

To run safety-specific tests (requires the C++ safety monitor to be compiled):

```bash
python uhcr/native/build_native.py
python -m pytest tests/test_ir_safety.py -v
```

---

## Repository Structure Mapping

```
uhcr/
├── api/              # User-facing Tensor structures and math operations
├── backends/         # Compiler backends (CUDA, AVX2, and fallback generic CPU)
├── benchmarks/       # Micro-benchmarks and performance metrics
├── compiler/         # Lowering passes and platform assemblers
│   ├── frontend/     # High-level language parser (Work-in-Progress)
│   ├── x86_64/       # Intel/AMD assembler and machine code generation
│   ├── aarch64/      # ARM64 assembler and machine code generation
│   ├── riscv/        # RISC-V assembler and machine code generation
│   ├── passes/       # Optimization passes (Constant folding, DCE, etc.)
│   ├── ir.py         # Intermediate Representation class definitions
│   └── ir_builder.py # Programmatic IR emission builder
├── containerization/ # Dockerfiles, Kubernetes yaml templates, compose scripts
├── frontend/         # Python system bindings and CLI implementation
├── hardware/         # Capability detection (CPUID flags, GPU info, RAM)
├── network/          # Distributed coordinator and gRPC/REST worker daemon
├── plugins/          # Plugin manager base class and TOML loaders
├── runtime/          # Memory allocators, schedulers, core pinner
├── security/         # Cryptographic module signing and sandboxing (WIP)
└── storage/          # SQLite persistence and Redis caching layers
```

---

## Implementing a Custom Compiler Backend

Follow this workflow to integrate a new execution backend:

1. Create a module file: `uhcr/backends/my_backend.py`.
2. Subclass the base class `Backend` from `uhcr.backends.backend_base`.
3. Implement required properties and methods: `name`, `priority` (see priority ranges), `supports(profile)`, and `compile(ir_function)`.
4. Register the backend in the selector pipeline by importing and appending it within `uhcr/backends/backend_selector.py`.

---

## Implementing a New ISA Target

For adding completely new hardware architectures (e.g., WebAssembly, GPU compute):

1. Create a directory structure: `uhcr/compiler/<isa>/`.
2. Implement instruction encoding inside `assembler.py`.
3. Implement the IR-to-assembly translation inside `codegen.py`.
4. Extend the `HardwareProfile` in `uhcr/hardware/` to detect the ISA.
5. Create a backend wrapper inside `uhcr/backends/` calling your code generator.

---

## Coding Guidelines & Style

- **Type Annotations**: All public modules, methods, and classes must contain Python 3.10+ type hints.
- **Documentation**: Provide clear Sphinx/Google-style docstrings explaining parameters, returns, and safety exceptions.
- **Zero Core Dependencies**: Do not introduce third-party Python packages into the runtime core. Use built-in libraries and `ctypes` wherever possible.
- **Cross-Platform Parity**: Test modifications across Windows, Linux, and macOS platforms.

---

## Commit Message Protocol

We follow the Conventional Commits specification:
- `feat:` Introduces a new feature or backend.
- `fix:` Corrects a bug, resource leak, or compiler fault.
- `docs:` Changes or adds documentation files.
- `refactor:` Restructures logic without changing output results.
- `test:` Adds or modifies unit and integration tests.

---

## Pull Request Process

1. Fork the official repository and create a descriptive branch: `git checkout -b feat/my-custom-backend`.
2. Make your modifications, ensuring you compile and test the native safety layers.
3. Validate coding style checks and run the pytest suite.
4. Submit a Pull Request outlining the changes, performance delta benchmarks, and target hardware platforms tested.

---

## Best Practices

1. **Verify Fallback Behaviors**: When writing tests, confirm that the system handles missing native monitors or missing GPUs gracefully.
2. **Prioritize Vectorization**: When generating assembly instructions, utilize vector width matching (SSE, AVX2, AVX-512) to maximize speedup margins.
3. **Lock memory allocations**: Always clean up dynamic memory allocations (`AlignedBuffer` instances) to prevent long-running daemon worker memory leaks.

---

## Related Documentation

- [Introduction to UHCR](#/docs/introduction)
- [Plugin Development Guide](#/docs/plugin-guide)
- [Security & Safety Overview](#/docs/safety)
- [Integration Status Matrix](#/docs/integration-status)

## Next Steps

- Previous: [Hardware Protection Scheme Checklist](#/docs/hardware-protection)
- Home: [Documentation Home](#/)
- Next: [Integration Status Matrix](#/docs/integration-status)
