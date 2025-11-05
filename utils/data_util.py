import sqlite3
from typing import Optional, List, Dict
from pathlib import Path
import streamlit as st
import os
from docx import Document
from datetime import datetime
from difflib import SequenceMatcher
import logging

# 配置日志记录
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


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

def match_files_by_name(doc_folder: str = "./data/documents", img_folder: str = "./data/images") -> Dict:
    """
    对比documents和images文件夹内的文件名称，首先进行完全匹配
    
    参数：
        doc_folder: documents文件夹路径
        img_folder: images文件夹路径
    
    返回：
        dict: 包含匹配结果的字典
            {
                "status": "success" 或 "error",
                "matched_files": 完全匹配的文件对列表,
                "unmatched_docs": 未匹配的文档文件列表,
                "unmatched_images": 未匹配的图片文件列表,
                "error_msg": 错误信息（仅status为error时存在）
            }
    """
    result = {
        "status": "success",
        "matched_files": [],
        "unmatched_docs": [],
        "unmatched_images": []
    }
    
    try:
        # 获取文档文件列表
        doc_files = []
        if os.path.exists(doc_folder) and os.path.isdir(doc_folder):
            for file in os.listdir(doc_folder):
                if os.path.isfile(os.path.join(doc_folder, file)) and not file.startswith('.'):
                    # 获取文件名主体（不含扩展名）
                    file_main = file.rsplit('.', 1)[0] if '.' in file else file
                    doc_files.append({
                        "filename": file,
                        "name": file_main,
                        "absolute_path": os.path.abspath(os.path.join(doc_folder, file))
                    })
        
        # 获取图片文件列表
        img_files = []
        if os.path.exists(img_folder) and os.path.isdir(img_folder):
            for file in os.listdir(img_folder):
                if os.path.isfile(os.path.join(img_folder, file)) and not file.startswith('.'):
                    # 获取文件名主体（不含扩展名）
                    file_main = file.rsplit('.', 1)[0] if '.' in file else file
                    img_files.append({
                        "filename": file,
                        "name": file_main,
                        "absolute_path": os.path.abspath(os.path.join(img_folder, file))
                    })
        
        # 建立图片文件名到文件信息的映射
        img_name_map = {img["name"]: img for img in img_files}
        
        # 进行完全匹配
        matched_doc_names = set()
        matched_img_names = set()
        
        for doc in doc_files:
            if doc["name"] in img_name_map:
                # 找到完全匹配的图片
                img = img_name_map[doc["name"]]
                result["matched_files"].append({
                    "document": doc,
                    "image": img,
                    "match_type": "exact"
                })
                matched_doc_names.add(doc["name"])
                matched_img_names.add(doc["name"])
            else:
                # 未匹配的文档
                result["unmatched_docs"].append(doc)
        
        # 找出未匹配的图片
        for img in img_files:
            if img["name"] not in matched_img_names:
                result["unmatched_images"].append(img)
        
    except Exception as e:
        result["status"] = "error"
        result["error_msg"] = f"文件匹配失败：{str(e)}"
    
    return result

def match_files_with_similarity(doc_folder: str = "./data/documents", img_folder: str = "./data/images", threshold: float = 0.9) -> Dict:
    """
    对比documents和images文件夹内的文件名称，先完全匹配，再使用相似度匹配
    
    参数：
        doc_folder: documents文件夹路径
        img_folder: images文件夹路径
        threshold: 相似度匹配阈值
    
    返回：
        dict: 包含所有匹配结果的字典
    """
    # 首先进行完全匹配
    exact_match_result = match_files_by_name(doc_folder, img_folder)
    
    if exact_match_result["status"] == "error":
        return exact_match_result
    
    # 获取未匹配的文档和图片
    unmatched_docs = exact_match_result["unmatched_docs"]
    unmatched_images = exact_match_result["unmatched_images"]
    
    # 相似度匹配
    similarity_matches = []
    matched_img_indices = set()
    
    for doc_idx, doc in enumerate(unmatched_docs):
        best_match = None
        best_similarity = 0
        best_img_idx = -1
        
        for img_idx, img in enumerate(unmatched_images):
            if img_idx in matched_img_indices:
                continue
                
            # 计算文件名相似度
            similarity = SequenceMatcher(None, doc["name"], img["name"]).ratio()
            
            if similarity > best_similarity:
                best_similarity = similarity
                best_match = img
                best_img_idx = img_idx
        
        # 如果找到相似度高于阈值的匹配
        if best_match and best_similarity >= threshold:
            similarity_matches.append({
                "document": doc,
                "image": best_match,
                "match_type": "similarity",
                "similarity": best_similarity
            })
            matched_img_indices.add(best_img_idx)
    
    # 更新结果
    result = exact_match_result.copy()
    result["matched_files"].extend(similarity_matches)
    
    # 更新未匹配的文档和图片
    remaining_docs = []
    for doc_idx, doc in enumerate(unmatched_docs):
        # 检查该文档是否通过相似度匹配到了图片
        matched = False
        for match in similarity_matches:
            if match["document"]["absolute_path"] == doc["absolute_path"]:
                matched = True
                break
        if not matched:
            remaining_docs.append(doc)
    
    remaining_images = []
    for img_idx, img in enumerate(unmatched_images):
        if img_idx not in matched_img_indices:
            remaining_images.append(img)
    
    result["unmatched_docs"] = remaining_docs
    result["unmatched_images"] = remaining_images
    
    return result

def batch_insert_matched_files(matched_files: List[Dict]) -> Dict:
    """
    批量将匹配的文件对写入数据库
    
    参数：
        matched_files: 匹配的文件对列表
    
    返回：
        dict: 包含执行结果的字典
    """
    result = {
        "status": "success",
        "inserted_count": 0,
        "failed_count": 0,
        "error_msg": ""
    }
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        for match in matched_files:
            try:
                doc = match["document"]
                img = match["image"]
                
                # 获取文档信息
                file_name = doc["name"]
                # 尝试从name中解析作者、日期和文档名
                try:
                    author_name, publishdate, document_name = doc["name"].split("-")
                except ValueError:
                    author_name = "未知"
                    publishdate = ""
                    document_name = doc["name"]
                
                # 获取文件内容
                content = ""
                if os.path.exists(doc["absolute_path"]) and doc["absolute_path"].endswith(('.docx', '.doc')):
                    try:
                        doc_obj = Document(doc["absolute_path"])
                        content = '\n'.join([para.text.strip() for para in doc_obj.paragraphs if para.text.strip()])
                    except:
                        pass
                
                create_time = datetime.now()
                
                # 插入数据，包含图片路径信息
                cursor.execute(
                    "INSERT INTO document (filename, mediafilename, documentname, authorname, publishdate, created_at, content) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (file_name, img["filename"], document_name, author_name, publishdate, create_time, content)
                )
                result["inserted_count"] += 1
                
                logging.info(f"成功插入文档：{file_name}")

            except Exception as e:
                result["failed_count"] += 1
                logging.error(f"插入文档 {file_name} 失败：{str(e)}")
        
        conn.commit()
        conn.close()
        
    except Exception as e:
        result["status"] = "error"
        result["error_msg"] = f"批量插入失败：{str(e)}"
    finally:
        conn.close()
    
    return result