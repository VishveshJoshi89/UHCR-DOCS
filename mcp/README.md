# UHCR MCP Server

Model Context Protocol (MCP) interface layer managing local execution configurations for the Universal Hardware Compilation Runtime (UHCR).

## Core Capabilities

### Functional Tool Matrix

* **detect_hardware**: Automatically fingerprints target device execution capabilities (AVX configurations, CUDA cores, architecture topologies).
* **compile_function**: Runs runtime string inputs into the JIT cross-compiler pipeline checking context boundaries using `@uhcr.jit`.
* **benchmark**: Executes runtime latency evaluation passes, performance metrics tracking, and raw ops/sec calculations.
* **list_backends**: Lists compilation backends matching local device profiles.
* **optimize_ir**: Interacts with the dynamic Intermediate Representation optimization scheduling stack.

### Accessible Resources

* `hardware://profile` -> Returns structured operational execution hardware specifications.
* `backends://available` -> Active system target runtime engine lists.
* `cache://stats` -> Active memory compilation state metrics.

## Setup Instructions

### Environment Configuration

Ensure the core runtime module dependency is present within your running python execution container:

```bash
pip install uhcr