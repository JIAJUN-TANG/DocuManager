# run_app.py
import subprocess
import sys
from pathlib import Path

def main():
    # 获取当前目录下的Streamlit应用文件
    app_path = Path(__file__).parent / "app.py"
    # 启动Streamlit服务器（指定端口，避免冲突）
    subprocess.run(
        [sys.executable, "-m", "streamlit", "run", str(app_path), "--server.port", "8501"],
        check=True
    )

if __name__ == "__main__":
    main()