import sqlite3
from typing import Optional
from pathlib import Path
import streamlit as st
import os
import time
import pandas as pd
import io
from docx import Document
from datetime import datetime


def get_db_connection(db_path: str = "./database/sqlite_database.db") -> Optional[sqlite3.Connection]:
    """获取数据库连接（连接到现有SQLite数据库）"""
    try:
        if not Path(db_path).exists():
            return None
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row  # 支持按字段名访问
        return conn
    except sqlite3.Error as e:
        return None

@st.cache_data
def get_db_statistics():
    conn = get_db_connection()
    
    result = {
        "document_count": 0,
    }
    try:
        cursor = conn.cursor()

        try:
            cursor.execute("""
                SELECT COUNT(*) AS total
                FROM document
                WHERE 1=1
            """)
            col_data = cursor.fetchone()
            result["document_count"] = col_data[0]
        except sqlite3.Error as e:
            raise RuntimeError(f"查询失败：{str(e)}")
    except sqlite3.Error as e:
        raise RuntimeError(f"数据库连接失败：{str(e)}")
    finally:
        if conn:
            conn.close()
    
    return result

@st.cache_data
def analyse_toc(file, spliter) -> list:
    """
    解析上传的目录文件（txt/docx/xlsx/xls），返回结构化目录列表
    
    参数：
        file: streamlit 上传的文件对象
        
    返回：
        list: 解析后的目录记录列表（每个元素为一条目录文本，已过滤空行）
        若格式不支持或解析失败，返回空列表并在页面显示错误提示
    """
    if not file:
        return []

    file_ext = file.name.split(".")[-1].lower()
    toc_records = []

    try:
        if file_ext == "txt":
            # 读取文件内容（按 utf-8 编码，兼容中文）
            content = file.getvalue().decode("utf-8")
            toc_records = [
                line.strip() 
                for line in content.splitlines() 
                if line.strip()  # 跳过空行或仅含空格的行
            ]

        elif file_ext == "docx":
            # 读取 docx 文件
            doc = Document(file)
            toc_records = []
            for para in doc.paragraphs:
                para_text = para.text.strip()
                if not para_text:
                    continue
                parts = [p.strip() for p in para_text.split(spliter) if p.strip()]
                if not parts:
                    continue
                last_part = parts[-1]
                cleaned_last = last_part.rstrip("。").strip()
                parts[-1] = cleaned_last
                toc_records.append(parts)

        elif file_ext in ["xlsx", "xls"]:
            excel_data = pd.ExcelFile(io.BytesIO(file.getvalue()))
            for sheet_name in excel_data.sheet_names:
                # 读取当前 sheet 数据（跳过空行）
                df = pd.read_excel(excel_data, sheet_name=sheet_name)
                # 遍历每行，将多列内容用 " | " 连接成一条记录（过滤全空行）
                for _, row in df.iterrows():
                    # 过滤空值，将非空单元格内容转为字符串并连接
                    row_values = [str(val).strip().split(spliter) for val in row.values if pd.notna(val) and str(val).strip()]
                    if row_values:  # 跳过全空行
                        toc_records.append(" | ".join(row_values))

        else:
            st.error(f"不支持的文件格式：{file_ext}，请上传 txt、docx、xlsx 或 xls 格式")
            return []

        if not toc_records:
            st.info("文件中未检测到有效目录记录")
        return toc_records

    except Exception as e:
        st.error(f"文件解析失败：{str(e)}）")
        return []

@st.cache_data
def get_table_fields(table_name: str = "document") -> dict:
    """
    获取指定数据库表的所有字段名称
    
    参数：
        table_name: 目标表名（默认：document）
        
    返回：
        dict: 包含字段信息的结果字典
            {
                "status": "success" 或 "error",  # 执行状态
                "fields": list[str],              # 字段名称列表（成功时返回）
                "error_msg": str                  # 错误信息（失败时返回）
            }
    """
    conn = None
    result = {
        "status": "success",
        "fields": [],
        "error_msg": ""
    }

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # PRAGMA table_info(表名) 返回字段详情：(序号, 字段名, 类型, ...)
        cursor.execute(f"PRAGMA table_info({table_name})")
        field_records = cursor.fetchall()  # 获取所有字段记录

        if field_records:
            # 若连接设置了 row_factory=sqlite3.Row，按字段名取值
            if isinstance(field_records[0], sqlite3.Row):
                result["fields"] = [record["name"] for record in field_records]
            # 否则按元组索引取值（PRAGMA结果中第2个元素是字段名）
            else:
                result["fields"] = [record[1] for record in field_records]

    except sqlite3.Error as e:
        result["status"] = "error"
        result["error_msg"] = f"数据库错误：{str(e)}（可能表名不存在或权限不足）"
    except Exception as e:
        result["status"] = "error"
        result["error_msg"] = f"未知错误：{str(e)}"
    finally:
        # 5. 确保连接关闭，释放资源
        if conn:
            conn.close()

    return result

