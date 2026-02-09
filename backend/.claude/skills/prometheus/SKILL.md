---
description: 查询 Prometheus 监控指标，分析服务健康状态、CPU、内存、错误率等运维数据
---

# Prometheus 监控技能

## 配置
- **Endpoint**: http://localhost:9090
- **API Prefix**: /api/v1

## 可用操作

### 1. 查询服务健康状态
```bash
curl "http://localhost:9090/api/v1/query?query=up"
```

### 2. 查询 CPU 使用率
```bash
curl "http://localhost:9090/api/v1/query?query=cpu_usage"
```

### 3. 查询内存使用率
```bash
curl "http://localhost:9090/api/v1/query?query=memory_usage"
```

### 4. 查询错误率
```bash
curl "http://localhost:9090/api/v1/query?query=error_rate"
```

### 5. 查询请求延迟
```bash
curl "http://localhost:9090/api/v1/query?query=request_latency_ms"
```

### 6. 获取所有指标名称
```bash
curl "http://localhost:9090/api/v1/label/__name__/values"
```

## 使用指南

- 当用户询问服务健康状态时，使用 `query=up` 获取所有服务运行状态
- 当用户询问系统性能时，使用 `cpu_usage` 和 `memory_usage` 指标
- 当用户询问错误或故障时，使用 `error_rate` 指标
- 所有查询都是只读的，不会修改任何数据
