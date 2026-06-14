# JIT Compilation

## Executive Summary

The `@uhcr.jit` decorator is the primary interface for compiling Python arithmetic functions into optimized native machine code. UHCR intercepts function execution, traces the computation graph, generates a platform-independent Intermediate Representation (IR), applies compiler optimization passes, and dispatches to the highest-priority available backend. This guide details compilation modes, type inference rules, cache behavior, decorator API, and known limitations.

## Table of Contents

- [Compilation Modes](#/docs/jit-guide#compilation-modes)
- [How Tracing Works](#/docs/jit-guide#how-tracing-works)
- [Type Inference](#/docs/jit-guide#type-inference)
- [Compilation Caching](#/docs/jit-guide#compilation-caching)
- [Supported IR Operations](#/docs/jit-guide#supported-ir-operations)
- [Fallback Behavior](#/docs/jit-guide#fallback-behavior)
- [Decorator API Reference](#/docs/jit-guide#decorator-api-reference)
- [Best Practices](#/docs/jit-guide#best-practices)
- [Limitations](#/docs/jit-guide#limitations)
- [Troubleshooting](#/docs/jit-guide#troubleshooting)

---

## Compilation Modes

### Lazy Compilation (Default)

UHCR runs the decorated function in standard Python mode for the first two calls, collecting type information. On the third call, compilation is triggered and all subsequent calls execute natively.

```python
import uhcr

@uhcr.jit
def add(a, b):
    return a + b

add(1, 2)   # Python interpreter — warm-up call 1
add(3, 4)   # Python interpreter — warm-up call 2
add(10, 32) # Compilation triggered — native execution, returns 42
```

### Eager Compilation

Set `eager=True` to trigger compilation on the very first call. This eliminates warm-up latency and is recommended for functions called once per process startup.

```python
@uhcr.jit(eager=True)
def multiply(x, y):
    return x * y

result = multiply(7, 6)  # Compiled on first call, returns 42
```

### Verbose Mode

Enable `verbose=True` to print compilation events to stdout.

```python
@uhcr.jit(eager=True, verbose=True)
def compute(a, b):
    return (a + b) * 2

compute(10, 11)
# [uhcr.jit] Compiled 'compute' for signature (('int',), ('int',))
```

---

## How Tracing Works

When compilation is triggered, UHCR replaces each function argument with a `TracedValue` proxy object. The function executes normally, but all arithmetic operations on these proxies are intercepted and recorded as IR instructions. At the end of tracing, the recorded instruction graph is passed to the IR builder.

```
Function call with real args
       │
       ▼
Args replaced with TracedValues
       │
       ▼
Function executes (operations intercepted)
       │
       ▼
Traced operations → IRBuilder → Optimization passes → Backend
```

The six stages of the full compilation cycle:

1. **Tracing** — Arguments become symbolic `TracedValue` objects.
2. **IR Building** — Traced operations map to UHCR IR opcodes via `IRBuilder`.
3. **Optimization** — Constant folding, DCE, strength reduction, CSE.
4. **Backend Selection** — Hardware profile drives priority-ranked backend choice.
5. **Code Generation** — Backend emits machine code into aligned executable memory.
6. **Caching & Execution** — Native function is cached by signature; subsequent calls bypass compilation.

---

## Type Inference

Argument types are inferred from the concrete values provided at the first compilation call. Each unique combination of argument types produces a separate compiled binary.

| Python Type | IR Type | Width |
| :--- | :--- | :--- |
| `int` | `Type.I64` | 8 bytes |
| `float` | `Type.F64` | 8 bytes |
| `uhcr.Tensor` | `Type.PTR` | 8 bytes (pointer to aligned buffer) |

```python
@uhcr.jit(eager=True)
def scale(a, b):
    return a * b

scale(10, 5)        # Compiles for (int, int)
scale(10.5, 5.0)    # Compiles separately for (float, float)
```

---

## Compilation Caching

UHCR caches compiled native functions indexed by `(function_name, arg_type_signature, backend_name)`. Subsequent calls with an identical signature execute the cached binary directly, with no compilation overhead.

```python
@uhcr.jit(eager=True)
def add(a, b):
    return a + b

add(1, 2)    # Compiles for (int, int)
add(10, 20)  # Cache hit — zero compilation overhead
```

To explicitly clear the cache for a function:

```python
add.invalidate()  # Clears all compiled versions
```

To inspect cache state:

```python
add.is_compiled       # bool: True if at least one compiled version exists
add.python_function   # The original unwrapped Python callable
```

---

## Supported IR Operations

The tracer maps Python arithmetic to the following IR opcodes:

| Python Expression | IR Opcode | Notes |
| :--- | :--- | :--- |
| `a + b` (int) | `ADD` | 64-bit integer addition |
| `a + b` (float) | `FADD` | 64-bit float addition |
| `a - b` | `SUB` / `FSUB` | Integer or float subtraction |
| `a * b` | `MUL` / `FMUL` | Integer or float multiplication |
| `a / b` | `DIV` / `FDIV` | Integer or float division |

Vector operations (emitted when operating on `Tensor` objects):

| Operation | IR Opcode | Hardware Requirement |
| :--- | :--- | :--- |
| `a.matmul(b)` | `MATMUL` | AVX2 or CUDA |
| Vector element-wise add | `VADD` | SSE or AVX2 |
| Vector element-wise multiply | `VMUL` | SSE or AVX2 |
| Fused multiply-add | `VFMADD` | FMA |

---

## Fallback Behavior

If a function contains unsupported Python constructs (string operations, attribute access, complex branching), the decorator transparently falls back to standard Python execution. No error is raised.

```python
@uhcr.jit
def string_op(s):
    return s.upper()

string_op("hello")  # Executes in Python, returns "HELLO"
```

---

## Decorator API Reference

### `@uhcr.jit`

```python
@uhcr.jit
@uhcr.jit(eager=False, verbose=False)
```

**Parameters:**

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `eager` | `bool` | `False` | Compile on the first call rather than after three warm-up iterations. |
| `verbose` | `bool` | `False` | Emit compilation status messages to stdout. |

**JitFunction Properties:**

| Property / Method | Description |
| :--- | :--- |
| `fn.is_compiled` | `True` if any compiled binary is cached for this function. |
| `fn.python_function` | The original undecorated Python callable. |
| `fn.invalidate()` | Purges all cached compiled versions. |

---

## Best Practices

1. **Use `eager=True` on initialization paths**: For functions that are called once at startup before entering hot loops, eager compilation avoids the warm-up penalty.
2. **Keep traced functions pure**: Do not perform I/O, logging, or global state mutations inside `@uhcr.jit` decorated code. The tracer executes the function once to record operations; side effects will run during tracing.
3. **Separate type variants explicitly**: If a function is called with both integer and float arguments, consider defining two separate decorated functions to prevent signature disambiguation overhead.
4. **Validate with `verbose=True` in development**: Always confirm that JIT compilation is occurring correctly by enabling verbose output during integration testing.

---

## Limitations

- **Scalar arithmetic only**: The current tracer supports scalar operations and tensor pointer operations. Looping constructs (`for`, `while`), branching (`if`/`else`), list comprehensions, and dictionary operations are not lowered to IR and fall back to Python.
- **Pure functions required**: Functions must not mutate shared state or perform I/O during the traced execution path.
- **No nested JIT calls**: Calling one `@uhcr.jit` function from inside another `@uhcr.jit` function during tracing is not supported.

> [!NOTE]
> **Planned (Not Yet Implemented)**: Loop tracing, conditional branch lowering, array indexing intrinsics, and GPU kernel generation from traced functions are on the development roadmap but are not available in the current release.

---

## Troubleshooting

### Compilation Not Triggering
*Symptom*: `verbose=True` never prints a compilation message.  
*Solution*: Ensure the call count threshold has been reached (3 calls for lazy mode) or use `eager=True`.

### Fallback on Every Call
*Symptom*: Function always executes slowly despite the decorator.  
*Cause*: The function contains unsupported constructs such as string manipulation, attribute access, or `try/except` blocks.  
*Solution*: Isolate the arithmetic-only kernel into a separate decorated function.

### Unexpected Results After `invalidate()`
*Symptom*: Results differ after calling `fn.invalidate()` and re-executing.  
*Cause*: Type inference may pick different IR types if argument types change between calls.  
*Solution*: Call with consistent types after invalidation.

---

## Related Documentation

- [How UHCR Works](#/docs/how-uhcr-works)
- [IR Types — API Reference](#/docs/api-reference)
- [Plugin Development Guide](#/docs/plugin-guide)
- [Multi-ISA Support](#/docs/multi-isa)

## Next Steps

Continue with:

- Previous: [Hardware Detection](#/docs/hardware-reference)
- Home: [Documentation Home](#/)
- Next: [Plugin Development Guide](#/docs/plugin-guide)
