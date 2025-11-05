# DocuManager

# Docker运行指南

本指南将帮助您使用Docker快速部署和运行DocuManager应用。

## 前提条件

在开始之前，请确保您的系统已安装以下软件：

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)（对于使用docker-compose的方法）

## 方法一：使用Docker Compose（推荐）

Docker Compose提供了最简单的方式来运行应用，它会自动处理镜像构建、容器创建和数据持久化。

### 步骤1：进入项目目录

```bash
cd /Volumes/SanDisk/NJU/Lib/项目/2024 历史+AI/DocuManager
```

### 步骤2：启动应用

使用以下命令启动应用：

```bash
docker-compose up -d
```

- `-d` 参数表示在后台运行容器
- 首次运行时，Docker将自动构建镜像

### 步骤3：访问应用

应用启动后，您可以通过以下地址访问：

```
http://localhost:8502
```

### 步骤4：查看日志（可选）

如果需要查看应用日志，可以使用以下命令：

```bash
docker-compose logs -f
```

### 步骤5：停止应用

要停止应用，请使用：

```bash
docker-compose down
```

## 方法二：手动使用Docker命令

如果您不想使用Docker Compose，也可以手动执行Docker命令。

### 步骤1：构建Docker镜像

```bash
docker build -t documanager .
```

### 步骤2：运行容器

```bash
docker run -d \
  --name documanager \
  -p 8502:8502 \
  -v documanager_data:/app/data \
  documanager
```

### 步骤3：访问应用

同样，应用可通过 `http://localhost:8502` 访问。

## 数据持久化

应用的数据将保存在Docker卷 `documanager_data` 中，这样即使容器被删除，数据也不会丢失。

## 常见问题

### 端口冲突

如果端口8502已被占用，可以在 `docker-compose.yml` 文件中修改端口映射，例如：

```yaml
ports:
  - "8888:8502"  # 将容器的8502端口映射到主机的8888端口
```

然后重新运行 `docker-compose up -d`。

### 权限问题

如果遇到数据目录权限问题，可以在Dockerfile中添加用户权限设置：

```dockerfile
# 在Dockerfile中添加
RUN chown -R nobody:nogroup /app/data
USER nobody
```

## 自定义配置

您可以通过修改环境变量来自定义应用行为。在 `docker-compose.yml` 中添加或修改 `environment` 部分：

```yaml
environment:
  - DOCUMANAGER_DATA_DIR=/app/data
  - PYTHONUNBUFFERED=1
  - DOCKER_CONTAINER=true
```

## 开发提示

如果您是开发者并希望在本地修改代码后立即看到变化，可以使用以下命令启动应用：

```bash
docker-compose up -d --build
```

这将在每次启动时重新构建镜像。

---

祝您使用愉快！如有任何问题，请参考Docker官方文档或联系项目维护者。