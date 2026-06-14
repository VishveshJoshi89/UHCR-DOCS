# Installation Guide

## Executive Summary

The Universal Hardware-Aware Compute Runtime (UHCR) is distributed as a lightweight Python package accompanied by a C++ native compilation safety layer. This guide describes the system prerequisites, package installation procedures, custom source builds, and post-installation sanity checks required to establish a fully optimized, secure execution environment across diverse operating systems and computing backends.

## Table of Contents

- [System Prerequisites](#/docs/installation#system-prerequisites)
- [Standard Package Installation](#/docs/installation#standard-package-installation)
- [Building Native Safety Components](#/docs/installation#building-native-safety-components)
- [Advanced Source Build](#/docs/installation#advanced-source-build)
- [Best Practices](#/docs/installation#best-practices)
- [Limitations](#/docs/installation#limitations)
- [Troubleshooting](#/docs/installation#troubleshooting)

---

## System Prerequisites

Before initiating the installation, ensure the target host system meets the following software and hardware requirements:

### Operating System Compatibility
- **Windows**: Windows 10 or 11 (64-bit) with Developer Mode enabled (for symlinks/WSL support).
- **Linux**: Ubuntu 20.04 LTS or newer, Debian 11+, RHEL 8+, or compatible kernel 5.4+.
- **macOS**: macOS 12 (Monterey) or higher (Intel/Apple Silicon).

### Execution Runtimes
- **Python**: Python 3.10, 3.11, or 3.12 (64-bit).
- **Compiler Toolchain (Source Compilation)**:
  - Windows: MSVC v142 or newer (Visual Studio 2019+ with C++ development workload).
  - Linux: GCC 9+ or Clang 10+.
  - macOS: Xcode Command Line Tools.
- **Hardware Drivers**:
  - NVIDIA GPU Acceleration: CUDA Toolkit 11.8 or higher, and NVIDIA Proprietary Drivers (525+).
  - CPU Features: SSE, AVX2, or AVX512 (highly recommended for vector math).

---

## Standard Package Installation

UHCR can be installed directly from the package registry.

### Core Installation
To install the core CPU execution engine, run:
```bash
pip install uhcr
```

### Installation with GPU/CUDA Support
For systems with NVIDIA hardware where GPU acceleration is desired, install the CUDA plugin dependencies:
```bash
pip install uhcr[cuda]
```

---

## Building Native Safety Components

The core JIT engine executes native machine code. To prevent thermal damage and bounds violations, you must compile the C++ safety monitor library on your host device.

Run the built-in python compiler wrapper:
```bash
python -m uhcr.native.build_native
```

This script will discover the local compiler (MSVC, GCC, or Clang) and generate the platform-specific library:
- Windows: `safety_monitor.dll`
- Linux: `safety_monitor.so`
- macOS: `safety_monitor.dylib`

---

## Advanced Source Build

To build and compile the entire runtime from source, follow this workflow:

1. Clone the repository:
   ```bash
   git clone https://github.com/VishveshJoshi89/UHCR.git
   cd UHCR
   ```

2. Establish a virtual environment and install development tools:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install --upgrade pip setuptools build
   pip install -e ".[dev]"
   ```

3. Build the CMake components:
   ```bash
   cd uhcr/native
   mkdir build && cd build
   cmake -DCMAKE_BUILD_TYPE=Release ..
   cmake --build .
   ```

---

## Verification Steps

Execute the following script to verify the integrity of the installation and hardware profiles:

```python
import uhcr

# Verify hardware detection
profile = uhcr.detect()
print(f"System OS: {profile.os}")
print(f"Detected CPU: {profile.cpu.brand}")
print(f"SIMD Support: AVX2={profile.cpu.has_avx2}, AVX512={profile.cpu.has_avx512}")
print(f"Detected GPU: {profile.gpu.name} (CUDA={profile.gpu.cuda_available})")

# Test compilation path
@uhcr.jit(eager=True, verbose=True)
def test_add(a, b):
    return a + b

assert test_add(40, 2) == 42
print("Verification complete. UHCR is operational!")
```

---

## Best Practices

- **Isolate in Virtualenvs**: Always install UHCR inside isolated virtual environments (`venv` or `conda`) to avoid package dependency conflicts.
- **Explicit CUDA Versioning**: Ensure the host CUDA runtime version matches the target SDK (e.g., CUDA 12.x hosts require `uhcr[cuda]` matched to CUDA 12 runtimes).
- **Compile in Production**: Always run the native build compilation during CI/CD steps so the safety monitor is active in production.

---

## Limitations

- **No 32-bit Support**: UHCR is compile-optimized for 64-bit architectures (x86_64, aarch64). 32-bit execution is not supported.
- **Docker Environments**: Host CPU feature propagation requires setting the correct virtualization flags. Refer to the containerization guide for details.

---

## Troubleshooting

### C++ Compiler Missing
```
Error: C++17 compatible compiler not found.
```
**Solution**: Ensure GCC, Clang, or MSVC is installed and added to the host environment `PATH` variable.

### CUDA Device Unavailable
```
RuntimeError: CUDA driver found but device not initialized.
```
**Solution**: Verify the CUDA drivers are correctly loaded by running `nvidia-smi` on the host command line.

---

## Related Documentation

- [Introduction to UHCR](#/docs/introduction)
- [Quick Start Guide](#/docs/quickstart)
- [Security & Safety Architecture](#/docs/safety)

## Next Steps

Continue with:

- Previous: [Introduction to UHCR](#/docs/introduction)
- Home: [Documentation Home](#/)
- Next: [Quick Start Guide](#/docs/quickstart)
