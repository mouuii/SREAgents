---
name: prometheus
description: 访问 Prometheus 监控指标数据
icon: 📈
---

## Prometheus Skill

### 配置
- **Endpoint**: http://localhost:9090
- **API Prefix**: /api/v1

### 可用操作

#### 1. 查询服务健康状态
```bash
curl "http://localhost:9090/api/v1/query?query=up"
```

#### 2. 查询 CPU 使用率
```bash
curl "http://localhost:9090/api/v1/query?query=cpu_usage"
```

#### 3. 查询内存使用率
```bash
curl "http://localhost:9090/api/v1/query?query=memory_usage"
```

#### 4. 获取所有指标名称
```bash
curl "http://localhost:9090/api/v1/label/__name__/values"
```

### 使用示例

当用户询问服务健康状态时，使用 query=up 来获取所有服务的运行状态。

当用户询问系统性能时，使用 cpu_usage 和 memory_usage 指标。

### 注意事项
- 所有查询都是只读的，不会修改任何数据
- 请确保 Prometheus 服务正在运行
