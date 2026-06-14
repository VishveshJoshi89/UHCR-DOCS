# Performance Tuning

## Executive Summary

This document presents performance metrics comparing native Python, UHCR with built-in backends, and UHCR with custom ISA plugins. Measurements were captured on an Intel Core i7-7600U CPU using large workloads to amortize JIT compilation overhead. The results indicate that UHCR is highly effective for compute-bound workloads, such as matrix multiplication (yielding a **2.96x speedup**), while memory-bound operations like list comprehensions run at parity with native Python.

## Table of Contents

- [Execution Modes](#/docs/benchmarks#execution-modes)
- [System Configuration](#/docs/benchmarks#system-configuration)
- [Benchmark Results Table](#/docs/benchmarks#benchmark-results-table)
- [Workload Analysis](#/docs/benchmarks#workload-analysis)
- [Operational Recommendations](#/docs/benchmarks#operational-recommendations)
- [Best Practices](#/docs/benchmarks#best-practices)
- [Troubleshooting](#/docs/benchmarks#troubleshooting)

---

## Execution Modes

Performance is measured across three primary runtime configurations:

1. **Normal Python Execution**: Interpretive baseline execution.
2. **UHCR without Plugin**: Built-in CPU compiler backend using auto-vectorized code generation.
3. **UHCR with Custom ISA Plugin**: Compilation utilizing a dynamically loaded, custom Instruction Set Architecture backend.

> [!WARNING]
> UHCR JIT optimization paths, instruction merging, and memory layout configurations are shared between core pipelines and plugin APIs. Loading plugins may introduce registration lookup overhead, affecting micro-benchmarks.

---

## System Configuration

Benchmarks were run under the following hardware profile:
- **Processor**: Intel(R) Core(TM) i7-7600U CPU @ 2.80GHz
- **Instruction Extensions**: `aes`, `avx`, `avx2`, `bmi1`, `bmi2`, `fma`, `popcnt`, `sse`, `sse2`, `sse3`, `sse4_1`, `sse4_2`, `ssse3`
- **Compiler Backend**: `cpu_avx2` (using 256-bit YMM register vectorized loops)
- **Accelerator Availability**: CUDA present (unused during these CPU-bound benchmarks)

---

## Benchmark Results Table

Execution times are reported in milliseconds. Lower numbers indicate better performance.

| Workload | Python (ms) | UHCR + Plugin (ms) | UHCR (ms) | Plugin Speedup | UHCR Speedup |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **String Concat** (5M) | 1993.50 | 1289.73 | 1316.12 | **1.55x** | **1.51x** |
| **Loop Sum** (10M) | 197.46 | 199.15 | 189.72 | 0.99x | **1.04x** |
| **Matrix Mul** (500×500) | 35.52 | 15.99 | 11.99 | **2.22x** | **2.96x** |
| **List Comp** (10M) | 1075.42 | 1166.35 | 1070.77 | 0.92x | 1.00x |

---

## Workload Analysis

### Matrix Multiplication (500×500 Float Operations)
- **Built-in Backend**: **2.96x Speedup** (35.52ms down to 11.99ms)
- **Plugin Backend**: **2.22x Speedup** (35.52ms down to 15.99ms)

*Analysis*: This represents the sweet spot for UHCR optimization. The JIT compiler lowers multi-dimensional matrix operations to highly vectorized AVX2 inner loops. The plugin introduces a 25% performance penalty compared to the built-in compiler, indicating plugin dispatch and boundary crossing overhead.

### String Concatenation (5 Million Operations)
- **Built-in Backend**: **1.51x Speedup** (1993.50ms down to 1316.12ms)
- **Plugin Backend**: **1.55x Speedup** (1993.50ms down to 1289.73ms)

*Analysis*: String manipulation is I/O-heavy. UHCR achieves a solid speedup over Python's standard memory allocator. Here, the custom plugin performs slightly better, demonstrating the utility of targeted string optimization passes.

### Loop Operations (Sum to 10 Million)
- **Built-in Backend**: **1.04x Speedup** (197.46ms down to 189.72ms)
- **Plugin Backend**: 0.99x (Slower)

*Analysis*: Scalar looping yields minimal gains because Python's built-in `sum()` function is already heavily optimized in C. Loading custom plugins results in a net degradation due to initialization and dynamic type checking.

### List Comprehension (10 Million Elements)
- **Built-in Backend**: 1.00x (Parity)
- **Plugin Backend**: 0.92x (Slower)

*Analysis*: List comprehensions are memory-bound. The performance is constrained by system RAM bus bandwidth rather than CPU instruction speeds. UHCR cannot optimize away the physical memory allocation bottlenecks in these patterns.

---

## Operational Recommendations

| Workload Type | Speedup Potential | Recommendation |
| :--- | :--- | :--- |
| **Matrix & Numeric Math** | 2.0x - 3.5x | ✅ **Best Case**: Always compile using UHCR. |
| **Large String Concat** | 1.3x - 1.8x | ✅ **Recommended**: Compile using UHCR. |
| **Simple Scalar Loops** | 1.0x - 1.1x | ⚠️ **Marginal**: Parity with Python; compile only if nested in broader kernels. |
| **List Comprehensions** | < 1.0x | ❌ **Not Recommended**: Keep in standard Python. |
| **Micro-Workloads (< 100ms)** | < 1.0x | ❌ **Not Recommended**: Compilation latency exceeds execution savings. |

---

## Best Practices

1. **Default to Built-in Backends**: Unless compiling for specialized, non-standard architectures, utilize built-in compilation backends to avoid plugin abstraction overhead.
2. **Amortize JIT Costs**: Only apply `@uhcr.jit` to functions that will be invoked repeatedly or perform heavy loops.
3. **Target Compute-Bound Operations**: Reserve compiler optimization passes for numeric calculation kernels, avoiding memory-intensive and network-intensive routines.

---

## Troubleshooting

### Benchmarks Slower Than Python
*Cause*: The benchmark size is too small, meaning JIT compilation overhead is included in the execution timing.  
*Solution*: Increase iterations or workload size to ensure compilation costs are amortized, or use the `eager=True` parameter to pre-compile during startup.

### Plugin Adding Unreasonable Latency
*Cause*: Inefficient register allocation or lack of constant folding in the plugin's code-generation pass.  
*Solution*: Enable `enable_profiling = true` in `config.toml` to locate the slow instruction phase in the plugin compile pipeline.

---

## Related Documentation

- [Docker Benchmarks](#/docs/benchmarks-docker)
- [Kubernetes Benchmarks](#/docs/benchmarks-k8s)
- [JIT Compilation Guide](#/docs/jit-guide)
- [Reference Index](#/docs/reference)

## Next Steps

- Previous: [Reference Index](#/docs/reference)
- Home: [Documentation Home](#/)
- Next: [Security & Safety](#/docs/safety)
