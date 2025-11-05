import sqlite3
import os
from pathlib import Path
import logging

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(Path(os.path.expanduser("~")) / "documanager.log"),
        logging.StreamHandler()
    ]
)

def init_db():
    """初始化数据库"""
    try:
        # 优先使用环境变量中的数据目录，如果没有则使用默认路径
        if os.environ.get("DOCUMANAGER_DATA_DIR"):
            base_dir = Path(os.environ["DOCUMANAGER_DATA_DIR"])
            logging.info(f"使用环境变量中的数据目录: {base_dir}")
        else:
            # 在用户Documents文件夹中创建数据目录，更可靠
            base_dir = Path(os.path.expanduser("~/Documents/DocuManager"))
            logging.info(f"使用默认数据目录: {base_dir}")
        
        # 确保数据目录存在
        base_dir.mkdir(parents=True, exist_ok=True)
        
        # 数据库文件路径
        db_path = base_dir / "sqlite_database.db"
        logging.info(f"数据库文件路径: {db_path}")

        # 连接数据库
        conn = sqlite3.connect(db_path)
        c = conn.cursor()

        # 创建数据表
        c.execute('''
            CREATE TABLE IF NOT EXISTS document (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename TEXT UNIQUE NOT NULL,
                mediafilename TEXT,
                documentname TEXT NOT NULL,
                authorname TEXT NOT NULL,
                journalname TEXT,
                publishdate TEXT,
                created_at DATETIME NOT NULL,
                edition TEXT,
                content TEXT
            )
        ''')
        conn.commit()
        conn.close()
        logging.info("数据库初始化成功")
    except Exception as e:
        logging.error(f"数据库初始化失败: {str(e)}")
        # 抛出异常，让上层处理
        raise