def format_file_size(size_bytes):
    """辅助函数：将字节数转换为易读的单位（KB/MB/GB）"""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 ** 2:
        return f"{size_bytes / 1024:.2f} KB"
    elif size_bytes < 1024 ** 3:
        return f"{size_bytes / (1024 ** 2):.2f} MB"
    else:
        return f"{size_bytes / (1024 ** 3):.2f} GB"
    
@st.cache_data
def detect_data(file_path: str = "./data") -> dict:
    """
    检测指定文件夹下的所有子文件夹和文件，按“文档/媒体”分类返回结构化结果
    
    参数：
        file_path: 待检测的文件夹路径（默认：./data）
        
    返回：
        dict: 包含检测结果的字典，格式如下：
            {
                "status": "success" 或 "error",  # 检测状态
                "default_path_used": bool,       # 是否使用了默认路径（./data）
                "target_path": str,              # 实际检测的绝对路径
                "overview": {                    # 总览信息
                    "total_folders": int,       # 子文件夹总数（含嵌套）
                    "total_files": int,         # 所有非隐藏文件总数
                    "total_documents": int,     # 文档文件总数
                    "total_media": int          # 媒体文件总数
                },
                "folders": list[str],            # 所有子文件夹的绝对路径列表
                "document_files": list[dict],    # 文档文件详情列表（doc/pdf/txt等）
                "media_files": list[dict],       # 媒体文件详情列表（jpg/tif/png等）
                "error_msg": str                 # 错误信息（仅 status 为 error 时存在）
            }
    """
    DOC_EXTENSIONS = {"doc", "docx", "pdf", "txt", "xlsx", "xls", "ppt", "pptx", "wps", "md"}
    MEDIA_EXTENSIONS = {"jpg", "jpeg", "png", "tif", "tiff", "gif", "bmp", "svg", "mp4", "avi"}

    default_path_used = False
    if file_path is None or not file_path.strip():
        file_path = "./data"
        default_path_used = True
    
    # 路径规范化
    target_path = os.path.abspath(file_path)
    
    # 初始化结果字典
    result = {
        "status": "success",
        "default_path_used": default_path_used,
        "target_path": target_path,
        "overview": {
            "total_folders": 0,
            "total_files": 0,
            "total_documents": 0,
            "total_media": 0
        },
        "folders": [],
        "document_files": [],
        "media_files": []
    }

    try:
        for root, dirs, files in os.walk(target_path):
            # 收集子文件夹（过滤隐藏文件夹）
            for dir_name in dirs:
                if not dir_name.startswith("."):  # 排除以"."开头的隐藏文件夹
                    folder_abs_path = os.path.join(root, dir_name)
                    result["folders"].append(folder_abs_path)
                    result["overview"]["total_folders"] += 1
            
            # 收集文件：按“文档/媒体”分类
            for file_name in files:
                if file_name.startswith("."):
                    continue
                
                # 构造文件基础信息
                file_abs_path = os.path.join(root, file_name)
                file_size = os.path.getsize(file_abs_path)
                modify_time = os.path.getmtime(file_abs_path)
                modify_time_str = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(modify_time))
                
                if "." in file_name:
                    file_main = file_name.rsplit(".", 1)[0]
                    file_ext = file_name.rsplit(".", 1)[1].lower()
                else:
                    file_main = file_name  # 无后缀的文件
                    file_ext = ""
            
                # 构造文件详情字典（保留原字段结构）
                file_info = {
                    "filename": file_name,          # 完整文件名
                    "name": file_main,              # 文件名主体
                    "type": file_ext,               # 文件后缀
                    "absolute_path": file_abs_path, # 文件绝对路径
                    "size": format_file_size(file_size),  # 易读大小
                    "size_bytes": file_size,        # 原始字节数
                    "last_modified": modify_time_str # 最后修改时间
                }

                # 按后缀分类添加到对应列表
                if file_ext in DOC_EXTENSIONS:
                    result["document_files"].append(file_info)
                    result["overview"]["total_documents"] += 1
                elif file_ext in MEDIA_EXTENSIONS:
                    result["media_files"].append(file_info)
                    result["overview"]["total_media"] += 1
                
                result["overview"]["total_files"] += 1

    except FileNotFoundError:
        result["status"] = "error"
        result["error_msg"] = f"路径不存在：{target_path}"
    except PermissionError:
        result["status"] = "error"
        result["error_msg"] = f"无权限访问路径：{target_path}"
    except Exception as e:
        result["status"] = "error"
        result["error_msg"] = f"检测失败：{str(e)}"

    return result

def inert_data(document):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        file_name = document.get("filename", "")
        author_name, publishdate, document_name = document.get("name", "").split("-")
        doc = Document(document.get("abspath"), "")
        for para in doc.paragraphs:
            para_text = para.text.strip()
        create_time = datetime.now()
    except:
        return None