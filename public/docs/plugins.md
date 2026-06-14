# Plugin System Reference

## Executive Summary

The UHCR plugin system is a runtime extension framework that allows third-party code to register new compilation backends, compute kernels, and optimization passes. Plugins are discovered via TOML manifests, loaded dynamically, and activated through a defined lifecycle. This reference documents the discovery mechanism, execution modes, built-in plugin catalog, configuration schema, and testing patterns.

## Table of Contents

- [Execution Modes](#/docs/plugins#execution-modes)
- [Plugin Discovery](#/docs/plugins#plugin-discovery)
- [Built-in Plugins](#/docs/plugins#built-in-plugins)
- [Plugin Lifecycle](#/docs/plugins#plugin-lifecycle)
- [Plugin Manifest Reference](#/docs/plugins#plugin-manifest-reference)
- [Backend Plugin Implementation](#/docs/plugins#backend-plugin-implementation)
- [Optimizer Plugin Implementation](#/docs/plugins#optimizer-plugin-implementation)
- [Plugin Configuration](#/docs/plugins#plugin-configuration)
- [Testing](#/docs/plugins#testing)
- [Distribution](#/docs/plugins#distribution)
- [Troubleshooting](#/docs/plugins#troubleshooting)

---

## Execution Modes

### Without Plugins (Built-in Runtime)

UHCR operates on built-in backends by default. No `PluginManager` invocation is required.

```python
import uhcr

@uhcr.jit(eager=True)
def compute(a, b):
    return (a + b) * 2

print(compute(10, 20))  # 60
```

Built-in backends (`cpu-generic`, `cpu-avx2`, `cpu-avx512`, `cuda-ptx`) activate automatically when the host hardware supports them.

### With Custom Plugins

Explicitly load plugins from one or more directories when you need additional backends, kernels, or optimization passes.

```python
from pathlib import Path
from uhcr.plugins import PluginManager

manager = PluginManager()
loaded = manager.load_all([Path("plugins")])
print(f"Loaded {loaded} plugin(s)")
print("Active plugins:", list(manager.loaded_plugins))
```

To load a single plugin:

```python
plugin_dir = Path("plugins/example_plugin")
manager.load_single(plugin_dir)
```

---

## Plugin Discovery

UHCR scans directories in priority order:

1. Paths passed explicitly to `PluginManager.load_all()`
2. `./plugins/` — project-local
3. `~/.uhcr/plugins/` — user-global
4. Paths listed in the `UHCR_PLUGIN_PATH` environment variable (colon-separated on POSIX, semicolon-separated on Windows)

```python
from uhcr.plugins import PluginManager

manager = PluginManager()
count = manager.load_all()
print(f"Discovered and loaded {count} plugin(s)")
print("Active:", list(manager.loaded_plugins))
```

---

## Built-in Plugins

### Backend Plugins

| Plugin Name | Target | SIMD Width | Notes |
| :--- | :--- | :--- | :--- |
| `cpu-generic` | Any x86_64 | Scalar | Fallback; always available |
| `cpu-avx2` | AVX2-capable CPUs | 256-bit | Vectorized loops |
| `cpu-avx512` | AVX-512-capable CPUs | 512-bit | Requires `AVX512F` CPUID flag |
| `cuda-ptx` | NVIDIA GPUs | GPU warps | Requires CUDA toolkit ≥ 11.0 |

### Built-in Optimization Passes

The following passes run in sequence on every compiled IR module:

| Pass Name | Effect |
| :--- | :--- |
| `constant-folding` | Evaluates constant expressions at compile time |
| `dead-code-elimination` | Removes instructions whose results are never used |
| `strength-reduction` | Replaces expensive operations with cheaper equivalents |
| `common-subexpression` | Deduplicates identical sub-expressions |

---

## Plugin Lifecycle

| Stage | Trigger | Description |
| :--- | :--- | :--- |
| Discovery | `load_all()` | Scans directories for `plugin.toml` |
| Loading | `load_single()` | Imports the entry point Python module |
| Instantiation | Internal | Finds the `Plugin` subclass; creates instance |
| Initialization | Internal | Calls `plugin.initialize(runtime)` |
| Active | — | Registered extensions available to compiler |
| Shutdown | Runtime exit or `unload()` | Calls `plugin.shutdown()` |

---

## Plugin Manifest Reference

```toml
# plugin.toml
[plugin]
name             = "my-custom-backend"
version          = "1.0.0"
description      = "Custom backend for specialized hardware"
author           = "Your Name <email@example.com>"
entry_point      = "plugin.main"
dependencies     = []
min_uhcr_version = "0.1.0"
```

Extended manifest with metadata and configuration defaults:

```toml
[plugin]
name             = "my-custom-backend"
version          = "1.0.0"
description      = "Custom backend for specialized hardware"
author           = "Your Name <email@example.com>"
entry_point      = "my_plugin.backend"
dependencies     = ["numpy>=1.21.0"]
min_uhcr_version = "0.1.0"

[plugin.metadata]
category          = "backend"
priority          = 25
supported_targets = ["custom-isa"]

[plugin.configuration]
enable_debug       = false
optimization_level = 2
custom_flags       = []
```

---

## Backend Plugin Implementation

```python
# my_plugin/backend.py
from uhcr.backends.backend_base import Backend
from uhcr.compiler.ir import Module, Type
import logging

class CustomBackend(Backend):
    """Backend targeting custom-isa hardware."""

    def __init__(self, config=None):
        super().__init__()
        self.config = config or {}
        self.logger = logging.getLogger(__name__)

    @property
    def name(self) -> str:
        return "custom-backend"

    @property
    def priority(self) -> int:
        return 25

    def supports(self, profile) -> bool:
        """Return True if the hardware profile is compatible."""
        return True

    def compile(self, func):
        """Accept a traced function; return a native callable."""
        self.logger.info("Compiling function: %s", func.__name__)
        assembly = self._generate_assembly(func)
        return self._assemble(assembly)

    def _generate_assembly(self, func) -> str:
        # Convert IR to target assembly text
        ...

    def _assemble(self, assembly: str) -> bytes:
        # Assemble text to machine code bytes
        ...
```

**Instruction mapping (example opcode table):**

```python
OPCODE_MAP = {
    "ADD":   "add.i64",
    "SUB":   "sub.i64",
    "MUL":   "mul.i64",
    "LOAD":  "ld",
    "STORE": "st",
    "RET":   "ret",
}
```

---

## Optimizer Plugin Implementation

```python
# my_plugin/optimizer.py
from uhcr.compiler.optimization import OptimizationPass
from uhcr.compiler.ir import Module, Instruction

class IdentityMultiplyPass(OptimizationPass):
    """Eliminates multiplications by 1 and additions of 0."""

    name = "identity-eliminate"

    def run(self, module: Module) -> Module:
        for function in module.functions:
            for block in function.blocks:
                self._optimize_block(block)
        return module

    def _optimize_block(self, block) -> None:
        instructions = list(block.instructions)
        for i, instr in enumerate(instructions):
            if instr.opcode == "MUL" and self._is_const(instr.operands[1], 1):
                instructions[i] = Instruction("MOV", [instr.operands[0]])
            elif instr.opcode == "ADD" and self._is_const(instr.operands[1], 0):
                instructions[i] = Instruction("MOV", [instr.operands[0]])
        block.instructions = instructions

    @staticmethod
    def _is_const(operand, value: int) -> bool:
        return operand.is_constant() and operand.value == value
```

---

## Plugin Configuration

### Global Configuration via `uhcr.toml`

```toml
[plugins]
search_paths = ["./plugins", "~/.uhcr/plugins"]
auto_load    = true

[plugins.backends]
prefer   = ["custom-backend", "cuda-ptx", "cpu-avx512"]
fallback = "cpu-generic"

[plugins.optimizers]
custom_pipeline = [
    "constant-folding",
    "identity-eliminate",
    "dead-code-elimination",
]

[plugins.config.custom-backend]
optimization_level = 2
enable_debug       = false
custom_flags       = ["--fast-math"]
```

### Runtime Configuration

```python
import uhcr

uhcr.plugins.configure("custom-backend", {
    "optimization_level": 3,
    "enable_debug": True,
})

config = uhcr.plugins.get_config("custom-backend")
print(config["optimization_level"])  # 3
```

---

## Testing

### Unit Test Pattern

```python
import unittest
from my_plugin.backend import CustomBackend

class TestCustomBackend(unittest.TestCase):

    def setUp(self):
        self.backend = CustomBackend({"optimization_level": 2})

    def test_supports_returns_true(self):
        self.assertTrue(self.backend.supports(profile=None))

    def test_compile_returns_bytes(self):
        # Build minimal IR module
        from uhcr.compiler.ir_builder import IRBuilder
        from uhcr.compiler.ir import Type

        builder = IRBuilder()
        builder.new_module()
        func = builder.new_function("test", [Type.I64, Type.I64], Type.I64)
        entry = func.create_block("entry")
        builder.set_block(entry)
        builder.ret(builder.add(func.arguments[0], func.arguments[1]))

        result = self.backend.compile(builder.module)
        self.assertIsInstance(result, bytes)
        self.assertGreater(len(result), 0)

if __name__ == "__main__":
    unittest.main()
```

---

## Distribution

### Recommended Package Structure

```
my-uhcr-plugin/
├── setup.py
├── plugin.toml
├── my_plugin/
│   ├── __init__.py
│   ├── backend.py
│   └── optimizer.py
├── tests/
│   ├── test_backend.py
│   └── test_optimizer.py
└── README.md
```

### `setup.py` Entry Points

```python
from setuptools import setup, find_packages

setup(
    name="uhcr-custom-backend",
    version="1.0.0",
    packages=find_packages(),
    install_requires=["uhcr>=0.1.0", "numpy>=1.21.0"],
    entry_points={
        "uhcr.plugins.backend": [
            "custom-backend = my_plugin.backend:CustomBackend"
        ],
        "uhcr.plugins.optimizer": [
            "identity-eliminate = my_plugin.optimizer:IdentityMultiplyPass"
        ],
    },
    include_package_data=True,
    package_data={"my_plugin": ["plugin.toml"]},
)
```

---

## Troubleshooting

### Plugin Not Loaded
*Symptom*: `manager.load_all()` returns 0.  
*Cause*: No `plugin.toml` in scanned directories, or the file is malformed TOML.  
*Solution*: Run `python -m tomllib my_plugin/plugin.toml` to validate TOML syntax.

### Entry Point Import Error
*Symptom*: `ImportError` during `load_single()`.  
*Cause*: The module path in `entry_point` does not match the installed package structure.  
*Solution*: Ensure the `entry_point` value matches the Python import path, e.g., `my_plugin.backend`.

### Backend Not Selected
*Symptom*: Custom backend is loaded but the built-in backend runs instead.  
*Cause*: Plugin's `priority` value is lower than the active built-in backend.  
*Solution*: Increase the backend `priority` in `plugin.toml` metadata.

---

## Related Documentation

- [Plugin Development Guide](#/docs/plugin-guide)
- [JIT Compilation Guide](#/docs/jit-guide)
- [Multi-ISA Support](#/docs/multi-isa)
- [API Reference](#/docs/api-reference)

## Next Steps

- Previous: [Plugin Development Guide](#/docs/plugin-guide)
- Home: [Documentation Home](#/)
- Next: [Multi-ISA Support](#/docs/multi-isa)
