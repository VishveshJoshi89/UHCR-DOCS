#!/usr/bin/env python3
"""UHCR MCP Server - Debug Enabled Version"""

import asyncio
import json
import sys
import time
import os
from typing import Any, Dict, List, Optional

# --- CRASH TRACKER LOG ---
LOG_FILE = os.path.join(os.path.dirname(__file__), "mcp_errors.log")
def log_debug(message: str):
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {message}\n")

log_debug("Server process triggered by VS Code.")

class MCPServer:
    def __init__(self):
        self.tools = self._register_tools()
        self.resources = self._register_resources()
        log_debug("Tools and Resources initialized successfully.")
        
    def _register_tools(self) -> Dict[str, Dict[str, Any]]:
        return {
            "detect_hardware": {
                "description": "Detect hardware capabilities of the system",
                "inputSchema": {"type": "object", "properties": {"format": {"type": "string", "enum": ["json", "table"], "default": "json"}}}
            },
            "compile_function": {
                "description": "JIT compile a Python function using UHCR",
                "inputSchema": {"type": "object", "properties": {"code": {"type": "string"}}, "required": ["code"]}
            },
            "benchmark": {
                "description": "Run execution performance benchmarks",
                "inputSchema": {"type": "object", "properties": {"code": {"type": "string"}, "iterations": {"type": "integer", "default": 1000}}, "required": ["code"]}
            },
            "list_backends": {
                "description": "List all registered system execution backends",
                "inputSchema": {"type": "object", "properties": {}}
            },
            "optimize_ir": {
                "description": "Optimize intermediate representation layouts",
                "inputSchema": {"type": "object", "properties": {"ir_code": {"type": "string"}}, "required": ["ir_code"]}
            }
        }
    
    def _register_resources(self) -> Dict[str, Dict[str, Any]]:
        return {
            "hardware://profile": {"description": "Hardware profile metadata", "mimeType": "application/json"},
            "backends://available": {"description": "Enabled target backends", "mimeType": "application/json"},
            "cache://stats": {"description": "JIT compilation cache statistics", "mimeType": "application/json"}
        }
    
    async def handle_initialize(self, params: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "protocolVersion": "2024-11-05",
            "capabilities": {"tools": {"listChanged": False}, "resources": {"subscribe": False, "listChanged": False}},
            "serverInfo": {"name": "uhcr-mcp-server", "version": "1.0.0"}
        }
    
    async def handle_tools_list(self) -> Dict[str, Any]:
        return {"tools": [{"name": k, "description": v["description"], "inputSchema": v["inputSchema"]} for k, v in self.tools.items()]}
    
    async def handle_tools_call(self, name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        handlers = {"detect_hardware": self._tool_detect_hardware, "compile_function": self._tool_compile_function, "benchmark": self._tool_benchmark, "list_backends": self._tool_list_backends, "optimize_ir": self._tool_optimize_ir}
        if name in handlers: return await handlers[name](arguments)
        raise ValueError(f"Unknown tool target: {name}")
    
    async def handle_resources_list(self) -> Dict[str, Any]:
        return {"resources": [{"uri": k, "name": k.split("://")[1], "description": v["description"], "mimeType": v["mimeType"]} for k, v in self.resources.items()]}
    
    async def handle_resources_read(self, uri: str) -> Dict[str, Any]:
        handlers = {"hardware://profile": self._resource_hardware_profile, "backends://available": self._resource_backends, "cache://stats": self._resource_cache_stats}
        if uri in handlers: return await handlers[uri]()
        raise ValueError(f"Unknown target resource URI request: {uri}")
    
    async def _tool_detect_hardware(self, args: Dict[str, Any]) -> Dict[str, Any]:
        try:
            import uhcr
            profile = uhcr.detect()
            content = profile.format_table() if args.get("format") == "table" else profile.to_json()
            return {"content": [{"type": "text", "text": content}]}
        except Exception as e:
            return {"content": [{"type": "text", "text": f"Hardware discovery error: {str(e)}"}], "isError": True}
    
    async def _tool_compile_function(self, args: Dict[str, Any]) -> Dict[str, Any]:
        try:
            import uhcr
            code = args["code"]
            namespace = {"uhcr": uhcr}
            exec(code, namespace)
            func_name = next((k for k, v in namespace.items() if callable(v) and hasattr(v, "_python_fn")), None)
            output = f"Successfully JIT Compiled: {func_name}" if func_name else "Compilation Failed: Missing @uhcr.jit"
            return {"content": [{"type": "text", "text": output}]}
        except Exception as e:
            return {"content": [{"type": "text", "text": f"JIT failure: {str(e)}"}], "isError": True}
    
    async def _tool_benchmark(self, args: Dict[str, Any]) -> Dict[str, Any]:
        try:
            code = args["code"]
            iterations = args.get("iterations", 1000)
            namespace = {}
            exec(code, namespace)
            func = next((v for v in namespace.values() if callable(v) and not v.__name__.startswith("_")), None)
            if not func: raise ValueError("Target executable function missing.")
            start = time.perf_counter()
            for _ in range(iterations): func()
            elapsed = time.perf_counter() - start
            report = f"Metrics - Handle: {func.__name__} | Total Duration: {elapsed:.6f}s"
            return {"content": [{"type": "text", "text": report}]}
        except Exception as e:
            return {"content": [{"type": "text", "text": f"Benchmark error: {str(e)}"}], "isError": True}
    
    async def _tool_list_backends(self, args: Dict[str, Any]) -> Dict[str, Any]:
        try:
            import uhcr
            from uhcr.backends.backend_base import get_registered_backends
            backends = get_registered_backends()
            report = "Available Backends:\n" + "\n".join([f"- {b.name}" for b in backends])
            return {"content": [{"type": "text", "text": report}]}
        except Exception as e:
            return {"content": [{"type": "text", "text": f"Backend fault: {str(e)}"}], "isError": True}
    
    async def _tool_optimize_ir(self, args: Dict[str, Any]) -> Dict[str, Any]:
        return {"content": [{"type": "text", "text": "IR Optimization pipeline active."}]}
    
    async def _resource_hardware_profile(self) -> Dict[str, Any]:
        import uhcr
        return {"contents": [{"uri": "hardware://profile", "mimeType": "application/json", "text": uhcr.detect().to_json()}]}
    
    async def _resource_backends(self) -> Dict[str, Any]:
        from uhcr.backends.backend_base import get_registered_backends
        payload = [{"name": b.name, "priority": b.priority} for b in get_registered_backends()]
        return {"contents": [{"uri": "backends://available", "mimeType": "application/json", "text": json.dumps(payload, indent=2)}]}
    
    async def _resource_cache_stats(self) -> Dict[str, Any]:
        import uhcr
        runtime = uhcr.get_runtime()
        stats = {"cache_size": len(runtime._cache)}
        return {"contents": [{"uri": "cache://stats", "mimeType": "application/json", "text": json.dumps(stats, indent=2)}]}
    
    async def handle_message(self, message: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        method = message.get("method")
        params = message.get("params", {})
        msg_id = message.get("id")
        log_debug(f"Received message method: {method}")
        
        try:
            if method == "initialize": result = await self.handle_initialize(params)
            elif method == "tools/list": result = await self.handle_tools_list()
            elif method == "tools/call": result = await self.handle_tools_call(params.get("name"), params.get("arguments", {}))
            elif method == "resources/list": result = await self.handle_resources_list()
            elif method == "resources/read": result = await self.handle_resources_read(params.get("uri"))
            else: raise ValueError(f"Unsupported method: {method}")
            return {"jsonrpc": "2.0", "id": msg_id, "result": result}
        except Exception as e:
            log_debug(f"Error handling message: {str(e)}")
            return {"jsonrpc": "2.0", "id": msg_id, "error": {"code": -32603, "message": str(e)}}
            
    async def run(self):
        loop = asyncio.get_running_loop()
        log_debug("Entering standard input read loop.")
        while True:
            try:
                line = await loop.run_in_executor(None, sys.stdin.readline)
                if not line: break
                if not line.strip(): continue
                message = json.loads(line.strip())
                response = await self.handle_message(message)
                if response: print(json.dumps(response), flush=True)
            except Exception as e:
                log_debug(f"Loop error: {str(e)}")

async def main():
    try:
        server = MCPServer()
        await server.run()
    except Exception as e:
        log_debug(f"Fatal main error: {str(e)}")

if __name__ == "__main__":
    asyncio.run(main())