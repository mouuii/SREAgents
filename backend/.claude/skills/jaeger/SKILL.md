---
description: 查询 Jaeger 链路追踪数据，分析分布式系统调用链、定位性能瓶颈和错误
---

# Jaeger 链路追踪技能

## 配置
- **Endpoint**: http://localhost:9090
- **API Prefix**: /api

## 可用操作

### 1. 获取所有服务列表
```bash
curl "http://localhost:9090/api/services"
```

### 2. 获取服务的操作列表
```bash
curl "http://localhost:9090/api/services/{service}/operations"
```

### 3. 搜索 Traces
```bash
curl "http://localhost:9090/api/traces?service=api-gateway&limit=20"
```

### 4. 获取单个 Trace 详情
```bash
curl "http://localhost:9090/api/traces/{traceId}"
```

### 5. 获取服务依赖关系图
```bash
curl "http://localhost:9090/api/dependencies"
```

## 可用服务
- `api-gateway` - API 网关入口
- `user-service` - 用户服务
- `order-service` - 订单服务
- `payment-service` - 支付服务
- `inventory-service` - 库存服务

## 分析场景

1. **请求延迟分析**: 查看 trace 中各 span 的 duration，找出耗时最长的服务
2. **错误追踪**: 检查带有 error=true 标签的 span
3. **依赖分析**: 使用 /api/dependencies 查看服务调用关系
4. **瓶颈定位**: 分析调用链中串行和并行操作

## Trace 数据结构

- `traceID`: 全局唯一的追踪标识
- `spanID`: 单个操作的标识
- `operationName`: 操作名称
- `duration`: 耗时（微秒）
- `tags`: 元数据标签（如 http.status_code, error）
- `logs`: 事件日志（错误信息等）
