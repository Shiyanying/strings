# 部署指南

## 修复的问题

1. **服务器监听地址问题**：修复了 server.js 中服务器未绑定到 `0.0.0.0` 的问题，确保 Docker 容器内的服务可以被外部访问
2. **添加 .dockerignore**：排除不必要的文件，优化镜像构建
3. **添加健康检查**：docker-compose.yml 中添加了健康检查机制
4. **添加日志管理**：配置了日志文件大小限制，防止磁盘占用过大
5. **优化 Dockerfile**：添加了 wget 工具用于健康检查，设置了正确的目录权限

## 部署步骤

### 1. 清理旧容器和镜像（如果存在）

```bash
# 停止并删除旧容器
docker-compose down

# 可选：删除旧镜像以确保使用最新代码
docker-compose down --rmi all
```

### 2. 构建并启动服务

```bash
# 构建并启动容器
docker-compose up -d --build

# 查看日志
docker-compose logs -f
```

### 3. 验证部署

```bash
# 检查容器状态
docker-compose ps

# 检查健康状态
docker inspect --format='{{.State.Health.Status}}' immersive-reader

# 测试 API 接口
curl http://localhost:3000/api/books

# 访问前端页面
# 浏览器打开: http://localhost:3000
```

### 4. 查看日志

```bash
# 实时查看日志
docker-compose logs -f app

# 查看最近100行日志
docker-compose logs --tail=100 app
```

### 5. 故障排查

如果仍然无法访问，请检查：

```bash
# 1. 检查容器是否正在运行
docker ps | grep immersive-reader

# 2. 检查端口是否被占用
netstat -ano | findstr :3000

# 3. 进入容器检查
docker exec -it immersive-reader sh
# 在容器内运行:
# wget -O- http://localhost:3000/api/books

# 4. 检查防火墙设置
# 确保3000端口没有被防火墙阻止
```

## 生产环境建议

1. **使用 nginx 反向代理**：在生产环境中建议在前面加一层 nginx
2. **HTTPS 配置**：配置 SSL 证书启用 HTTPS
3. **数据备份**：定期备份 `./data` 目录
4. **监控告警**：配置容器监控和告警
5. **资源限制**：在 docker-compose.yml 中添加 CPU 和内存限制

## 端口说明

- 3000：应用主端口（HTTP）

## 数据持久化

- `./data` 目录挂载到容器内的 `/app/data`
- 包含 SQLite 数据库和上传的文件
- 确保该目录有足够的磁盘空间

## 停止服务

```bash
# 停止服务但保留数据
docker-compose down

# 停止服务并删除数据卷（谨慎使用）
docker-compose down -v
```
