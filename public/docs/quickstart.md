# Quick Start Guide

## Executive Summary

This guide provides a walk-through for setting up, writing, and executing your first program with the Universal Hardware-Aware Compute Runtime (UHCR). It covers basic JIT-compilation using decorators, hardware detection queries, working with the high-level Tensor API, configuring compilation modes (lazy vs. eager), and applying performance optimizations.

## Table of Contents

- [First Program Setup](#/docs/quickstart#first-program-setup)
- [Working with Tensors](#/docs/quickstart#working-with-tensors)
- [JIT Compilation Modes](#/docs/quickstart#jit-compilation-modes)
- [Hardware Detection Query](#/docs/quickstart#hardware-detection-query)
- [Performance Optimization Tips](#/docs/quickstart#performance-optimization-tips)
- [Common Design Patterns](#/docs/quickstart#common-design-patterns)
- [Limitations](#/docs/quickstart#limitations)
- [Troubleshooting](#/docs/quickstart#troubleshooting)

---

## First Program Setup

To verify your installation and trace a simple arithmetic function, create a file named `hello_uhcr.py`:

```python
import uhcr

# 1. Detect hardware capabilities
profile = uhcr.detect()
print(f"Executing on: {profile.cpu.brand}")
print(f"Supported SIMD Features: {', '.join(profile.cpu.features[:5])}")

# 2. Define a function for JIT compilation
@uhcr.jit(eager=True, verbose=True)
def add_and_multiply(a, b):
    return (a + b) * 2

# 3. Invoke the function (triggers dynamic compilation)
result = add_and_multiply(10, 11)
print(f"Calculation Result: {result}")
```

Run the script from your terminal:
```bash
python hello_uhcr.py
```

### Expected Output
```
Executing on: Intel(R) Core(TM) i7-10700K CPU @ 3.80GHz
Supported SIMD Features: sse, sse2, sse3, ssse3, sse4_1
[uhcr.jit] Compiled 'add_and_multiply' for signature (('int',), ('int',))
Calculation Result: 42
```

---

## Working with Tensors

UHCR provides an optimized, N-dimensional Tensor class that targets high-performance CPU SIMD operations and CUDA GPUS. It handles memory alignment (64-byte boundaries) and memory pooling under the hood.

```python
import uhcr

# Initialize Tensors from Python lists
a = uhcr.tensor([[1.0, 2.0, 3.0],
                 [4.0, 5.0, 6.0]])

b = uhcr.tensor([[7.0, 8.0],
                 [9.0, 10.0],
                 [11.0, 12.0]])

# Dispatch matrix multiplication (routes to the best available backend)
c = a.matmul(b)

print(f"Result Tensor Shape: {c.shape}")
print(f"Output Matrix:\n{c.to_numpy()}")
```

### Expected Output
```
Result Tensor Shape: (2, 2)
Output Matrix:
[[ 58.  64.]
 [139. 154.]]
```

---

## JIT Compilation Modes

UHCR JIT compilation operates in one of two execution modes:

### 1. Lazy Compilation (Default)
Executes through Python interpretation for a warm-up period (default: 3 calls) to inspect signatures before building and compiling the IR.

```python
@uhcr.jit
def compute(x, y):
    return x * y + x

compute(5, 3)   # Warm-up call 1 (Python Interpreter)
compute(7, 2)   # Warm-up call 2 (Python Interpreter)
compute(9, 4)   # Compilation triggered! Native execution from here on
```

### 2. Eager Compilation
Bypasses the warm-up checks and compiles the function to native code immediately upon the first invocation.

```python
@uhcr.jit(eager=True)
def compute(x, y):
    return x * y + x

compute(5, 3)   # Compiled and run natively on first execution
```

---

## Hardware Detection Query

You can programmatically query UHCR to inspect the target system's performance profiles:

```python
import uhcr

profile = uhcr.detect()

# Print CPU Profile
print(f"CPU Model: {profile.cpu.brand}")
print(f"Cohesion: Cores={profile.cpu.cores}, Threads={profile.cpu.threads}")
print(f"Vector Support: AVX2={profile.cpu.has_avx2}, AVX512={profile.cpu.has_avx512}")

# Print Cache Hierarchy
print(f"Cache Details: L1={profile.cpu.cache_l1_data_kb}KB, L2={profile.cpu.cache_l2_kb}KB, L3={profile.cpu.cache_l3_kb}KB")

# Print GPU Profiles
print(f"GPU Model: {profile.gpu.name}")
print(f"CUDA Available: {profile.gpu.cuda_available}")
if profile.gpu.cuda_available:
    print(f"CUDA SDK Version: {profile.gpu.cuda_version}")
```

---

## Performance Optimization Tips

1. **Avoid In-Loop Instantiations**: Do not instantiate new Tensors inside tight loops. Pre-allocate buffer spaces.
   ```python
   # Correct
   a = uhcr.tensor([1.0, 2.0, 3.0])
   for i in range(1000):
       a.matmul(a)
   ```
2. **Reuse Allocations**: Let UHCR reuse existing compiled signatures rather than dynamically defining functions inside other functions.
3. **Set Core Pins**: For multi-threaded CPU workloads, align worker counts with physical cores to prevent thread hopping.

---

## Common Design Patterns

### Pattern 1: Batch Math Loops
```python
import uhcr

@uhcr.jit(eager=True)
def scale_inputs(x):
    return x * 2.5 + 0.5

# Feed collection data
raw_elements = [1.0, 2.0, 3.0, 4.0]
results = [scale_inputs(val) for val in raw_elements]
```

### Pattern 2: Dynamic Type Dispatch
```python
import uhcr

@uhcr.jit(eager=True)
def multiply_add(a, b):
    return a * b + 1.0

# Each unique argument type creates a separate native signature
res_int = multiply_add(10, 2)      # Compiled for integers
res_float = multiply_add(10.5, 2.1)  # Compiled for floats
```

---

## Limitations

- **Warm-Up Overhead**: The first native compilation pass introduces a small latency penalty. Avoid compiling short-lived scripts.
- **Limited Control Flow**: Python `try/except` and resource management constructs (`with` blocks) are not supported inside `@uhcr.jit` decorated code paths.

---

## Troubleshooting

### Module Missing
```
ModuleNotFoundError: No module named 'uhcr'
```
*Solution*: Ensure you install the package in the active environment:
```bash
pip install uhcr
```

### Non-Vectorized execution
If the logs indicate fallbacks to standard CPU interpreter mode:
1. Verify the C++ safety monitor is compiled.
2. Confirm the CPU supports AVX2: `uhcr.detect().cpu.has_avx2`.

---

## Related Documentation

- [Installation Guide](#/docs/installation)
- [How UHCR Works](#/docs/how-uhcr-works)
- [JIT Compilation Guide](#/docs/jit-guide)
- [API Reference](#/docs/api-reference)

## Next Steps

Continue with:

- Previous: [Installation Guide](#/docs/installation)
- Home: [Documentation Home](#/)
- Next: [How UHCR Works](#/docs/how-uhcr-works)
