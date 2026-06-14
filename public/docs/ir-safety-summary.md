# IR Safety Verification

## Executive Summary

The Universal Hardware-Aware Compute Runtime (UHCR) integrates safety verification directly into the Intermediate Representation (IR) generation phase. By executing temperature and status checks inside the `IRBuilder` and the `Function` class, UHCR prevents resource-intensive compilation steps before machine code is generated. This document outlines the IR-level hooks, the integration testing suite, and future design enhancements.

## Table of Contents

- [IR Builder Validation (`ir_builder.py`)](#/docs/ir-safety-summary#ir-builder-validation-ir_builderpy)
- [Function Complexity Control (`ir.py`)](#/docs/ir-safety-summary#function-complexity-control-irpy)
- [Testing & Validation Suite](#/docs/ir-safety-summary#testing--validation-suite)
- [IR Safety Coverage Analysis](#/docs/ir-safety-summary#ir-safety-coverage-analysis)
- [Integration Strategy Principles](#/docs/ir-safety-summary#integration-strategy-principles)
- [Best Practices](#/docs/ir-safety-summary#best-practices)
- [Troubleshooting](#/docs/ir-safety-summary#troubleshooting)

---

## IR Builder Validation (`ir_builder.py`)

The `IRBuilder` class loads the safety monitor during instantiation:

- **Path**: [`uhcr/compiler/ir_builder.py`](file:///c:/Users/dell/source/repos/VishveshJoshi89/UHCR/uhcr/compiler/ir_builder.py)
- **Safety Method**: `_emit()`

### Verification Rules
- **Emergency Flag**: If the safety monitor reports an active emergency stop, all instruction emissions are blocked immediately.
- **CPU Thermal Checks**: Before appending vector math (`VADD`, `VSUB`, `VMUL`, `VDIV`, `VFMADD`) or vectorized memory load/stores (`VLOAD`, `VSTORE`), the builder polls CPU temperature.
- **GPU Thermal Checks**: Matrix multiplications (`MATMUL`) and tensor-level activations (`RELU`) trigger GPU temperature validation if targeted at CUDA execution.

> [!NOTE]
> **Selective Overhead**: To maintain performance, standard scalar arithmetic (e.g. `ADD`, `FADD`) does not trigger thermal polling.

---

## Function Complexity Control (`ir.py`)

To prevent thermal build-up and core pinning during complex IR lowering passes, the `Function` class manages complexity limits.

- **Path**: [`uhcr/compiler/ir.py`](file:///c:/Users/dell/source/repos/VishveshJoshi89/UHCR/uhcr/compiler/ir.py)
- **Safety Methods**: `create_block()`, `validate()`

### Complexity Guards
1. **Block Threshold**: If a function exceeds **1,000 basic blocks**, every additional block instantiation triggers a CPU temperature check.
2. **Emergency Stop**: If an emergency shutdown is active, block creation and validation calls raise a `RuntimeError` immediately.

---

## Testing & Validation Suite

A dedicated test suite is located at [`tests/test_ir_safety.py`](file:///c:/Users/dell/source/repos/VishveshJoshi89/UHCR/tests/test_ir_safety.py) containing validation routines for:

- **Scalar Verification**: Confirms that scalar arithmetic runs without thermal overhead.
- **Vector Verification**: Verifies that vector instruction emissions raise appropriate errors under high temperature.
- **Complex Block Limits**: Simulates functions with >1,000 blocks to trigger and test thermal exceptions.
- **Emergency Stops**: Tests immediate abortion of the build graph when the stop flag is set.

---

## IR Safety Coverage Analysis

| Feature | Pre-Integration | Post-Integration |
| :--- | :--- | :--- |
| **Early Detection** | ❌ (Checked at codegen only) | ✅ (Checks before IR building) |
| **Pipeline Coverage** | 40% (Backend compilers only) | **100%** (IR Builder + Function classes) |
| **Selective Checks** | ❌ (All or nothing) | ✅ (Checks only vector and matrix operations) |
| **Complexity Capping**| ❌ (No function limits) | ✅ (Blocks >1,000 block compilation on hot CPUs) |

---

## Integration Strategy Principles

1. **Fail-Fast Mechanics**: Abort assembly compilation before codegen to avoid unnecessary thermal stress.
2. **No-Overhead Scalars**: Ensure scalar executions operate with 0% safety latency overhead.
3. **Deterministic Error Messaging**: Return clear error details detailing block limits, temperature levels, and reasons for stop conditions.

---

## Best Practices

1. **Check System Core Saturation**: Ensure code generation tasks are distributed to prevent single-core thermal spikes on complex JIT programs.
2. **Handle IR Exceptions**: JIT code compilation blocks should be wrapped in exception boundaries to handle thermal aborts cleanly.
3. **Profile Vector Instruction Density**: Prior to compilation, use static analysis tools to verify vector math ratios and predict thermal budgets.

---

## Troubleshooting

### Error: "CPU temperature too high for complex function"
*Cause*: A JIT loop or block expansion generated more than 1,000 blocks while the CPU temperature was above the safety limit.  
*Solution*: Simplify the input Python loop structures or separate the execution into smaller, independent functions.

### Exception: "Emergency stop is active"
*Cause*: The safety monitor encountered a critical thermal or power event.  
*Solution*: Cool the host system and restart the python interpreter to reset the safety monitor singleton.

---

## Related Documentation

- [Security & Safety Overview](#/docs/safety)
- [Safety Integration Hook Guide](#/docs/safety-integration)
- [Hardware Protection Scheme Checklist](#/docs/hardware-protection)
- [JIT Compilation Guide](#/docs/jit-guide)

## Next Steps

- Previous: [Safety Integration Hook Guide](#/docs/safety-integration)
- Home: [Documentation Home](#/)
- Next: [Hardware Protection Scheme Checklist](#/docs/hardware-protection)
