# CLI Reference

## Executive Summary

The Universal Hardware-Aware Compute Runtime command-line tool (`uhcr`) provides administration utilities for probing hardware capabilities, running performance benchmarks, starting distributed execution servers, performing analytics, monitoring running nodes, and starting AI-accessible Model Context Protocol (MCP) agents. This document acts as the complete reference for commands, options, configuration file schemas, and environments.

## Table of Contents

- [Global Architecture & Installation](#/docs/cli#global-architecture--installation)
- [Command Reference](#/docs/cli#command-reference)
  - [uhcr info](#/docs/cli#uhcr-info)
  - [uhcr benchmarks](#/docs/cli#uhcr-benchmarks)
  - [uhcr serve](#/docs/cli#uhcr-serve)
  - [uhcr monitor](#/docs/cli#uhcr-monitor)
  - [uhcr analytics](#/docs/cli#uhcr-analytics)
  - [uhcr mcp](#/docs/cli#uhcr-mcp)
- [Configuration File Schema](#/docs/cli#configuration-file-schema)
- [Environment Variables](#/docs/cli#environment-variables)
- [Exit Code Meanings](#/docs/cli#exit-code-meanings)
- [Common Usage Workflows](#/docs/cli#common-usage-workflows)
- [Best Practices](#/docs/cli#best-practices)
- [Troubleshooting](#/docs/cli#troubleshooting)

---

## Global Architecture & Installation

The CLI utility is automatically installed alongside the `uhcr` package.

```bash
pip install uhcr
uhcr --version
```

### Global Flags

```bash
uhcr [GLOBAL_OPTIONS] COMMAND [COMMAND_OPTIONS]
```

| Flag | Shortcut | Description |
| :--- | :--- | :--- |
| `--version` | None | Print runtime version and exit. |
| `--help` | `-h` | Display commands and exit. |
| `--config PATH` | None | Path to custom TOML config file (bypasses default lookup). |

---

## Command Reference

### `uhcr info`

Prints diagnostic information detailing Python environment details, active CPUID capabilities, and selected backend priority.

```bash
uhcr info
```

#### Output Format Example:
```
UHCR Runtime
============
Python: 3.14.4
UHCR version: v1
Backend profile: x86_64
CPU features: avx2, sse4_2, fma, popcnt
CUDA available: False
Selected backend: AVX2Backend
```

---

### `uhcr benchmarks`

Runs performance evaluations on JIT functions, tensor instantiation, and math operations.

```bash
uhcr benchmarks [OPTIONS]
```

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `--iterations INT` | `int` | `100` | Number of loops per execution. |
| `--warmup INT` | `int` | `10` | Discarded compiler warmup cycles. |
| `--output PATH` | `str` | `stdout` | File path for writing JSON/CSV output. |
| `--backend NAME` | `str` | `auto` | Force selection of target backend (`generic`, `avx2`, `avx512`, `cuda`). |
| `--format FORMAT` | `str` | `table` | Serialization type: `table`, `json`, `csv`. |

---

### `uhcr serve`

Starts the network coordinator daemon presenting both gRPC and HTTP interfaces.

```bash
uhcr serve [OPTIONS]
```

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `--host HOST` | `str` | `"0.0.0.0"` | Network interface to bind on. |
| `--grpc-port PORT` | `int` | `50051` | Port for incoming gRPC traffic. |
| `--http-port PORT` | `int` | `8080` | Port for REST API and health checks. |
| `--workers INT` | `int` | `4` | Worker threads allocated to the coordinator. |
| `--grace-period INT` | `int` | `30` | Shutdown timeout limit in seconds. |
| `--redis-url URL` | `str` | `None` | Redis host connection endpoint. |
| `--sqlite-path PATH` | `str` | `None` | Persistent SQLite database storage path. |

---

### `uhcr monitor`

Displays a terminal dashboard showing real-time CPU utilization, execution speeds, and memory pool limits.

```bash
uhcr monitor [OPTIONS]
```

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `--interval INT` | `int` | `2` | Update refresh rate in seconds. |
| `--json` | flag | `False` | Output structured metrics to stdout as JSON lines. |
| `--metrics CSV` | `str` | `"all"` | Limit dashboard stats (`cpu,memory,jobs`). |

---

### `uhcr analytics`

Analyzes historical database logs for a specific JIT job execution.

```bash
uhcr analytics JOB_ID [OPTIONS]
```

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `--compare JOB_ID` | `str` | `None` | Compares the target job performance against a second job ID. |
| `--format FORMAT` | `str` | `"table"` | Report formatting: `table`, `json`, `html`. |
| `--output PATH` | `str` | `stdout` | HTML or text file save location. |

---

### `uhcr mcp`

Runs a Model Context Protocol (MCP) server over standard input/output (`stdio`) or HTTP/SSE, allowing AI assistants to query documentation and APIs.

```bash
uhcr mcp [OPTIONS]
```

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `--docs-path PATH` | `str` | `"./docs"` | Directory containing source markdown files. |
| `--host HOST` | `str` | `"localhost"` | SSE port listener interface. |
| `--port PORT` | `int` | `3000` | Server port (non-stdio transport). |
| `--stdio` | flag | `False` | Run over standard input/output transport. |
| `--cache` | flag | `False` | Keep documentation content in memory. |

---

## Configuration File Schema

By default, the CLI reads configuration settings from `~/.uhcr/config.toml`.

```toml
[server]
host = "0.0.0.0"
grpc_port = 50051
http_port = 8080
workers = 4
grace_period = 30
redis_url = "redis://localhost:6379/0"
sqlite_path = "/var/lib/uhcr/data.db"

[benchmarks]
iterations = 100
warmup = 10
output_format = "json"

[monitoring]
update_interval = 2
metrics = ["cpu", "memory", "jobs"]

[runtime]
default_backend = "avx2"
cache_size_mb = 512
enable_profiling = true
```

---

## Environment Variables

Settings are overwritten in order of: Defaults -> Config file -> Environment variables -> Command line flags.

| Variable | Description | Default |
| :--- | :--- | :--- |
| `UHCR_HOME` | Configuration root folder | `~/.uhcr` |
| `UHCR_BACKEND` | Forces specific JIT backend | `auto` |
| `UHCR_CACHE_DIR` | JIT assembly cache folder | `~/.uhcr/cache` |
| `UHCR_LOG_LEVEL` | Logging verbosity (`DEBUG`, `INFO`, `ERROR`) | `INFO` |
| `UHCR_WORKERS` | Coordinator thread count | `4` |
| `UHCR_GRPC_PORT` | Port for gRPC service | `50051` |
| `UHCR_HTTP_PORT` | Port for REST/Health API | `8080` |

---

## Exit Code Meanings

| Code | Status | Meaning |
| :--- | :--- | :--- |
| `0` | Success | Command executed successfully. |
| `1` | Failure | Uncaught execution exception. |
| `2` | Arguments | Invalid CLI flag configuration. |
| `3` | Configuration | Missing or malformed configuration TOML file. |
| `4` | Backend | Target hardware backend failed to load. |
| `5` | Network | Coordinator socket bind collision or target worker unreachable. |
| `130`| Interrupted | Terminated via Ctrl+C. |

---

## Common Usage Workflows

### Inspecting Local Environment
```bash
uhcr info
uhcr benchmarks --backend avx2 --iterations 500
```

### Deploying a Server Node
```bash
uhcr serve --workers 8 --sqlite-path ./history.db
```

### Continuous Dashboard Logging
```bash
uhcr monitor --interval 1 --json >> monitor.log
```

---

## Best Practices

1. **Use stdio mode for MCP integrations**: When integrating with local AI tools like Claude Desktop, configure MCP with `--stdio` to avoid networking issues.
2. **Pre-allocate database paths**: Ensure the folder containing `--sqlite-path` exists and is writable before starting `uhcr serve`.
3. **Limit iterations in shared environments**: Avoid running benchmark suites with high iterations on live production instances; benchmark routines lock vector units.

---

## Troubleshooting

### Command `uhcr` Not Found
*Cause*: Python local bin directory is not part of the shell `PATH` environment variable.  
*Solution*: Add the Python user base binaries folder (typically `~/.local/bin` on Linux or `%APPDATA%\Python` on Windows) to your system path.

### Port 50051 Binding Conflict
*Cause*: Another instance of `uhcr serve` or another service (e.g. Docker container) is holding the port.  
*Solution*: Identify the locking PID using `lsof -i :50051` (Linux) or `netstat -ano \| findstr 50051` (Windows) and terminate the process, or start the server using `--grpc-port 50052`.

---

## Related Documentation

- [Quick Start Guide](#/docs/quickstart)
- [API Reference](#/docs/api-reference)
- [Distributed Networking](#/docs/network)
- [Performance Tuning](#/docs/benchmarks)

## Next Steps

- Previous: [API Reference](#/docs/api-reference)
- Home: [Documentation Home](#/)
- Next: [Reference Index](#/docs/reference)
