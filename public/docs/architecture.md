# Runtime Architecture Overview

## Executive Summary

The Universal Hardware-Aware Compute Runtime (UHCR) is structured as a layered compilation and execution stack. This document details the component hierarchy, subsystem boundaries, inter-module data flows, and technical design trade-offs. By separating front-end syntax tracing from intermediate representation optimization and hardware-specific back-end code generation, UHCR delivers high-performance compute speeds while remaining adaptable to diverse hardware architectures.

## Table of Contents

- [Architectural Layers](#/docs/architecture#architectural-layers)
- [Component Responsibilities](#/docs/architecture#component-responsibilities)
- [Request & Execution Flow](#/docs/architecture#request--execution-flow)
- [Data Flow Diagram](#/docs/architecture#data-flow-diagram)
- [Design Trade-offs](#/docs/architecture#design-trade-offs)
- [Future Considerations](#/docs/architecture#future-considerations)
- [Best Practices](#/docs/architecture#best-practices)
- [Troubleshooting](#/docs/architecture#troubleshooting)

---

## Architectural Layers

The following diagram outlines the structural boundaries of the runtime system:

```
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                    │
│      Python User Script ──► uhcr.tensor() / @uhcr.jit   │
├─────────────────────────────────────────────────────────┤
│                   API & Frontend Layer                  │
│       Tracing Engine (Symbolic execution, types)        │
├─────────────────────────────────────────────────────────┤
│                     Compiler Layer                      │
│   IR Builder ──► Optimizations (DCE, CSE) ──► Selector  │
├─────────────────────────────────────────────────────────┤
│                     Backend Layer                       │
│    x86_64 Assemblies / CUDA PTX / Python Interpreter    │
├─────────────────────────────────────────────────────────┤
│                  Native Runtime Layer                   │
│   Memory Pools ──► Work-Stealing Scheduler ──► Safety    │
└─────────────────────────────────────────────────────────┘
```

---

## Component Responsibilities

The runtime system splits operational requirements across specialized, decoupled modules:

### 1. Frontend & API (`uhcr.api`, `uhcr.frontend`)
- **Interception**: Captures standard Python function declarations via the `@uhcr.jit` decorator.
- **Symbolic Tracing**: Intercepts arithmetic and logical statements, injecting proxy execution tokens to trace data dependencies.
- **Tensor Management**: Formats, aligns, and coordinates user-facing multi-dimensional arrays.

### 2. Intermediate Representation (`uhcr.compiler`)
- **IR Assembly**: Represents computations in an SSA (Static Single Assignment) syntax.
- **Pass Pipeline**: Runs sequential structural transformations to minimize work (e.g. constant folding, dead-code elimination).

### 3. Backend Codegen (`uhcr.backends`)
- **Assemblers**: Compiles abstract IR instructions to target machine codes (AVX2, AVX512, CUDA, AArch64).
- **Fallback Engine**: A pure-Python interpreter that handles unsupported instructions.

### 4. Operations & Storage (`uhcr.storage`, `uhcr.runtime`)
- **Memory Pool**: Manages 64-byte aligned memory blocks to avoid syscall allocation latencies.
- **Task Scheduler**: Controls thread queues and schedules parallel workloads.
- **State Database**: Uses SQLite to record performance histories and job metrics.
- **High-Speed Cache**: Uses Redis to store JIT-compiled binaries.

---

## Request & Execution Flow

To trace a call to `a.matmul(b)` through the system, the execution proceeds as follows:

```
[User App]                       [Compiler]                       [Runtime]
    │                                │                                │
    │ ── 1. Call a.matmul(b) ──────► │                                │
    │                                │ ── 2. Create IR Module ──────► │
    │                                │                                │ ── 3. Check Cache ──┐
    │                                │ ◄── 4. Cache Miss ────────────│ ◄───────────────────┘
    │                                │                                │
    │                                │ ── 5. Select Backend ────────► │
    │                                │                                │ ── 6. Detect CPU/GPU ─┐
    │                                │ ◄── 7. Return Backend ────────│ ◄─────────────────────┘
    │                                │                                │
    │                                │ ── 8. Emit Machine Code ─────► │
    │                                │                                │ ── 9. Alloc Aligned ──┐
    │                                │ ◄── 10. Load Function Pointer ─│ ◄─────────────────────┘
    │                                │                                │
    │ ◄── 11. Run Compiled Binary ───│                                │
```

---

## Design Trade-offs

### 1. JIT-Only vs. Ahead-of-Time (AOT) Compilation
- **Decision**: All machine code generation is deferred to application runtime.
- **Pros**: Enables dynamic system profiling. The runtime can check compiler extensions (e.g. AVX512) and compile using the absolute best assembly.
- **Cons**: The first execution path incurs a latency penalty (compilation warmup).

### 2. Standard Ctypes vs. C Extension Modules
- **Decision**: Python bindings communicate with native C++ safety monitors via `ctypes`.
- **Pros**: Simplifies cross-platform distribution and avoids complex Python-header build dependencies during user package installation.
- **Cons**: Slightly higher overhead during boundary crossings compared to compiled C-API extensions.

---

## Future Considerations

- **ARM64 Native Execution**: Expand target assembler layers to support Apple Silicon and ARM servers natively.
- **Dynamic Compilation Budgets**: Introduce heuristics to budget compilation times against historical execution frequencies.

---

## Best Practices

- **Profile Host Systems**: Run `uhcr.detect()` early in the program initialization phase to verify that hardware paths are resolved correctly.
- **Structure for JIT**: Keep decorated functions focused on compute workloads to allow JIT compilers to perform optimizations.

---

## Troubleshooting

### Incorrect Dispatch
If workloads execute on slow default backends instead of dedicated hardware:
1. Verify target libraries (e.g. CUDA SDK) are present on system paths.
2. Check that user credentials have access to system device profiles.

---

## Related Documentation

- [How UHCR Works](#/docs/how-uhcr-works)
- [Runtime Execution Engine](#/docs/runtime)
- [Storage and Caching](#/docs/storage)
- [API Reference](#/docs/api-reference)

## Next Steps

Continue with:

- Previous: [How UHCR Works](#/docs/how-uhcr-works)
- Home: [Documentation Home](#/)
- Next: [Runtime Execution Engine](#/docs/runtime)
