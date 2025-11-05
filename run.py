import subprocess
import sys
import os
import logging
from pathlib import Path

# 配置日志记录
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        # 在Docker环境中使用标准输出和容器内日志文件
        logging.FileHandler("/app/documanager.log"),
        logging.StreamHandler()
    ]
)

def main():
    # 处理PyInstaller打包后的路径问题
    if hasattr(sys, '_MEIPASS'):
        # 打包后的临时解压目录 - 使用getattr安全获取属性
        base_dir = Path(getattr(sys, '_MEIPASS', Path(__file__).parent))
        logging.info(f"运行在打包环境，临时目录: {base_dir}")
    else:
        # 开发环境或Docker环境
        base_dir = Path(__file__).parent
        logging.info(f"运行在开发/Docker环境，当前目录: {base_dir}")
    
    # 检查app.py是否存在
    app_filename = "app.py"
    app_path = base_dir / app_filename
    
    # 即使在打包环境中找不到，也要尝试使用相对路径
    if not app_path.exists():
        app_path = Path("app.py")
        logging.warning(f"在base_dir中找不到app.py，尝试当前目录: {app_path}")
    
    if not app_path.exists():
        error_msg = f"错误：找不到 {app_filename} 文件"
        logging.error(error_msg)
        print(error_msg)
        return
    
    logging.info(f"找到app.py: {app_path}")
    
    # 设置环境变量，确保数据库路径正确
    # 优先使用环境变量中的数据目录（Docker环境）
    user_data_dir = Path(os.environ.get("DOCUMANAGER_DATA_DIR", 
                                      Path(os.path.expanduser("~/Documents/DocuManager"))))
    user_data_dir.mkdir(parents=True, exist_ok=True)
    os.environ["DOCUMANAGER_DATA_DIR"] = str(user_data_dir)
    logging.info(f"设置数据目录: {user_data_dir}")
    
    try:
        # 检查streamlit是否可用
        result = subprocess.run(
            [sys.executable, "-m", "pip", "show", "streamlit"],
            capture_output=True,
            text=True
        )
        
        # 设置Streamlit启动参数
        # 对于Docker环境，需要设置为headless=True并允许外部访问
        is_docker = os.path.exists('/.dockerenv') or os.environ.get('DOCKER_CONTAINER') == 'true'
        server_headless = "True" if is_docker else "False"
        server_address = "0.0.0.0" if is_docker else "localhost"
        
        if result.returncode != 0:
            logging.warning("未找到streamlit，尝试直接导入运行")
            # 直接导入streamlit并运行
            import streamlit.web.cli as stcli
            sys.argv = ["streamlit", "run", str(app_path), 
                       "--server.port", "8501", 
                       "--server.headless", server_headless,
                       "--server.address", server_address,
                       "--server.fileWatcherType", "none"]  # 禁用文件监视
            sys.exit(stcli.main())
        else:
            logging.info("找到streamlit，使用subprocess运行")
            # 使用subprocess运行
            subprocess.run(
                [sys.executable, "-m", "streamlit", "run", str(app_path), 
                 "--server.port", "8501", 
                 "--server.headless", server_headless,
                 "--server.address", server_address,
                 "--server.fileWatcherType", "none"],
                check=True
            )
    except subprocess.CalledProcessError as e:
        error_msg = f"启动streamlit失败：{str(e)}"
        logging.error(error_msg)
        print(error_msg)
    except Exception as e:
        error_msg = f"启动失败：{str(e)}"
        logging.error(error_msg)
        print(error_msg)

if __name__ == "__main__":
    main()