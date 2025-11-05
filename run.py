import subprocess
import sys
from pathlib import Path

def main():
    temp_dir = Path(__file__).parent
    app_filename = "app.py"
    app_path = temp_dir / app_filename

    if not app_path.exists():
        print(f"错误：在临时目录 {temp_dir} 里找不到 {app_filename}")
        print(f"请确认打包时包含了 {app_filename}，且文件名和这里一致")
        input("按回车退出...")
        return

    try:
        subprocess.run(
            [sys.executable, "-m", "streamlit", "run", str(app_path), "--server.port", "8502", "--server.headless", "False"],
            check=True
        )
    except Exception as e:
        print(f"启动失败：{str(e)}")
        input("按回车退出...")

if __name__ == "__main__":
    main()