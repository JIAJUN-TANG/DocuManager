import sqlite3
from pathlib import Path


def init_db():
    """初始化数据库"""
    # 数据库文件路径
    db_dir = Path("./database")
    db_dir.mkdir(exist_ok=True)  # 确保data目录存在
    db_path = db_dir / "sqlite_database.db"

    # 连接数据库
    conn = sqlite3.connect(db_path)
    c = conn.cursor()

    # 创建数据表
    c.execute('''
        CREATE TABLE IF NOT EXISTS document (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT UNIQUE NOT NULL,
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