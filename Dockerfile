# 使用Python官方镜像作为基础镜像
FROM python:3.10-slim

# 设置工作目录
WORKDIR /app

# 复制requirements.txt文件并安装依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制项目所有文件
COPY . .

# 创建数据目录
RUN mkdir -p /app/data

# 设置环境变量
ENV DOCUMANAGER_DATA_DIR=/app/data
ENV PYTHONUNBUFFERED=1

# 暴露Streamlit端口
EXPOSE 8501

# 启动命令
CMD ["python", "run.py"]