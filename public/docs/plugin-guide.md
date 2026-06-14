# Plugin Development Guide

## Executive Summary

The UHCR plugin system provides a structured extension API for registering custom backends, compute kernels, and optimization passes without modifying core runtime code. Plugins are discovered automatically from local and user-global directories, loaded via a TOML manifest, and integrated into the compilation pipeline through lifecycle hooks. This guide covers the full lifecycle from scaffold to distribution.

## Table of Contents

- [Plugin Structure](#/docs/plugin-guide#plugin-structure)
- [Plugin Manifest](#/docs/plugin-guide#plugin-manifest)
- [Writing a Plugin Class](#/docs/plugin-guide#writing-a-plugin-class)
- [Registering Extensions](#/docs/plugin-guide#registering-extensions)
- [Loading Plugins](#/docs/plugin-guide#loading-plugins)
- [Plugin Lifecycle](#/docs/plugin-guide#plugin-lifecycle)
- [Accessing Registered Extensions](#/docs/plugin-guide#accessing-registered-extensions)
- [Testing Plugins](#/docs/plugin-guide#testing-plugins)
- [Best Practices](#/docs/plugin-guide#best-practices)
- [Troubleshooting](#/docs/plugin-guide#troubleshooting)

---

## Plugin Structure

A plugin is a directory containing a TOML manifest, a Python package init file, and an entry point module.

```
my_plugin/
├── plugin.toml      # Manifest (required)
├── __init__.py      # Python package init
└── main.py          # Entry point — must contain exactly one Plugin subclass
```

---

## Plugin Manifest

`plugin.toml` declares metadata UHCR reads before importing any Python code.

```toml
[plugin]
name        = "my-custom-backend"
version     = "0.1.0"
author      = "Your Name"
description = "Custom backend for specialized hardware"
entry_point = "plugin.main"
dependencies = []
min_uhcr_version = "0.1.0"
```

**Field Reference:**

| Field | Required | Description |
| :--- | :--- | :--- |
| `name` | Yes | Unique plugin identifier. Must be a valid Python package name. |
| `version` | Yes | Semantic version string (MAJOR.MINOR.PATCH). |
| `author` | No | Author name or email. |
| `description` | No | Human-readable one-line description. |
| `entry_point` | Yes | Python module path containing the `Plugin` subclass. |
| `dependencies` | No | List of pip package requirements. |
| `min_uhcr_version` | No | Minimum compatible UHCR version. |

---

## Writing a Plugin Class

Create a class that inherits from `uhcr.plugins.base.Plugin` and implement the required `name`, `version`, `initialize`, and `shutdown` methods.

```python
# my_plugin/main.py
from uhcr.plugins.base import Plugin

class MyPlugin(Plugin):

    @property
    def name(self) -> str:
        return "my-plugin"

    @property
    def version(self) -> str:
        return "0.1.0"

    def initialize(self, runtime) -> None:
        """Called once when the plugin is loaded into a runtime."""
        self.register_kernel("my_fast_relu", self._fast_relu)

    def shutdown(self) -> None:
        """Called when the runtime exits or the plugin is explicitly unloaded."""
        pass

    def _fast_relu(self, data):
        return [max(0.0, x) for x in data]
```

> [!IMPORTANT]
> The `initialize(runtime)` method is called with a reference to the active `UHCRRuntime` instance. All extension registrations (`register_kernel`, `register_backend`, `register_pass`) must be performed inside this method.

---

## Registering Extensions

### Custom Backends

A backend must inherit from `uhcr.backends.backend_base.Backend` and implement `name`, `priority`, `supports`, and `compile`.

```python
from uhcr.backends.backend_base import Backend

class MyBackend(Backend):

    @property
    def name(self) -> str:
        return "my_backend"

    @property
    def priority(self) -> int:
        return 20  # Higher values are preferred over lower-priority backends.

    def supports(self, profile) -> bool:
        # Return True if the hardware profile meets this backend's requirements.
        return True

    def compile(self, func):
        # Accept a traced function and return a callable native artifact.
        ...

class MyPlugin(Plugin):
    def initialize(self, runtime) -> None:
        self.register_backend(MyBackend())
```

**Priority convention:**

| Priority Range | Backend Category |
| :--- | :--- |
| 90–100 | GPU accelerators (CUDA, ROCm) |
| 60–89 | High-end SIMD (AVX-512, AMX) |
| 40–59 | Standard SIMD (AVX2, NEON) |
| 10–39 | Custom hardware |
| 1–9 | Generic CPU fallback |

### Custom Kernels

Register named callable kernels that can be invoked by name at runtime.

```python
class MyPlugin(Plugin):
    def initialize(self, runtime) -> None:
        self.register_kernel("fast_matmul", self._matmul)

    def _matmul(self, a, b, out, m, n, k):
        # Optimized matrix multiplication implementation.
        ...
```

### Optimization Passes

Register a pass by name. The pass callable receives and returns an `IRFunction`.

```python
class MyPlugin(Plugin):
    def initialize(self, runtime) -> None:
        self.register_pass("my_strength_reduce", self._strength_reduce)

    def _strength_reduce(self, ir_function):
        # Inspect and mutate the IR, then return the modified function.
        return ir_function
```

---

## Loading Plugins

### Automatic Discovery

UHCR scans two directories by default during runtime initialization:
1. `./plugins/` — project-local plugins
2. `~/.uhcr/plugins/` — user-global plugins

```python
from uhcr.plugins import PluginManager

pm = PluginManager(runtime=uhcr.get_runtime())
count = pm.load_all()
print(f"Loaded {count} plugin(s)")
```

### Manual Loading

Load a specific plugin directory directly:

```python
from pathlib import Path
from uhcr.plugins import load_plugin

plugin = load_plugin(Path("path/to/my_plugin"), runtime=uhcr.get_runtime())
```

---

## Plugin Lifecycle

Plugin loading follows a deterministic six-stage sequence:

| Stage | Description |
| :--- | :--- |
| **Discovery** | `discover_plugins()` scans directories for `plugin.toml` files. |
| **Loading** | `load_plugin()` imports the entry point module. |
| **Instantiation** | The `Plugin` subclass is located and instantiated. |
| **Initialization** | `plugin.initialize(runtime)` is called; extensions are registered. |
| **Active** | Registered extensions are available to the compiler and runtime. |
| **Shutdown** | `plugin.shutdown()` is called on runtime exit or manual unload. |

---

## Accessing Registered Extensions

After loading, retrieve registered kernels and passes by name:

```python
from uhcr.plugins.base import get_registered_kernels, get_registered_passes

# Retrieve and invoke a custom kernel
kernels = get_registered_kernels()
relu_fn = kernels["my_fast_relu"]
result = relu_fn([-1.0, 2.0, -3.0, 4.0])
# result → [0.0, 2.0, 0.0, 4.0]

# Retrieve registered optimization passes
passes = get_registered_passes()
print(list(passes.keys()))  # ['my_strength_reduce', ...]
```

---

## Testing Plugins

### Unit Testing a Kernel

```python
import unittest
from my_plugin.main import MyPlugin

class TestMyPlugin(unittest.TestCase):

    def setUp(self):
        self.plugin = MyPlugin()
        # Minimal mock runtime for initialization
        class FakeRuntime:
            def __init__(self): self.kernels = {}
        self.runtime = FakeRuntime()
        self.plugin.initialize(self.runtime)

    def test_fast_relu_positive(self):
        kernels = get_registered_kernels()
        result = kernels["my_fast_relu"]([1.0, 2.0, 3.0])
        self.assertEqual(result, [1.0, 2.0, 3.0])

    def test_fast_relu_negative(self):
        kernels = get_registered_kernels()
        result = kernels["my_fast_relu"]([-1.0, -2.0, 0.0])
        self.assertEqual(result, [0.0, 0.0, 0.0])
```

---

## Best Practices

1. **Keep `initialize` idempotent**: If `initialize` is called more than once, extension re-registration must not duplicate entries or corrupt state.
2. **Fail fast in `initialize`**: Raise a descriptive `RuntimeError` immediately if required hardware or dependencies are absent. Avoid deferring failures to compilation time.
3. **Use `priority` correctly**: Never set `priority` above 90 unless your backend targets a GPU. Doing so may suppress more appropriate built-in backends on other hardware.
4. **Log with the standard library**: Use `logging.getLogger(__name__)` inside plugin code. Do not write to stdout or stderr directly.
5. **Implement `shutdown` for cleanup**: Release file handles, shared memory segments, or device contexts in `shutdown` to avoid resource leaks.

---

## Troubleshooting

### Plugin Not Discovered
*Symptom*: `pm.load_all()` returns 0 even though the plugin directory exists.  
*Cause*: Missing or malformed `plugin.toml`, or the directory is not under `./plugins/` or `~/.uhcr/plugins/`.  
*Solution*: Confirm `plugin.toml` is present, its `[plugin]` header is correct, and the directory is in a scanned path.

### `Plugin` Subclass Not Found
*Symptom*: `load_plugin` raises `PluginLoadError: no Plugin subclass found`.  
*Cause*: The entry point module does not define a class that inherits from `uhcr.plugins.base.Plugin`.  
*Solution*: Ensure exactly one `Plugin` subclass is importable from the `entry_point` module.

### Extension Not Available After Load
*Symptom*: `get_registered_kernels()` does not contain the expected kernel.  
*Cause*: `self.register_kernel(...)` was not called inside `initialize`, or `initialize` threw an exception before reaching the registration call.  
*Solution*: Add logging at the start of `initialize` to confirm it is called; check for exceptions in the load output.

---

## Related Documentation

- [Plugin System Reference](#/docs/plugins)
- [Multi-ISA Support](#/docs/multi-isa)
- [JIT Compilation Guide](#/docs/jit-guide)
- [API Reference](#/docs/api-reference)

## Next Steps

- Previous: [JIT Compilation Guide](#/docs/jit-guide)
- Home: [Documentation Home](#/)
- Next: [Plugin System Reference](#/docs/plugins)
