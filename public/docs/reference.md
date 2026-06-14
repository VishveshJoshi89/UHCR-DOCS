# Reference Index

## Executive Summary

This index serves as the entry point for the technical specification and reference manuals of the Universal Hardware-Aware Compute Runtime (UHCR). It organizes API definitions, command line options, and hardware compatibility mappings to facilitate quick lookups for developers and system administrators.

## Table of Contents

- [Core Reference Categories](#/docs/reference#core-reference-categories)
- [API Reference Index](#/docs/reference#api-reference-index)
- [CLI Reference Index](#/docs/reference#cli-reference-index)
- [Hardware Detection Reference Index](#/docs/reference#hardware-detection-reference-index)
- [Related Documentation](#/docs/reference#related-documentation)
- [Next Steps](#/docs/reference#next-steps)

---

## Core Reference Categories

UHCR maintains three separate reference catalogs:

1. **Python API Reference** - Detailed documentation on classes, methods, signatures, and types.
2. **Command Line Interface (CLI)** - Options, commands, configurations, environment variables, and exit codes.
3. **Hardware Detection Reference** - Details on cache hierarchies, instruction set mapping, and GPU integration profiles.

---

## API Reference Index

Provides developer documentation for core abstractions:
- **`uhcr.detect()`** - Probes system characteristics.
- **`Tensor` class** - N-dimensional arrays with aligned buffers.
- **`IRBuilder`** - Programmatic compilation graph construction.
- **`AlignedBuffer`** - SIMD alignment wrappers.
- **`Scheduler`** - Execution scheduling and core pinning.
- **`StorageOptimizer`** - SQLite and Redis integration details.

[Go to API Reference →](#/docs/api-reference)

---

## CLI Reference Index

Details execution commands for operational management:
- **`uhcr info`** - Display local runtime selection.
- **`uhcr benchmarks`** - Performance measurements.
- **`uhcr serve`** - Start worker coordinator.
- **`uhcr monitor`** - Continuous metric reporting.
- **`uhcr analytics`** - Detailed job inspection.
- **`uhcr mcp`** - Model Context Protocol agent server.

[Go to CLI Reference →](#/docs/cli)

---

## Hardware Detection Reference Index

Exposes parameters tracked by the `HardwareProfile`:
- CPU vendor signatures, thread mapping, AVX/NEON flags.
- Cache line size mapping, L1/L2/L3 topology boundaries.
- CUDA environment paths and driver compatibility metrics.

[Go to Hardware Reference →](#/docs/hardware-reference)

---

## Related Documentation

- [Runtime Architecture](#/docs/architecture)
- [Distributed Networking](#/docs/network)
- [Installation Guide](#/docs/installation)
- [Performance Tuning](#/docs/benchmarks)

## Next Steps

- Previous: [CLI Reference](#/docs/cli)
- Home: [Documentation Home](#/)
- Next: [Performance Tuning](#/docs/benchmarks)
