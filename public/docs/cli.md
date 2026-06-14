Complete UHCR CLI Command Reference
Installation & Setup

# Install UHCR in development mode

```
pip install -e .
```
# Verify installation

uhcr --version # or uhcr -v
📋 All Commands (16 total)

1. Version & Help
  ```
   uhcr -v # Show version (v5.0.0)
   uhcr --version # Show version
   uhcr -h # Show help
   uhcr --help # Show help
   uhcr <command> -h # Help for specific command
   ```
2. Hardware Detection (uhcr hw)

# Full hardware report with table
```
uhcr hw
```

# JSON format
```
uhcr hw --json
```

# Just the capability fingerprint
```
uhcr hw --fingerprint
```
Output includes: CPU, GPU, memory, cache topology, SIMD features, accelerators

3. Docker Generation (uhcr docker)

# Basic Dockerfile generation
```
uhcr docker script.py
```

# Custom image name and base
```
uhcr docker script.py --image myapp:v1 --base python:3.11-slim
```

# Compiled mode
```
uhcr docker script.py --compiled --output ./build
```

# Full example

uhcr docker app.py --image mycompany/app:latest --base python:3.12-slim --output ./docker
Generates: Dockerfile with UHCR and all plugins installed

4. Kubernetes Manifest (uhcr k8s)

# Basic K8s deployment
```
uhcr k8s script.py --image myapp:v1
```
# With resources and replicas

uhcr k8s script.py --image myapp:v1 \
 --replicas 3 \
 --namespace production \
 --cpu-request 100m \
 --cpu-limit 500m \
 --memory-request 256Mi \
 --memory-limit 1Gi

# Custom output directory

uhcr k8s script.py --image myapp:v1 --output ./k8s-manifests
Generates: deployment.yaml with proper resource requests/limits

5. Compile (uhcr compile)

# Basic compilation
```
uhcr compile script.py
```
# With optimization level (0-3)
```
uhcr compile script.py --optimize 3
```
# Custom output name
```
uhcr compile [file].py --output mycompiled
```
# With target architecture
```
uhcr compile [file].py --target x86_64 --optimize 3
```
# Run compiled module

python script.uhcrc/
Creates: Enterprise-grade compiled module with:

Source code preservation
SHA-256 checksums
Metadata & provenance tracking
README & LICENSE
Integrity verification 6. Run (uhcr run)

# Run with UHCR runtime
```
uhcr run [filename].py
```
# With JIT compilation

uhcr run script.py --jit

# Force specific backend

uhcr run script.py --backend cuda
uhcr run script.py --backend cpu

# With specific plugins

uhcr run script.py --plugin myplugin --plugin another

# Disable all plugins

uhcr run script.py --no-plugins

# Pass arguments to script

uhcr run script.py arg1 arg2 arg3 7. Optimize (uhcr optimize)

# Optimize code

uhcr optimize script.py

# With optimization level

uhcr optimize script.py --level 3

# With profiling

uhcr optimize script.py --profile

# Custom output and report

uhcr optimize script.py --output optimized.py --report report.txt --level 3 8. Server Management (uhcr serve / uhcr stop)

# Start UHCR server

uhcr serve --host 0.0.0.0 --grpc-port 50051 --http-port 8080 --workers 4

# With config file

uhcr serve --config ~/.uhcr/config.toml

# With Redis and SQLite

uhcr serve --redis-url redis://localhost:6379 --sqlite-path /var/lib/uhcr/data.db

# As daemon

uhcr serve --daemon

# Stop server

uhcr stop --port 50051
uhcr stop --force 9. MCP Server (uhcr mcp_start / uhcr mcp_stop)

# Start MCP server for AI agents

uhcr mcp_start

# With custom port and transport

uhcr mcp_start --transport http --port 3000

# With logging and daemon mode

uhcr mcp_start --log-level DEBUG --daemon

# Stop MCP server

uhcr mcp_stop
uhcr mcp_stop --port 3000 --force
MCP Tools Available:

compile_code
optimize_code
detect_hardware
run_benchmark
generate_docker
generate_k8s
analyze_performance
list_backends
manage_plugins 10. Plugin Management (uhcr plugin)

# List all plugins

uhcr plugin list

# Plugin information

uhcr plugin info example_plugin

# Enable/disable plugins

uhcr plugin enable myplugin
uhcr plugin disable myplugin 11. Analytics (uhcr analytics)

# View job analytics

uhcr analytics job-123

# Compare jobs

uhcr analytics job-123 --compare job-456

# Different output formats

uhcr analytics job-123 --format json
uhcr analytics job-123 --format html
uhcr analytics job-123 --format table 12. Monitoring (uhcr monitor)

# Monitor system resources

uhcr monitor

# Custom interval

uhcr monitor --interval 2

# JSON output

uhcr monitor --json

# Limited duration

uhcr monitor --interval 1 --duration 60 13. Benchmarks (uhcr benchmark)

# List available benchmarks

uhcr benchmark --list

# Run default benchmark

uhcr benchmark

# Run specific suite

uhcr benchmark --suite tensor
uhcr benchmark --suite simd
uhcr benchmark --suite memory

# Save results

uhcr benchmark --suite tensor --output results.json 14. System Info (uhcr info)

# Basic system info

uhcr info

# Show available backends

uhcr info --backends

# Show installed plugins

uhcr info --plugins 15. Test Suite (uhcr test)

# Run tests

uhcr test

# With coverage

uhcr test --coverage

# Verbose output

uhcr test --verbose -v 16. Global Options

# Enable debug mode (shows stack traces)

export UHCR_DEBUG=1
uhcr compile script.py

# Disable integrity verification

export UHCR_VERIFY_INTEGRITY=0
python module.uhcrc/
🎯 Common Workflows
Development Workflow

# 1. Check hardware

uhcr hw --fingerprint

# 2. Develop and test

uhcr run app.py --jit

# 3. Optimize

uhcr optimize app.py --level 3 --profile

# 4. Run tests

uhcr test --coverage
Production Deployment

# 1. Compile for production

uhcr compile app.py --optimize 3

# 2. Generate Docker image

uhcr docker app.uhcrc/ --image myapp:v1.0

# 3. Generate K8s manifest

uhcr k8s app.uhcrc/ --image myapp:v1.0 --replicas 5 --cpu-request 500m --memory-request 1Gi

# 4. Deploy

kubectl apply -f deployment.yaml
AI Agent Integration

# Start MCP server for AI agents

uhcr mcp_start --transport http --port 3000 --daemon

# AI agents can now use UHCR tools via MCP

# Stop when done

uhcr mcp_stop --port 3000
📊 Quick Stats
Total Commands: 16
Enterprise Features: ✅ Security, Integrity, Auditing
Containerization: ✅ Docker & Kubernetes
AI Integration: ✅ MCP Server
Hardware Detection: ✅ Full CPU/GPU/Memory profiling
