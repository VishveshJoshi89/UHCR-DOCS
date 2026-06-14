# Development Guides

## Executive Summary

This index covers all practical, task-oriented guides for developing with and extending UHCR. Guides are organized by task type: writing optimized application code, building backend plugins, and targeting multiple hardware architectures.

---

## Guides in This Section

### JIT Compilation Guide
Learn how the `@uhcr.jit` decorator works, which compilation modes are available, how type inference and caching operate, and how to diagnose compilation failures.

[Read JIT Compilation Guide →](#/docs/jit-guide)

---

### Plugin Development Guide
Implement a UHCR plugin from scratch. Covers the manifest format, Plugin base class API, registering backends and kernels, the plugin lifecycle, and testing patterns.

[Read Plugin Development Guide →](#/docs/plugin-guide)

---

### Plugin System Reference
Complete reference for the plugin discovery system, built-in plugin catalog, configuration schema, inter-plugin communication, and distribution packaging.

[Read Plugin System Reference →](#/docs/plugins)

---

### Multi-ISA Support
Understand how UHCR lowers a single IR module to x86_64, AArch64, and RISC-V machine code. Includes assembler API examples, cross-compilation workflow, and instructions for adding new ISA targets.

[Read Multi-ISA Support →](#/docs/multi-isa)

---

### Feature Overview
A navigable catalog of every major UHCR capability with concise descriptions and links to in-depth documentation.

[Read Feature Overview →](#/docs/features)

---

## Related Documentation

- [Quick Start](#/docs/quickstart)
- [Architecture Overview](#/docs/architecture)
- [API Reference](#/docs/api-reference)
- [Plugin System Reference](#/docs/plugins)

## Next Steps

- Home: [Documentation Home](#/)
- Next: [Containerization Guide](#/docs/containerization)
