import streamlit as st
from utils.data_util import match_files_with_similarity, batch_insert_matched_files
import pandas as pd


st.title("数据录入")

st.divider()

st.subheader("文档与图片文件匹配")

# 添加匹配参数设置
col1, col2 = st.columns([1, 1])
with col1:
    doc_folder = st.text_input("文档文件夹路径", value="./data/documents", key="doc_folder")
with col2:
    img_folder = st.text_input("图片文件夹路径", value="./data/images", key="img_folder")

# 添加相似度阈值设置
threshold = st.slider("相似度匹配阈值", min_value=0.7, max_value=1.0, value=0.9, step=0.01, key="threshold")

# 开始匹配按钮
match_button = st.button("开始匹配文件", key="match_button", type="primary")

# 如果用户点击了匹配按钮
if match_button:
    with st.spinner("正在进行文件匹配...", show_time=True):
        # 调用我们实现的匹配函数
        match_result = match_files_with_similarity(doc_folder, img_folder, threshold)
    
    if match_result["status"] == "success":
        matched_files = match_result["matched_files"]
        unmatched_docs = match_result["unmatched_docs"]
        unmatched_images = match_result["unmatched_images"]
        
        # 显示匹配结果统计
        st.success(
            f"""匹配完成！\n"""
            f"- 成功匹配：**{len(matched_files)}** 对文件\n"""
            f"- 未匹配文档：**{len(unmatched_docs)}** 个\n"""
            f"- 未匹配图片：**{len(unmatched_images)}** 个"
        )
        
        # 显示匹配的文件对详情
        if matched_files:
            st.subheader("匹配结果详情")
            
            # 准备显示数据
            display_data = []
            for match in matched_files:
                doc = match["document"]
                img = match["image"]
                match_type = match["match_type"]
                # 将相似度值格式化为两位小数的字符串
                similarity = f"{match.get('similarity', 1.0):.2f}" if match_type == "similarity" else "完全匹配"
                
                display_data.append({
                    "文档文件名": doc["filename"],
                    "图片文件名": img["filename"],
                    "匹配类型": "相似度匹配" if match_type == "similarity" else "完全匹配",
                    "相似度": similarity,
                })
            
            # 转换为DataFrame并显示
            df = pd.DataFrame(display_data)
            
            # 配置显示列
            column_config = {
                "文档文件名": st.column_config.TextColumn("文档文件名", width="medium"),
                "媒体文件名": st.column_config.TextColumn("媒体文件名", width="medium"),
                "匹配类型": st.column_config.TextColumn("匹配类型", width="small"),
                "相似度": st.column_config.TextColumn("相似度", width="small"),
            }
            
            # 显示数据
            st.dataframe(df, column_config=column_config, hide_index=True)
            # st.write(matched_files)

            # 添加保存按钮
            save_button = st.button("写入数据库", key="save_button", type="secondary")
            
            if save_button:
                with st.spinner("正在写入数据库...", show_time=True):
                    # 调用批量插入函数
                    insert_result = batch_insert_matched_files(matched_files)
                
                if insert_result["status"] == "success":
                    st.success(
                        f"数据库写入成功！\n"""
                        f"- 成功写入：**{insert_result['inserted_count']}** 条记录\n"""
                        f"- 写入失败：**{insert_result['failed_count']}** 条记录"
                    )
                else:
                    st.error(f"数据库写入失败：{insert_result['error_msg']}")
        
        # 显示未匹配的文件
        if unmatched_docs or unmatched_images:
            st.subheader("未匹配文件")
            
            col1, col2 = st.columns(2)
            
            with col1:
                st.write("📄 未匹配的文档文件")
                if unmatched_docs:
                    unmatched_docs_df = pd.DataFrame([{"文件名": doc["filename"]} for doc in unmatched_docs])
                    st.dataframe(unmatched_docs_df, hide_index=True)
                else:
                    st.info("所有文档都已匹配")
            
            with col2:
                st.write("🖼️ 未匹配的媒体文件")
                if unmatched_images:
                    unmatched_images_df = pd.DataFrame([{"文件名": img["filename"]} for img in unmatched_images])
                    st.dataframe(unmatched_images_df, hide_index=True)
                else:
                    st.info("所有媒体都已匹配")
    else:
        st.error(f"文件匹配失败：{match_result['error_msg']}")