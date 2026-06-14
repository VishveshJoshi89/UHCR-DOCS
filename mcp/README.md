# Model Context Protocol (MCP) Integration

Model Context Protocol (MCP) interface layer managing local execution configurations for the Universal Hardware Compilation Runtime (UHCR).

## Executive Summary

The UHCR MCP Server implements the Model Context Protocol, enabling AI assistants (such as Claude) to interact directly with the UHCR environment. Through this interface, AI agents can query system hardware characteristics, test JIT compilation pipelines, trigger performance benchmarks, inspect available backends, and optimize intermediate representation (IR) code blocks. This document details the tools, resources, configurations, and integration workflows.

## Table of Contents

- [Functional Tool Matrix](#functional-tool-matrix)
- [Exposed System Resources](#exposed-system-resources)
- [Environment Configuration](#environment-configuration)
- [AI Client Integration Guide](#ai-client-integration-guide)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [Related Documentation](#related-documentation)

---

## Functional Tool Matrix

The MCP server exposes the following programmatic tools to connected AI agents:

### 1. `detect_hardware`
Queries the host machine CPUID instruction sets, GPU runtime cores, memory sizes, and OS profiles.
- **Input Parameters**: None.
- **Output**: JSON representation of the system `HardwareProfile`.

### 2. `compile_function`
Validates and JIT-compiles raw Python function strings using the UHCR compiler pipeline.
- **Input Parameters**:
  - `code` (*string*): The Python function code to JIT compile.
  - `eager` (*boolean*, optional): Trigger compilation on first call. Defaults to `True`.
- **Output**: Compilation status, target backend selected, and generated assembly metadata.

### 3. `benchmark`
Executes latency measurement loops on standard mathematical workloads.
- **Input Parameters**:
  - `iterations` (*integer*, optional): Loop count per test. Defaults to `100`.
  - `backend` (*string*, optional): Force specific execution backend.
- **Output**: Latency averages (min, max, average) and ops/sec throughput statistics.

### 4. `list_backends`
Lists all compiled backends currently registered within the local selector pipeline.
- **Input Parameters**: None.
- **Output**: Priority list of available compile backends matching target hardware.

### 5. `optimize_ir`
Submits raw UHCR IR representations to the optimization pipeline for evaluation.
- **Input Parameters**:
  - `ir_code` (*string*): The raw instruction blocks to optimize.
- **Output**: The optimized IR module output.

---

## Exposed System Resources

Agents can read static state parameters from the following URI schemes:

- **`hardware://profile`**: Returns the structured hardware capabilities representation.
- **`backends://available`**: Active backend engine names and priorities.
- **`cache://stats`**: Compilation caching efficiency ratios and invalidation statistics.

---

## Environment Configuration

Verify that the core `uhcr` package and dependencies are installed in your Python environment:

```bash
pip install uhcr
```

---

## AI Client Integration Guide

### Claude Desktop Configuration
To register the UHCR MCP server, append the configuration definition inside your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "uhcr-mcp": {
      "command": "python",
      "args": ["-m", "uhcr.mcp.server"],
      "env": {
        "UHCR_LOG_LEVEL": "INFO",
        "UHCR_CACHE_DIR": "/path/to/custom/cache"
      }
    }
  }
}
```

### Starting the Server Manually
To execute the MCP daemon directly over standard input/output (`stdio`) transport:

```bash
uhcr mcp --stdio --docs-path ./docs
```

---

## Best Practices

1. **Enable Caching**: When launching the server, supply the `--cache` flag to cache documentation lookups in memory, improving response speeds.
2. **Limit Execution Access**: Run the MCP server in a sandboxed user space to prevent JIT compilation steps from accessing sensitive host system file hierarchies.
3. **Handle Compilation Failures**: Configure AI agent prompts to handle compile-time exceptions gracefully if the input Python string contains syntax violations.

---

## Troubleshooting

### Tool Calls Blocked / Timeout
*Cause*: The host machine is executing a heavy JIT benchmarking run, locking the CPU execution threads.  
*Solution*: Decrease the benchmark `--iterations` argument or allocate additional worker threads.

### Error: "No Plugin Subclass Found"
*Cause*: An invalid backend plugin was dynamically loaded from the default `./plugins` scanning folder.  
*Solution*: Temporarily disable local plugins by starting the server with clean environment configuration profiles (`UHCR_DISABLE_SAFETY=1` or `UHCR_BACKEND=generic`).

---

## Related Documentation

- [CLI Reference](#/docs/cli)
- [Security & Safety Manual](#/docs/safety)
- [Plugin System Reference](#/docs/plugins)
- [Installation Guide](#/docs/installation)