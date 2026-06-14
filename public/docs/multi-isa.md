# Multi-ISA Support

## Executive Summary

UHCR includes JIT compilation backends for three instruction set architectures: x86_64, AArch64, and RISC-V. A single IR module can be lowered to native code for any of these targets without modification. On the host architecture, generated code is executed directly using aligned executable memory. On non-native architectures, the backends produce correct binary output for cross-compilation and embedded deployment.

## Table of Contents

- [Architecture Overview](#/docs/multi-isa#architecture-overview)
- [x86_64 Backend](#/docs/multi-isa#x86_64-backend)
- [AArch64 Backend](#/docs/multi-isa#aarch64-backend)
- [RISC-V Backend](#/docs/multi-isa#risc-v-backend)
- [Cross-Compilation Workflow](#/docs/multi-isa#cross-compilation-workflow)
- [Adding a New ISA Target](#/docs/multi-isa#adding-a-new-isa-target)
- [Best Practices](#/docs/multi-isa#best-practices)
- [Troubleshooting](#/docs/multi-isa#troubleshooting)

---

## Architecture Overview

| ISA | Module | Vector Support | Calling Convention |
| :--- | :--- | :--- | :--- |
| x86_64 | `uhcr.compiler.x86_64` | AVX2 (256-bit YMM) | Win64 + SysV AMD64 |
| AArch64 | `uhcr.compiler.aarch64` | NEON (128-bit 4S) | AAPCS64 |
| RISC-V | `uhcr.compiler.riscv` | RVV 1.0 (scalable) | LP64D |

All three backends share the same IR input format. Backend selection at runtime uses the `HardwareProfile` to pick the highest-priority available target.

---

## x86_64 Backend

The x86_64 backend compiles IR to native machine code and executes it directly on the host. It supports both Windows x64 and System V AMD64 calling conventions, selected automatically at runtime.

### Supported Instructions

**Scalar (64-bit GPR):**
- `ADD`, `SUB`, `MUL` — integer arithmetic
- `FADD`, `FSUB`, `FMUL`, `FDIV` — scalar float (via SSE2 XMM registers)
- `LOAD`, `STORE` — memory with offset computation
- `CMP`, `BR`, `JMP`, `RET` — control flow

**Vector (AVX2, 256-bit YMM):**
- `VLOAD`, `VSTORE` — aligned 256-bit load/store
- `VADD`, `VSUB`, `VMUL`, `VDIV` — element-wise float operations
- `VFMADD` — fused multiply-add (requires FMA CPUID flag)
- `MATMUL` — triple-nested loop with SSE scalar fallback

### Register Allocation

| Register | Usage |
| :--- | :--- |
| `RBP` | Frame pointer |
| `RBX`, `RSI`, `RDI` | Callee-saved (MATMUL loop counters) |
| `R10`, `R11` | Scratch temporaries |
| `YMM0`–`YMM5` | Vector operands |
| `RCX`/`RDI`, `RDX`/`RSI`, `R8`/`RDX`, `R9`/`RCX` | Arguments (Win64 / SysV, respectively) |

---

## AArch64 Backend

The AArch64 backend generates ARM64 machine code with NEON SIMD support. On ARM64 hosts (Apple Silicon, AWS Graviton), generated code is executed natively. On x86 hosts, the backend produces valid AArch64 binary output for cross-compilation.

### Apple Silicon Support

On macOS ARM64 (M-series processors), UHCR allocates executable memory using Darwin's `MAP_JIT` flag, satisfying Hardened Runtime requirements.

```python
from uhcr.compiler.aarch64.apple_silicon import AppleSiliconInfo

info = AppleSiliconInfo.detect()
if info.is_apple_silicon:
    print(f"Chip generation: {info.chip_generation}")
    # info.supports_map_jit is True on macOS ARM64
```

### Assembler API

```python
from uhcr.compiler.aarch64.assembler import AArch64Assembler, X0, X1, V0, V1, V2

asm = AArch64Assembler()
asm.add_reg(X0, X1, X0)   # ADD X0, X1, X0
asm.fadd_4s(V0, V1, V2)   # FADD V0.4S, V1.4S, V2.4S
asm.ld1_4s(V0, X0)        # LD1 {V0.4S}, [X0]
asm.ret()                  # RET
code = asm.get_bytes()
```

### Supported Instructions

**Data Processing:**

| Mnemonic | Operation |
| :--- | :--- |
| `add_reg`, `sub_reg`, `mul_reg` | 64-bit register arithmetic |
| `add_imm`, `sub_imm` | Immediate arithmetic |
| `mov_reg`, `movz` | Register and immediate moves |

**NEON SIMD (128-bit, 4S float arrangement):**

| Mnemonic | Operation |
| :--- | :--- |
| `fadd_4s`, `fsub_4s`, `fmul_4s` | Vector element-wise arithmetic |
| `fmla_4s` | Fused multiply-accumulate: `Vd += Vn * Vm` |
| `ld1_4s`, `st1_4s` | Vector load / store |

**Memory:**

| Mnemonic | Operation |
| :--- | :--- |
| `ldr_reg`, `str_reg` | Scaled-offset load / store |
| `stp_pre`, `ldp_post` | Pair load / store (prologue / epilogue) |

**Control Flow:**

| Mnemonic | Operation |
| :--- | :--- |
| `b`, `b_cond` | Unconditional and conditional branch |
| `cmp_reg` | Compare (sets condition flags) |
| `ret` | Return via link register |

### Code Generator

```python
from uhcr.compiler.aarch64.codegen import AArch64CodeGenerator
from uhcr.compiler.ir import Type
from uhcr.compiler.ir_builder import IRBuilder

builder = IRBuilder()
builder.new_module()
func = builder.new_function("add", [Type.I64, Type.I64], Type.I64)
entry = func.create_block("entry")
builder.set_block(entry)
builder.ret(builder.add(func.arguments[0], func.arguments[1]))

codegen = AArch64CodeGenerator(func)
arm_code = codegen.compile()  # Returns AArch64 machine code bytes
```

---

## RISC-V Backend

The RISC-V backend generates RV64GCV machine code with optional Vector extension (RVV 1.0) support. Execution on x86 hosts produces cross-compilation output only.

### Assembler API

```python
from uhcr.compiler.riscv.assembler import RISCVAssembler, A0, A1, T0, T1, ZERO

asm = RISCVAssembler()
asm.add(A0, A1, T0)           # add a0, a1, t0
asm.vsetvli(T0, A0, sew=32)   # vsetvli t0, a0, e32, m1
asm.vle32(0, T0)              # vle32.v v0, (t0)
asm.vfadd_vv(2, 0, 1)         # vfadd.vv v2, v0, v1
asm.vse32(2, T0)              # vse32.v v2, (t0)
asm.ret()
code = asm.get_bytes()
```

### Supported Instructions

**RV64I Base:**

| Mnemonic | Operation |
| :--- | :--- |
| `add`, `sub`, `addi` | Integer arithmetic |
| `ld`, `sd`, `lw`, `sw` | Memory load / store |
| `beq`, `bne`, `blt`, `bge` | Conditional branches |
| `jal`, `jalr`, `ret` | Jumps and returns |

**RV64M Extension:**

| Mnemonic | Operation |
| :--- | :--- |
| `mul` | Integer multiply |
| `slli` | Shift left logical immediate |

**RVV 1.0 (Vector Extension):**

| Mnemonic | Operation |
| :--- | :--- |
| `vsetvli` | Configure vector unit (SEW, LMUL) |
| `vle32`, `vse32` | Vector load / store (32-bit elements) |
| `vfadd_vv`, `vfsub_vv`, `vfmul_vv` | Vector float arithmetic |
| `vfmacc_vv` | Vector fused multiply-accumulate |

### Code Generator

```python
from uhcr.compiler.riscv.codegen import RISCVCodeGenerator

codegen = RISCVCodeGenerator(func, has_rvv=True)
rv_code = codegen.compile()  # Returns RISC-V machine code bytes
```

Set `has_rvv=False` to generate RV64GC output without the Vector extension.

---

## Cross-Compilation Workflow

Build IR once, then lower it to multiple target binaries.

```python
from uhcr.compiler.ir import Type
from uhcr.compiler.ir_builder import IRBuilder
from uhcr.compiler.aarch64.codegen import AArch64CodeGenerator
from uhcr.compiler.riscv.codegen import RISCVCodeGenerator
import uhcr

# Build the IR function once
builder = IRBuilder()
builder.new_module()
func = builder.new_function("compute", [Type.I64, Type.I64], Type.I64)
entry = func.create_block("entry")
builder.set_block(entry)
builder.ret(builder.add(func.arguments[0], func.arguments[1]))

# Native execution (host architecture)
native_result = uhcr.get_runtime().compile(func)

# Cross-compile for ARM64
arm_code = AArch64CodeGenerator(func).compile()
with open("compute_arm64.bin", "wb") as f:
    f.write(arm_code)

# Cross-compile for RISC-V (with RVV)
rv_code = RISCVCodeGenerator(func, has_rvv=True).compile()
with open("compute_rv64.bin", "wb") as f:
    f.write(rv_code)
```

---

## Adding a New ISA Target

Follow this five-step pattern, using the AArch64 and RISC-V implementations as reference:

1. **Create `uhcr/compiler/<isa>/assembler.py`** — Implement instruction encoding; expose register constants and mnemonic methods.
2. **Create `uhcr/compiler/<isa>/codegen.py`** — Implement the IR-to-assembly lowering pass using your assembler.
3. **Add hardware detection in `uhcr/hardware/`** — Extend the `HardwareProfile` to detect the new ISA and report relevant features.
4. **Create a backend in `uhcr/backends/`** — Wire the new `codegen` module to the `Backend` interface; set an appropriate `priority`.
5. **Register in `uhcr/backends/backend_selector.py`** — Add the new backend to the selector's priority list.

---

## Best Practices

1. **Use IR; avoid assembler API in application code**: Construct code via `IRBuilder`. Access the assembler API only when writing a new backend or diagnostic tool.
2. **Test cross-compiled binaries on target hardware**: Cross-compilation output is not validated by the host assembler. Run integration tests on actual ARM64 or RISC-V boards or QEMU.
3. **Prefer RVV `vsetvli` before every vector kernel**: RISC-V vector length is configurable at runtime. Always set SEW and LMUL explicitly before issuing vector instructions.
4. **Use `MAP_JIT` on Apple Silicon**: If you are implementing a third-party backend that allocates executable memory on macOS, use `MAP_JIT | MAP_ANON | MAP_PRIVATE` to comply with W^X policy.

---

## Troubleshooting

### Segfault on Native Execution
*Cause*: Executable memory was not marked with correct permissions (`PROT_EXEC`).  
*Solution*: Ensure the backend allocates memory with `mmap(PROT_READ | PROT_WRITE | PROT_EXEC)` on Linux or uses `MAP_JIT` on macOS.

### Incorrect Results on AArch64 Cross-Compilation
*Cause*: Endianness or ABI mismatch between the assembler and the target linker.  
*Solution*: Confirm the target system uses little-endian AArch64 (standard) and link with `-march=armv8-a`.

### `vsetvli` Rejected on RISC-V Target
*Cause*: The target toolchain was built without `v` extension (`-march=rv64gc` instead of `rv64gcv`).  
*Solution*: Pass `has_rvv=False` to `RISCVCodeGenerator`, or rebuild the toolchain with `-march=rv64gcv`.

---

## Related Documentation

- [How UHCR Works](#/docs/how-uhcr-works)
- [Hardware Detection](#/docs/hardware-reference)
- [Plugin Development Guide](#/docs/plugin-guide)
- [API Reference](#/docs/api-reference)

## Next Steps

- Previous: [Plugin System Reference](#/docs/plugins)
- Home: [Documentation Home](#/)
- Next: [Feature Overview](#/docs/features)
