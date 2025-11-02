import streamlit as st
from utils.data_util import detect_data, analyse_toc, get_table_fields, insert_data
import pandas as pd


st.title("数据录入")

st.divider()

st.subheader("自动检测数据")
detect_button = st.button(label="开始检测", on_click=detect_data, key="detect_button")
toc_toggle = st.toggle(label="解析目录")

if toc_toggle:
    toc_file = st.file_uploader(
    label="请上传目录文件",
    key="toc_file",
    type=["txt", "doc", "docx", "csv", "xlsx", "xls"]
)

    if toc_file:
        spliter_text = st.text_input(label="请输入分隔符")
        spliter_button = st.button(label="开始解析", key="spliter_button")
        if spliter_button:
            try:
                toc_list = analyse_toc(toc_file, spliter_text)
                if not toc_list:  # 解析结果为空
                    st.info("未解析到有效目录记录（可能文件为空或格式不支持）")
                else:
                    toc_df = pd.DataFrame(toc_list, columns = [f"column_{i+1}" for i in range(len(toc_list[0]))])
                    st.success(f"解析成功！共 {len(toc_list)} 条目录记录")
                    st.subheader("解析结果")
                    st.dataframe(toc_df)
                    name_selector = st.selectbox("请选择文件名字段", options=toc_df.columns, key="name_selector")
                    match_button = st.button(label="确定", key="match_button")
                    if match_button:
                        detected_data = detect_data()
            except Exception as e:
                st.error(f"解析失败：{str(e)}")

if detect_button and toc_toggle:
    st.write("okj")

elif detect_button and not toc_toggle:
    set_column_config = {
        "filename": "文件名",
        "name": None,
        "type": "文件类型",
        "absolute_path": None,
        "size": "大小",
        "size_bytes": None,
        "last_modified": "上次修改"
    }
    with st.spinner("正在检测中...", show_time=True):
        detected_data = detect_data(file_path=None)
    if detected_data["status"] == "success":
        doc_names = {file["name"] for file in detected_data.get("document_files", [])}
        media_names = {file["name"] for file in detected_data.get("media_files", [])}
        match_names = list(doc_names & media_names)  # 匹配的名称列表
        match_count = len(match_names)

        st.write(
        f"检测到 **{detected_data['overview']['total_files']}** 个文件与 **{detected_data['overview']['total_folders']}** 个文件夹\n"
    )

        matched_documents = [
        file for file in detected_data.get("document_files", [])
        if file["name"] in match_names
    ]
        matched_media = [
        file for file in detected_data.get("media_files", [])
        if file["name"] in match_names
    ]

        col1, col2 = st.columns(2)

        with col1:
            st.write("📄 匹配的文档详情")
            if matched_documents:
                document_df = pd.DataFrame(matched_documents)
                st.dataframe(document_df, column_config=set_column_config)
            else:
                st.info("暂无匹配的文档文件")

        with col2:
            st.write("🖼️ 匹配的媒体详情")
            if matched_media:
                media_df = pd.DataFrame(matched_media)
                st.dataframe(media_df, column_config=set_column_config)
            else:
                st.info("暂无匹配的媒体文件")
        save_button = st.button(label="写入数据库", key="save_button")
        if save_button:
            with st.spinner("正在写入数据...", show_time=True):
                for i in matched_documents:
                    insert_data(i)
    else:
        st.warning(f"检测失败！错误：{detected_data['error_msg']}")
