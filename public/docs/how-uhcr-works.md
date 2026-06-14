# How UHCR Works

## Executive Summary

The Universal Hardware-Aware Compute Runtime (UHCR) is a dynamic execution engine that JIT-compiles Python computations into native machine instructions. This guide details the internal mechanisms of UHCR, including function interception, runtime tracing, Static Single Assignment (SSA) intermediate representation (IR) generation, compiler optimization passes, automated backend dispatch, and native execution via aligned memory buffers and parallel thread pinning.

## Table of Contents

- [The Core Execution Lifecycle](#/docs/how-uhcr-works#the-core-execution-lifecycle)
- [Phase 1: Function Interception](#/docs/how-uhcr-works#phase-1-function-interception)
- [Phase 2: Dynamic Execution Tracing](#/docs/how-uhcr-works#phase-2-dynamic-execution-tracing)
- [Phase 3: Intermediate Representation (IR) Generation](#/docs/how-uhcr-works#phase-3-intermediate-representation-ir-generation)
- [Phase 4: Compiler Optimization Pipeline](#/docs/how-uhcr-works#phase-4-compiler-optimization-pipeline)
- [Phase 5: Automated Backend Selector](#/docs/how-uhcr-works#phase-5-automated-backend-selector)
- [Phase 6: Code Generation & Execution](#/docs/how-uhcr-works#phase-6-code-generation--execution)
- [Best Practices](#/docs/how-uhcr-works#best-practices)
- [Limitations](#/docs/how-uhcr-works#limitations)
- [Troubleshooting](#/docs/how-uhcr-works#troubleshooting)

---

## The Core Execution Lifecycle

UHCR processes standard Python functions through a structured compiler frontend and execution runtime. The following diagram shows the sequential pipeline:

```
[ Python User Code ]
         │
         ▼ (Decorator Interception)
[ JitFunction Wrapper ] ──(Warm-up < 3)──► [ Python Interpreter ]
         │ (Warm-up >= 3 or Eager)
         ▼
[ FunctionTracer & TracedValues ]
         │
         ▼ (Tracing Capture)
[ SSA-Style IR Generation ]
         │
         ▼ (Optimization passes: Folding, DCE, CSE)
[ Optimized IR Module ]
         │
         ▼ (BackendSelector: Hardware Probe)
[ Target Backend (AVX2 / CUDA / Generic) ]
         │
         ▼ (Codegen: Emission to Executable Memory)
[ Machine Code Execution ]
```

---

## Phase 1: Function Interception

When a function is decorated with `@uhcr.jit`, UHCR wraps the callable object inside a `JitFunction` class instance. This class intercepts all subsequent invocations, tracks signature types, and maintains execution counters to determine when to compile.

```python
# uhcr/frontend/decorator.py
class JitFunction:
    def __init__(self, python_func, config):
        self.python_func = python_func
        self.config = config
        self.compiled_versions = {}  # Cache keyed by argument signatures
        self.call_count = 0
    
    def __call__(self, *args, **kwargs):
        self.call_count += 1
        
        # Decide if compilation is triggered
        if self.should_compile():
            return self._compile_and_execute(*args, **kwargs)
        else:
            # Execute in standard Python environment during warm-up phase
            return self.python_func(*args, **kwargs)
    
    def should_compile(self):
        if self.config.eager:
            return self.call_count >= 1
        else:
            return self.call_count >= 3  # Default warm-up threshold
```

---

## Phase 2: Dynamic Execution Tracing

UHCR utilizes dynamic tracing rather than static AST parsing alone to resolve type ambiguities. The execution tracer monkey-patches core numerical types and replaces python function arguments with symbolic `TracedValue` objects.

```python
# uhcr/frontend/tracing.py
class FunctionTracer:
    def __init__(self):
        self.traced_operations = []
        self.variables = {}
    
    def trace_function(self, func, args):
        """Executes the Python function with symbolic objects to record actions."""
        traced_args = []
        for i, arg in enumerate(args):
            traced_arg = TracedValue(
                type=self._infer_type(arg),
                name=f"arg_{i}",
                value=arg
            )
            traced_args.append(traced_arg)
        
        try:
            # Temporarily redirect mathematical operators to tracer hooks
            original_add = float.__add__
            float.__add__ = self._traced_add
            
            result = func(*traced_args)
            
            float.__add__ = original_add
        except Exception as e:
            raise TracingError(f"Function tracing execution failed: {e}")
        
        return self.traced_operations, result
    
    def _traced_add(self, other):
        op = TracedOperation(
            opcode='ADD',
            operands=[self, other],
            result_type=self._infer_result_type(self, other)
        )
        self.traced_operations.append(op)
        return TracedValue(
            type=op.result_type,
            name=f"tmp_{len(self.traced_operations)}",
            operation=op
        )
```

---

## Phase 3: Intermediate Representation (IR) Generation

The recorded tracing logs are passed to the `IRBuilder`. This component translates abstract operations into a structured IR Module containing basic blocks and SSA-conformant values.

```python
# uhcr/compiler/ir_builder.py
class IRBuilder:
    def __init__(self):
        self.module = None
        self.current_function = None
        self.current_block = None
        self.value_map = {}
    
    def build_from_trace(self, traced_ops, func_name, arg_types):
        self.module = Module()
        return_type = self._infer_return_type(traced_ops)
        
        # Instantiate SSA Function object
        self.current_function = self.module.create_function(
            func_name, arg_types, return_type
        )
        self.current_block = self.current_function.create_block("entry")
        
        # Populate argument value references
        for i, arg_type in enumerate(arg_types):
            self.value_map[f"arg_{i}"] = self.current_function.get_argument(i)
        
        for op in traced_ops:
            ir_val = self._generate_ir_for_operation(op)
            if op.result_name:
                self.value_map[op.result_name] = ir_val
        
        return self.module
```

---

## Phase 4: Compiler Optimization Pipeline

Before lowered code is exposed to backend code generators, the IR Module passes through a sequence of optimization passes:

### Constant Folding
Pre-evaluates arithmetic operations containing only constant values:
```python
# Before
%0 = add i32 5, 10
# After
%0 = 15
```

### Dead Code Elimination (DCE)
Discards variables and execution nodes whose outputs are never consumed by subsequent calculations or return operations.

### Common Subexpression Elimination (CSE)
Identifies redundant nodes calculating equivalent values and re-routes variables to share a single output.

```python
# uhcr/compiler/optimization.py
class ConstantFoldingPass:
    def run(self, module):
        modified = True
        while modified:
            modified = False
            for function in module.functions:
                for block in function.blocks:
                    for instruction in list(block.instructions):
                        if self._can_fold(instruction):
                            folded = self._fold_instruction(instruction)
                            block.replace_instruction(instruction, folded)
                            modified = True
        return module
```

---

## Phase 5: Automated Backend Selector

The `BackendSelector` queries the cached hardware capabilities (compiled by `uhcr.detect()`) and matches them against the IR program requirements.

```python
# uhcr/backends/backend_selector.py
class BackendSelector:
    def __init__(self, profile):
        self.profile = profile
        self.backends = self._discover_backends()
    
    def select_optimal(self, module):
        compatible_backends = []
        for backend in self.backends:
            if backend.can_compile(module):
                score = self._score_backend(backend, module)
                compatible_backends.append((backend, score))
        
        if not compatible_backends:
            raise RuntimeError("No compatible execution backend detected.")
            
        compatible_backends.sort(key=lambda x: x[1], reverse=True)
        return compatible_backends[0][0]
```

Score weights favor dedicated acceleration:
- **CUDA PTX**: Base priority = 100+
- **AVX-512**: Base priority = 60+
- **AVX2**: Base priority = 25+
- **Generic CPU**: Base priority = 1 (always compatible fallback)

---

## Phase 6: Code Generation & Execution

The resolved backend compiles the IR directly into native instructions. For example, the `AVX2Backend` processes the instructions, writes binary bytes into an executable memory buffer using standard platform syscalls (`VirtualAlloc` on Windows or `mmap` with `PROT_EXEC` on Unix), and returns a callable ctypes function pointer.

```python
# uhcr/backends/cpu_avx2.py
class AVX2Backend(BackendBase):
    def compile(self, module):
        codegen = AVX2CodeGenerator()
        for function in module.functions:
            codegen.function_prologue(function)
            for block in function.blocks:
                codegen.block_label(block.name)
                for instruction in block.instructions:
                    self._compile_instruction(codegen, instruction)
            codegen.function_epilogue(function)
        
        return codegen.assemble()  # Returns raw machine code bytes
```

---

## Best Practices

1. **Avoid Branching Overhead**: JIT compiler passes run most efficiently on linear loops. Try to factor nested conditional tests outside the traced region where possible.
2. **Reuse Variables**: Keep variables active to maximize Common Subexpression Elimination (CSE) optimization passes.
3. **Verify compilation**: Use the `verbose=True` configuration flag during JIT definition to verify target optimizations are active.

---

## Limitations

- **Warmup Latencies**: The dynamic compilation pipeline adds compiler latency (typically 5ms to 50ms) on the first execution path.
- **Python-Level Introspection**: Python inspection tools (e.g. `inspect.getsource()`) cannot parse the interior code statements of a running JIT binary.

---

## Troubleshooting

### Loop Execution Throttled
- Check that loop indexes utilize basic integer types (`Type.I64` or `Type.I32`).
- Verify that variable scopes remain local to the decorated function.

---

## Related Documentation

- [Introduction to UHCR](#/docs/introduction)
- [Runtime Execution Engine](#/docs/runtime)
- [Plugin System Architecture](#/docs/plugins)
- [API Reference](#/docs/api-reference)

## Next Steps

Continue with:

- Previous: [Quick Start Guide](#/docs/quickstart)
- Home: [Documentation Home](#/)
- Next: [Runtime Architecture Overview](#/docs/architecture)