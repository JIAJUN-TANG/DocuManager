# DocuManager
**DocuManager**是一个基于Python开发的人文文档管理系统，它提供了简洁的可视化界面，支持上传、检索和浏览，帮助学者高效管理和组织文档。

## Docker运行指南

本指南将帮助您使用Docker快速部署和运行DocuManager应用。

### 前提条件

在开始之前，请确保您的系统已安装以下软件：

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)（推荐）
- 支持IPv6协议的梯子

#### 使用Docker Compose（推荐）

Docker Compose提供了最简单的方式来运行应用，它会自动处理镜像构建、容器创建和数据持久化。

1. 进入项目目录

```bash
cd /您自己的路径/DocuManager
```

2. 启动应用

使用以下命令启动应用：

```bash
docker-compose up -d
```

如果提示各种网络错误，可以尝试优先使用以下命令拉取Python镜像后再重复执行`docker-compose up -d`：

```bash
docker pull python:3.10-slim
```

- `-d` 参数表示在后台运行容器
- 首次运行时，Docker将自动构建镜像

3. 访问应用

应用启动后，您可以通过以下地址访问：

```
http://localhost:8501
```

4. 查看日志（可选）

如果需要查看应用日志，可以使用以下命令：

```bash
docker-compose logs -f
```

5. 停止应用

要停止应用，请使用：

```bash
docker-compose down
```

#### 使用Docker命令

如果您不想使用Docker Compose，也可以手动执行Docker命令。

1. 构建Docker镜像

```bash
docker build -t documanager .
```

2. 运行容器

```bash
docker run -d \
  --name documanager \
  -p 8501:8501 \
  -v documanager_data:/app/data \
  documanager
```

3. 访问应用

同样，应用可通过 `http://localhost:8501` 访问。

### 数据持久化

应用的数据将保存在Docker卷 `documanager_data` 中，这样即使容器被删除，数据也不会丢失。

### 常见问题

1. 端口冲突

如果端口8501已被占用，可以在 `docker-compose.yml` 文件中修改端口映射，例如：

```yaml
ports:
  - "8888:8501"  # 将容器的8501端口映射到主机的8888端口
```

然后重新运行 `docker-compose up -d`。

2. 权限问题

如果遇到数据目录权限问题，可以在Dockerfile中添加用户权限设置：

```dockerfile
# 在Dockerfile中添加
RUN chown -R nobody:nogroup /app/data
USER nobody
```

3. 自定义配置

您可以通过修改环境变量来自定义应用行为。在 `docker-compose.yml` 中添加或修改 `environment` 部分：

```yaml
environment:
  - DOCUMANAGER_DATA_DIR=/app/data
  - PYTHONUNBUFFERED=1
  - DOCKER_CONTAINER=true
```

4. 开发提示

如果您是开发者并希望在本地修改代码后立即看到变化，可以使用以下命令启动应用：

```bash
docker-compose up -d --build
```

这将在每次启动时重新构建镜像。