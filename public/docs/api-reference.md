# API Reference

## Executive Summary

This document provides a comprehensive technical reference for the public Python API of the Universal Hardware-Aware Compute Runtime (UHCR). It details top-level functions, data types, the intermediate representation (IR) builder, memory management structures, and parallel scheduling abstractions. Use this reference to integrate UHCR with Python code and programmatically construct custom computation pipelines.

## Table of Contents

- [Top-Level Functions](#/docs/api-reference#top-level-functions)
- [Tensor Class](#/docs/api-reference#tensor-class)
- [IR Builder API](#/docs/api-reference#ir-builder-api)
- [IR System Types](#/docs/api-reference#ir-system-types)
- [Hardware Profile API](#/docs/api-reference#hardware-profile-api)
- [Aligned Memory Buffer](#/docs/api-reference#aligned-memory-buffer)
- [Parallel Scheduler](#/docs/api-reference#parallel-scheduler)
- [Storage & Cache Optimizer](#/docs/api-reference#storage--cache-optimizer)
- [Best Practices](#/docs/api-reference#best-practices)
- [Troubleshooting](#/docs/api-reference#troubleshooting)

---

## Top-Level Functions

### `uhcr.detect() -> HardwareProfile`
Probes system hardware topologies and returns capabilities (cache hierarchies, CPU instruction sets, GPU presence). The profile is cached after the first execution.

### `uhcr.get_runtime() -> UHCRRuntime`
Returns the global `UHCRRuntime` instance, creating it if it has not yet been initialized.

### `uhcr.tensor(data, dtype=None) -> Tensor`
Factory function that creates a `Tensor` from nested Python list structures.
- **Parameters:**
  - `data` (*List[Any]*): Nested list representation of values.
  - `dtype` (*Type*, optional): Element data type. Defaults to `Type.F32`.

```python
import uhcr
t = uhcr.tensor([[1.0, 2.0], [3.0, 4.0]])
```

---

## Tensor Class

### `Tensor(data, shape=None, dtype=Type.F32)`
N-dimensional hardware-aligned memory array.

#### Properties
- **`shape`** (*Tuple[int, ...]*): The dimensions of the tensor.
- **`dtype`** (*Type*): Element data type (e.g. `Type.F32` or `Type.F64`).
- **`address`** (*int*): Zero-copy physical/virtual starting address, aligned to 64 bytes.
- **`buffer`** (*AlignedBuffer*): Underlying memory allocation wrapper.

#### Methods
- **`matmul(other: Tensor) -> Tensor`**: Executes matrix multiplication with another tensor, dispatching to CUDA or SIMD instructions.
- **`__add__(other: Tensor) -> Tensor`**: Element-wise addition wrapper.
- **`to_numpy() -> np.ndarray`**: Converts the tensor back to a NumPy array via zero-copy.

---

## IR Builder API

### `IRBuilder`
Constructs target-independent Intermediate Representation (IR) modules.

```python
from uhcr.compiler.ir import Type
from uhcr.compiler.ir_builder import IRBuilder

builder = IRBuilder()
builder.new_module()
func = builder.new_function("add_kernel", [Type.I64, Type.I64], Type.I64)
entry = func.create_block("entry")
builder.set_block(entry)
```

#### Math Instructions
- **`builder.add(a, b)`**: Performs type-inferred addition.
- **`builder.sub(a, b)`**: Performs type-inferred subtraction.
- **`builder.mul(a, b)`**: Performs type-inferred multiplication.
- **`builder.div(a, b)`**: Performs type-inferred division.

#### Vector SIMD Instructions
- **`builder.vload(ptr, offset, type)`**: Loads a vector register from a memory pointer and offset.
- **`builder.vstore(val, ptr, offset)`**: Stores a vector register to memory.
- **`builder.vadd(a, b)`**: Performs element-wise vector addition.
- **`builder.vsub(a, b)`**: Performs element-wise vector subtraction.
- **`builder.vmul(a, b)`**: Performs element-wise vector multiplication.
- **`builder.vdiv(a, b)`**: Performs element-wise vector division.
- **`builder.vfmadd(acc, a, b)`**: Fused multiply-add (`acc + a * b`).

#### Memory Operations
- **`builder.load(ptr, offset, type)`**: Reads scalar value from memory.
- **`builder.store(val, ptr, offset)`**: Writes scalar value to memory.

#### Control Flow
- **`builder.cmp(cond, a, b)`**: Compares operands (`eq`, `ne`, `lt`, `le`, `gt`, `ge`).
- **`builder.br(cond, true_block, false_block)`**: Conditional branch.
- **`builder.jmp(block)`**: Unconditional jump.
- **`builder.ret(val=None)`**: Returns from function.

#### Core Intrinsics
- **`builder.matmul(a, b, out)`**: Lowered matrix-multiply hardware intrinsic.
- **`builder.relu(a, out)`**: Lowered Rectified Linear Unit activation.

---

## IR System Types

The UHCR type registry defines widths and layouts for hardware operations:

| Type Enum | Description | Bytes |
| :--- | :--- | :--- |
| `Type.I32` | 32-bit signed integer | 4 |
| `Type.I64` | 64-bit signed integer | 8 |
| `Type.F32` | 32-bit single-precision float | 4 |
| `Type.F64` | 64-bit double-precision float | 8 |
| `Type.V4F32` | 4-element 32-bit float vector | 16 (SSE/NEON) |
| `Type.V8F32` | 8-element 32-bit float vector | 32 (AVX2) |
| `Type.PTR` | System memory pointer | 8 |
| `Type.VOID` | Null type descriptor | 0 |

---

## Hardware Profile API

### `HardwareProfile`
Provides details on host architecture, system CPUID flags, and accelerator topology.

#### Attributes
- **`os`** (*str*): Host operating system name.
- **`architecture`** (*str*): CPU ISA classification (e.g. `x86_64`, `aarch64`).
- **`cpu`** (*CPUCapabilities*): Brand string and instruction flags.
- **`gpu`** (*GPUCapabilities*): CUDA device presence and memory details.
- **`memory`** (*MemoryCapabilities*): System RAM size and page alignment support.

#### Methods
- **`to_json() -> str`**: Serializes system capabilities to JSON format.
- **`get_fingerprint() -> str`**: Computes a unique hash identifying the system hardware environment.
- **`format_table() -> str`**: Formats capabilities into a human-readable CLI table.

---

## Aligned Memory Buffer

### `AlignedBuffer(size_bytes, alignment=64)`
Wrapper managing OS-specific memory allocation with exact alignment boundaries required for SIMD.

```python
from uhcr.runtime.memory_manager import AlignedBuffer
import ctypes

with AlignedBuffer(1024, alignment=64) as buf:
    arr = buf.as_ctypes_array(ctypes.c_float)
    arr[0] = 3.14
```

#### Methods
- **`as_ctypes_array(ctypes_type)`**: Returns a ctypes-typed view over the memory block.
- **`copy_from(bytes_data)`**: Writes bytes directly into the buffer memory.
- **`copy_to() -> bytes`**: Extracts memory content into a bytes object.
- **`free()`**: Deallocates the buffer memory (automatic when using `with`).

---

## Parallel Scheduler

### `Scheduler(num_threads=None)`
Worker pool manager governing CPU thread affinity pinning and task parallelization.

```python
from uhcr.runtime.scheduler import Scheduler

sched = Scheduler(num_threads=4)
sched.parallel_for(1000, lambda start, end: process(start, end))
```

---

## Storage & Cache Optimizer

### `StorageOptimizer`
A unified interface coordinating caching subsystems and local database persistence.

```python
from uhcr.storage import StorageOptimizer

storage = StorageOptimizer()
await storage.initialize()

# Sub-components accessed:
# - storage.redis_cache: Distributed cache layer
# - storage.sqlite_store: Performance history metrics
# - storage.memory_pool: Aligned memory pool allocation
```

---

## Best Practices

1. **Always clean up buffers**: Use `AlignedBuffer` inside a `with` statement to avoid memory leaks.
2. **Explicitly assign dtypes**: When invoking `uhcr.tensor()`, pass `dtype` explicitly to avoid JIT signature mismatch down the pipeline.
3. **Minimize NumPy transitions**: Moving tensors from UHCR to NumPy using `to_numpy()` is zero-copy, but instantiating new tensors from NumPy array values copies data. Minimize creation calls inside hot loops.

---

## Troubleshooting

### API Attribute Error on Custom Types
*Symptom*: Calling JIT functions with custom classes raises `AttributeError` or falls back to Python.  
*Solution*: The JIT compiler only supports primitive types (`int`, `float`) and `uhcr.Tensor`. Map custom class properties to variables before JIT execution.

### Memory Leak with manual free()
*Symptom*: RAM usage rises steadily during runtime.  
*Cause*: Manual instantiation of `AlignedBuffer` without calling `free()` or bypassing the `with` statement context manager.  
*Solution*: Wrap buffer instantiation in a context manager block.

---

## Related Documentation

- [Introduction to JIT](#/docs/jit-guide)
- [Hardware Detection](#/docs/hardware-reference)
- [CLI Reference](#/docs/cli)
- [Distributed Networking](#/docs/network)

## Next Steps

- Previous: [Distributed Networking](#/docs/network)
- Home: [Documentation Home](#/)
- Next: [CLI Reference](#/docs/cli)
