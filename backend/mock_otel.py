"""
Mock OpenTelemetry Services
模拟 Prometheus + Jaeger 服务，数据相互关联
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import random
import time
import uuid
from datetime import datetime, timedelta
from typing import Dict, List

app = FastAPI(title="Mock OTel Services (Prometheus + Jaeger)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== Shared State (关联数据) ====================

class ServiceState:
    """服务状态 - Prometheus 和 Jaeger 共享"""
    def __init__(self):
        self.services = {
            "api-gateway": {"instance": "10.0.0.1:8080", "healthy": True, "cpu": 0.3, "memory": 0.4, "error_rate": 0.01, "latency_ms": 50},
            "user-service": {"instance": "10.0.0.2:8081", "healthy": True, "cpu": 0.25, "memory": 0.35, "error_rate": 0.02, "latency_ms": 30},
            "order-service": {"instance": "10.0.0.3:8082", "healthy": True, "cpu": 0.4, "memory": 0.5, "error_rate": 0.01, "latency_ms": 45},
            "payment-service": {"instance": "10.0.0.4:8083", "healthy": True, "cpu": 0.35, "memory": 0.45, "error_rate": 0.03, "latency_ms": 80},
            "inventory-service": {"instance": "10.0.0.5:8084", "healthy": True, "cpu": 0.2, "memory": 0.3, "error_rate": 0.01, "latency_ms": 25},
        }
        self.last_update = time.time()
        self.problem_service = None  # 当前有问题的服务
        self.problem_type = None     # 问题类型
    
    def update_state(self):
        """每隔一段时间随机更新状态，模拟真实环境变化"""
        now = time.time()
        
        # 每 30 秒可能切换问题状态
        if now - self.last_update > 30:
            self.last_update = now
            
            # 50% 概率产生问题
            if random.random() < 0.5:
                # 选择一个服务出问题
                self.problem_service = random.choice(list(self.services.keys()))
                self.problem_type = random.choice(["down", "high_cpu", "high_memory", "high_latency", "high_error_rate"])
                
                svc = self.services[self.problem_service]
                
                if self.problem_type == "down":
                    svc["healthy"] = False
                    svc["error_rate"] = 1.0
                elif self.problem_type == "high_cpu":
                    svc["cpu"] = random.uniform(0.85, 0.99)
                    svc["latency_ms"] *= 3
                    svc["error_rate"] = 0.1
                elif self.problem_type == "high_memory":
                    svc["memory"] = random.uniform(0.9, 0.98)
                    svc["latency_ms"] *= 2
                elif self.problem_type == "high_latency":
                    svc["latency_ms"] = random.randint(500, 2000)
                    svc["error_rate"] = 0.15
                elif self.problem_type == "high_error_rate":
                    svc["error_rate"] = random.uniform(0.3, 0.6)
                
                print(f"⚠️  Problem: {self.problem_service} - {self.problem_type}")
            else:
                # 恢复所有服务到正常状态
                self._reset_services()
                self.problem_service = None
                self.problem_type = None
    
    def _reset_services(self):
        """重置所有服务到正常状态"""
        base_states = {
            "api-gateway": {"cpu": 0.3, "memory": 0.4, "error_rate": 0.01, "latency_ms": 50},
            "user-service": {"cpu": 0.25, "memory": 0.35, "error_rate": 0.02, "latency_ms": 30},
            "order-service": {"cpu": 0.4, "memory": 0.5, "error_rate": 0.01, "latency_ms": 45},
            "payment-service": {"cpu": 0.35, "memory": 0.45, "error_rate": 0.03, "latency_ms": 80},
            "inventory-service": {"cpu": 0.2, "memory": 0.3, "error_rate": 0.01, "latency_ms": 25},
        }
        for name, base in base_states.items():
            self.services[name]["healthy"] = True
            self.services[name].update(base)
    
    def get_service(self, name: str) -> dict:
        """获取服务状态，添加一些随机波动"""
        self.update_state()
        svc = self.services.get(name, {}).copy()
        if svc:
            # 添加 ±10% 的随机波动（模拟真实数据）
            svc["cpu"] = min(1.0, max(0.01, svc["cpu"] * random.uniform(0.9, 1.1)))
            svc["memory"] = min(1.0, max(0.01, svc["memory"] * random.uniform(0.95, 1.05)))
            svc["latency_ms"] = max(1, int(svc["latency_ms"] * random.uniform(0.8, 1.2)))
        return svc

# 全局状态
state = ServiceState()

# 模拟的操作名称
OPERATIONS = {
    "api-gateway": ["HTTP GET /api/orders", "HTTP POST /api/users", "HTTP GET /api/products", "HTTP POST /api/checkout"],
    "user-service": ["getUserById", "createUser", "updateUser", "authenticateUser"],
    "order-service": ["createOrder", "getOrderById", "listOrders", "updateOrderStatus"],
    "payment-service": ["processPayment", "refundPayment", "getPaymentStatus", "validateCard"],
    "inventory-service": ["checkStock", "reserveStock", "updateStock", "getProductInventory"],
}

ERROR_MESSAGES = {
    "down": "Connection refused: service unavailable",
    "high_cpu": "Request timeout: CPU overloaded",
    "high_memory": "OutOfMemoryError: heap space exhausted",
    "high_latency": "Gateway timeout after 30000ms",
    "high_error_rate": "Internal server error",
}

# ==================== Prometheus API ====================

@app.get("/")
def root():
    return {
        "status": "ok", 
        "message": "Mock OTel Services (Prometheus + Jaeger)",
        "problem_service": state.problem_service,
        "problem_type": state.problem_type
    }

@app.get("/api/v1/query")
def prometheus_query(query: str):
    """处理 PromQL 查询 - 使用关联数据"""
    timestamp = time.time()
    state.update_state()
    
    results = []
    
    # up 查询 - 服务健康状态
    if query == "up" or query.startswith("up"):
        for name, svc in state.services.items():
            value = "1" if svc["healthy"] else "0"
            results.append({
                "metric": {"__name__": "up", "job": name, "instance": svc["instance"]},
                "value": [timestamp, value]
            })
        return {"status": "success", "data": {"resultType": "vector", "result": results}}
    
    # CPU 使用率
    if "cpu" in query.lower():
        for name in state.services:
            svc = state.get_service(name)
            results.append({
                "metric": {"__name__": "cpu_usage", "job": name, "instance": svc["instance"]},
                "value": [timestamp, f"{svc['cpu']:.2f}"]
            })
        return {"status": "success", "data": {"resultType": "vector", "result": results}}
    
    # 内存使用率
    if "memory" in query.lower() or "mem" in query.lower():
        for name in state.services:
            svc = state.get_service(name)
            results.append({
                "metric": {"__name__": "memory_usage", "job": name, "instance": svc["instance"]},
                "value": [timestamp, f"{svc['memory']:.2f}"]
            })
        return {"status": "success", "data": {"resultType": "vector", "result": results}}
    
    # 错误率
    if "error" in query.lower():
        for name in state.services:
            svc = state.get_service(name)
            results.append({
                "metric": {"__name__": "error_rate", "job": name, "instance": svc["instance"]},
                "value": [timestamp, f"{svc['error_rate']:.3f}"]
            })
        return {"status": "success", "data": {"resultType": "vector", "result": results}}
    
    # 延迟
    if "latency" in query.lower() or "duration" in query.lower():
        for name in state.services:
            svc = state.get_service(name)
            results.append({
                "metric": {"__name__": "request_latency_ms", "job": name, "instance": svc["instance"]},
                "value": [timestamp, str(svc["latency_ms"])]
            })
        return {"status": "success", "data": {"resultType": "vector", "result": results}}
    
    # HTTP 请求率
    if "http" in query.lower() or "request" in query.lower():
        for name in state.services:
            svc = state.get_service(name)
            # 如果服务 down，请求率为 0
            rps = 0 if not svc["healthy"] else random.randint(100, 5000)
            results.append({
                "metric": {"__name__": "http_requests_total", "job": name, "instance": svc["instance"]},
                "value": [timestamp, str(rps)]
            })
        return {"status": "success", "data": {"resultType": "vector", "result": results}}
    
    return {"status": "success", "data": {"resultType": "vector", "result": []}}

@app.get("/api/v1/query_range")
def prometheus_query_range(query: str, start: str = "", end: str = "", step: str = "60s"):
    """处理范围查询"""
    state.update_state()
    now = time.time()
    
    # 生成时序数据
    values = []
    for i in range(6):
        t = now - (5 - i) * 60
        if state.problem_service and "cpu" in query.lower():
            svc = state.get_service(state.problem_service)
            values.append([t, f"{svc['cpu']:.2f}"])
        else:
            values.append([t, f"{random.uniform(0.2, 0.5):.2f}"])
    
    return {
        "status": "success",
        "data": {
            "resultType": "matrix",
            "result": [{"metric": {"job": state.problem_service or "api-gateway"}, "values": values}]
        }
    }

@app.get("/api/v1/label/__name__/values")
def prometheus_label_values():
    """返回所有指标名称"""
    return {
        "status": "success",
        "data": ["up", "cpu_usage", "memory_usage", "error_rate", "request_latency_ms", "http_requests_total"]
    }

# ==================== Jaeger API ====================

def generate_trace_id():
    return uuid.uuid4().hex

def generate_span_id():
    return uuid.uuid4().hex[:16]

def generate_mock_trace(trace_id: str = None):
    """生成一条模拟的链路追踪 - 使用关联数据"""
    state.update_state()
    
    trace_id = trace_id or generate_trace_id()
    start_time = int((datetime.now() - timedelta(minutes=random.randint(1, 10))).timestamp() * 1000000)
    
    spans = []
    service_names = list(state.services.keys())
    
    # 根 span - API Gateway
    gateway_state = state.get_service("api-gateway")
    root_span_id = generate_span_id()
    root_duration = gateway_state["latency_ms"] * 1000  # 转换为微秒
    operation = random.choice(OPERATIONS["api-gateway"])
    
    has_gateway_error = not gateway_state["healthy"] or random.random() < gateway_state["error_rate"]
    
    spans.append({
        "traceID": trace_id,
        "spanID": root_span_id,
        "operationName": operation,
        "references": [],
        "startTime": start_time,
        "duration": root_duration,
        "tags": [
            {"key": "http.method", "type": "string", "value": operation.split()[1] if " " in operation else "GET"},
            {"key": "http.url", "type": "string", "value": operation.split()[-1] if " " in operation else "/"},
            {"key": "http.status_code", "type": "int64", "value": 500 if has_gateway_error else 200},
            {"key": "span.kind", "type": "string", "value": "server"},
            {"key": "error", "type": "bool", "value": has_gateway_error},
        ],
        "logs": [{"timestamp": start_time, "fields": [{"key": "event", "type": "string", "value": "error"}, {"key": "message", "type": "string", "value": ERROR_MESSAGES.get(state.problem_type, "Unknown error")}]}] if has_gateway_error else [],
        "processID": "p1",
        "warnings": None
    })
    
    # 子 span - 下游服务调用
    current_time = start_time + random.randint(1000, 5000)
    parent_span_id = root_span_id
    
    # 调用下游服务
    downstream_services = random.sample(service_names[1:], k=random.randint(2, 4))
    
    for svc_name in downstream_services:
        svc_state = state.get_service(svc_name)
        span_id = generate_span_id()
        duration = svc_state["latency_ms"] * 1000  # 微秒
        op = random.choice(OPERATIONS[svc_name])
        
        # 根据服务状态决定是否有错误
        is_problem_service = (svc_name == state.problem_service)
        has_error = not svc_state["healthy"] or (is_problem_service and random.random() < 0.8) or random.random() < svc_state["error_rate"]
        
        span_tags = [
            {"key": "component", "type": "string", "value": svc_name},
            {"key": "span.kind", "type": "string", "value": "client"},
            {"key": "error", "type": "bool", "value": has_error},
        ]
        
        span_logs = []
        if has_error:
            error_msg = ERROR_MESSAGES.get(state.problem_type, "Request failed") if is_problem_service else "Downstream service error"
            span_logs.append({
                "timestamp": current_time + duration - 1000,
                "fields": [
                    {"key": "event", "type": "string", "value": "error"},
                    {"key": "message", "type": "string", "value": error_msg},
                    {"key": "error.kind", "type": "string", "value": state.problem_type or "unknown"}
                ]
            })
        
        spans.append({
            "traceID": trace_id,
            "spanID": span_id,
            "operationName": op,
            "references": [{"refType": "CHILD_OF", "traceID": trace_id, "spanID": parent_span_id}],
            "startTime": current_time,
            "duration": duration,
            "tags": span_tags,
            "logs": span_logs,
            "processID": f"p{service_names.index(svc_name) + 1}",
            "warnings": None
        })
        
        current_time += duration + random.randint(500, 2000)
    
    processes = {f"p{i+1}": {"serviceName": svc, "tags": []} for i, svc in enumerate(service_names)}
    
    return {
        "traceID": trace_id,
        "spans": spans,
        "processes": processes,
        "warnings": None
    }

@app.get("/api/services")
def jaeger_services():
    """获取所有服务列表"""
    service_names = list(state.services.keys())
    return {"data": service_names, "total": len(service_names), "limit": 0, "offset": 0, "errors": None}

@app.get("/api/services/{service}/operations")
def jaeger_operations(service: str):
    """获取服务的所有操作"""
    ops = OPERATIONS.get(service, [])
    return {"data": ops, "total": len(ops), "limit": 0, "offset": 0, "errors": None}

@app.get("/api/traces")
def jaeger_traces(service: str = "", operation: str = "", limit: int = 20, lookback: str = "1h"):
    """搜索 traces - 使用关联数据"""
    traces = []
    for _ in range(min(limit, 20)):
        trace = generate_mock_trace()
        traces.append(trace)
    
    return {"data": traces, "total": len(traces), "limit": limit, "offset": 0, "errors": None}

@app.get("/api/traces/{trace_id}")
def jaeger_trace(trace_id: str):
    """获取单个 trace 详情"""
    trace = generate_mock_trace(trace_id=trace_id)
    return {"data": [trace], "total": 1, "limit": 0, "offset": 0, "errors": None}

@app.get("/api/dependencies")
def jaeger_dependencies(endTs: int = None, lookback: int = None):
    """获取服务依赖关系 - 反映当前问题状态"""
    state.update_state()
    
    dependencies = [
        {"parent": "api-gateway", "child": "user-service", "callCount": random.randint(100, 1000)},
        {"parent": "api-gateway", "child": "order-service", "callCount": random.randint(100, 1000)},
        {"parent": "order-service", "child": "payment-service", "callCount": random.randint(50, 500)},
        {"parent": "order-service", "child": "inventory-service", "callCount": random.randint(50, 500)},
        {"parent": "user-service", "child": "order-service", "callCount": random.randint(20, 200)},
    ]
    
    # 如果有问题服务，降低其调用量
    if state.problem_service:
        for dep in dependencies:
            if dep["child"] == state.problem_service:
                dep["callCount"] = int(dep["callCount"] * 0.1)  # 调用量降到 10%
                dep["errorCount"] = int(dep["callCount"] * 0.5)  # 50% 错误
    
    return {"data": dependencies, "errors": None}

# ==================== Debug API ====================

@app.get("/debug/state")
def debug_state():
    """调试接口：查看当前状态"""
    state.update_state()
    return {
        "problem_service": state.problem_service,
        "problem_type": state.problem_type,
        "services": {name: state.get_service(name) for name in state.services}
    }

@app.post("/debug/trigger/{problem_type}")
def debug_trigger(problem_type: str, service: str = "payment-service"):
    """调试接口：手动触发问题"""
    if problem_type not in ["down", "high_cpu", "high_memory", "high_latency", "high_error_rate", "reset"]:
        return {"error": "Invalid problem type"}
    
    if problem_type == "reset":
        state._reset_services()
        state.problem_service = None
        state.problem_type = None
        return {"message": "All services reset to normal"}
    
    state.problem_service = service
    state.problem_type = problem_type
    state.last_update = time.time()
    
    svc = state.services[service]
    if problem_type == "down":
        svc["healthy"] = False
        svc["error_rate"] = 1.0
    elif problem_type == "high_cpu":
        svc["cpu"] = 0.95
        svc["latency_ms"] = 500
        svc["error_rate"] = 0.2
    elif problem_type == "high_memory":
        svc["memory"] = 0.95
        svc["latency_ms"] = 300
    elif problem_type == "high_latency":
        svc["latency_ms"] = 2000
        svc["error_rate"] = 0.15
    elif problem_type == "high_error_rate":
        svc["error_rate"] = 0.5
    
    return {"message": f"Triggered {problem_type} on {service}", "service_state": svc}

# ==================== Main ====================

if __name__ == "__main__":
    import uvicorn
    print("🚀 Mock OTel Services running at http://localhost:9090")
    print("   📊 Prometheus API: /api/v1/query, /api/v1/query_range")
    print("   🔍 Jaeger API: /api/services, /api/traces, /api/dependencies")
    print("   🔧 Debug API: /debug/state, /debug/trigger/{problem_type}")
    print("")
    print("💡 Trigger problems manually:")
    print("   curl -X POST 'http://localhost:9090/debug/trigger/high_cpu?service=payment-service'")
    print("   curl -X POST 'http://localhost:9090/debug/trigger/reset'")
    uvicorn.run(app, host="0.0.0.0", port=9090)
