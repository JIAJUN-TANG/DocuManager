import streamlit as st
from pathlib import Path
import pandas as pd
from utils.data_util import search_records, get_paginated_data, get_random_record


st.title("文档预览")
st.divider()
    
# 初始化会话状态
init_state = {
    'search_results': None,
    'selected_record': None,
    'show_details': False,
    'current_page': 1,  # 当前页码
    'page_size': 10,    # 每页条数
    'filters': {}       # 保存筛选条件
}
for key, value in init_state.items():
    if key not in st.session_state:
        st.session_state[key] = value
    
# ---------------------- 检索区（保持不变） ----------------------
st.subheader("字段检索")
with st.form("search_form", clear_on_submit=False):
    # 核心筛选项：三列布局
    col1, col2, col3 = st.columns(3)
    with col1:
        filename = st.text_input("文档文件名", value=st.session_state.filters.get('filename', ''), key="filename_filter")
    with col2:
        mediafilename = st.text_input("媒体文件名", value=st.session_state.filters.get('mediafilename', ''), key="mediafilename_filter")
    with col3:
        documentname = st.text_input("文档名称", value=st.session_state.filters.get('documentname', ''), key="documentname_filter")
    
    # 非核心筛选项：折叠显示
    with st.expander("更多筛选条件", expanded=False):
        exp_col1, exp_col2 = st.columns(2)
        with exp_col1:
            authorname = st.text_input("作者", value=st.session_state.filters.get('authorname', ''), key="authorname_filter")
        with exp_col2:
            # 日期范围筛选
            start_date = st.date_input(
                "发布日期起始", 
                value=pd.to_datetime(st.session_state.filters.get('start_date')) if st.session_state.filters.get('start_date') else None, 
                key="start_date_filter"
            )
            end_date = st.date_input(
                "发布日期结束", 
                value=pd.to_datetime(st.session_state.filters.get('end_date')) if st.session_state.filters.get('end_date') else None, 
                key="end_date_filter"
            )
    
    # 按钮组：检索 + 重置
    btn_col1, btn_col2 = st.columns([1, 5])
    with btn_col1:
        search_button = st.form_submit_button("开始检索", type="primary")
    with btn_col2:
        reset_button = st.form_submit_button("重置筛选")

# 处理重置筛选
if reset_button:
    st.session_state.filters = {}
    st.session_state.search_results = None
    st.session_state.current_page = 1
    st.session_state.show_details = False
    st.session_state.selected_record = None
    st.rerun()

# 处理检索请求
if search_button:
    st.session_state.filters = {
        'filename': filename,
        'mediafilename': mediafilename,
        'documentname': documentname,
        'authorname': authorname,
        'start_date': start_date.strftime('%Y-%m-%d') if start_date else None,
        'end_date': end_date.strftime('%Y-%m-%d') if end_date else None
    }
    
    with st.spinner("正在检索数据..."):
        results = search_records(st.session_state.filters)
    st.session_state.search_results = results
    st.session_state.current_page = 1  # 重置页码
    st.session_state.show_details = False
    st.session_state.selected_record = None

st.divider()
# 切换：检索结果 / 随机记录
tab1, tab2 = st.tabs(["检索结果", "随机记录"])

with tab1:
    if st.session_state.search_results is not None:
        total = len(st.session_state.search_results)
        if total > 0:
            st.success(f"找到 {total} 条记录（当前第 {st.session_state.current_page} 页 / 共 {((total + st.session_state.page_size - 1) // st.session_state.page_size)} 页）")
            
            # 页码选择器
            pages = list(range(1, ((total + st.session_state.page_size - 1) // st.session_state.page_size) + 1))
            st.session_state.current_page = st.selectbox(
                "选择页码", pages, index=st.session_state.current_page - 1, key="page_selector"
            )
            
            # 获取分页数据
            paginated_df = get_paginated_data(
                st.session_state.search_results, st.session_state.current_page, st.session_state.page_size
            )
            
            # 循环生成Expander
            for idx, row in paginated_df.iterrows():
                # Expander标题：显示关键信息
                expander_title = f"📄 {row['documentname']} | 日期：{row.get('publishdate', '未知')}"
                with st.expander(expander_title, expanded=False):
                    # 显示元数据
                    meta_fields = [
                        ("文档名称", "documentname"),
                        ("作者", "authorname"),
                        ("发布日期", "publishdate"),
                        ("创建时间", "created_at"),
                    ]
                    for label, field in meta_fields:
                        value = row.get(field, "无")
                        st.markdown(f"**{label}**: {value}")
                    
                    # 跳转详情页按钮
                    btn_key = f"detail_btn_{idx}_{row.get('filename', 'unknown')}"  # 结合索引和文件名确保唯一
                    if st.button("查看完整详情", key=btn_key, type="secondary"):
                        st.session_state.selected_record = row.to_dict()  # 保存当前记录
                        st.session_state.show_details = True              # 标记为显示详情
                        st.rerun()  # 刷新页面跳转
            
        else:
            st.info("未找到匹配的记录，请调整筛选条件后重试")
    else:
        st.info("请输入筛选条件并点击「开始检索」")

with tab2:
    if st.button("加载随机记录", type="secondary"):
        with st.spinner("正在获取随机记录..."):
            random_record = get_random_record()
        if random_record:
            st.session_state.selected_record = random_record
            st.session_state.show_details = False  # 先显示简要信息
    
    # 显示随机记录简要信息
    if st.session_state.selected_record and not st.session_state.show_details:
        record = st.session_state.selected_record
        col1, col2 = st.columns(2)
        with col1:
            st.write(f"📄 **文档文件名**: {record.get('filename')}")
            st.write(f"🖼️ **媒体文件名**: {record.get('mediafilename')}")
            st.write(f"📝 **文档名称**: {record.get('documentname')}")
        with col2:
            st.write(f"👤 **作者**: {record.get('authorname')}")
            st.write(f"📅 **发布日期**: {record.get('publishdate')}")
            st.write(f"🕒 **创建时间**: {record.get('created_at')}")
            
        if st.button("查看完整详情", key="view_random_detail"):
            st.session_state.show_details = True
            st.rerun()

if st.session_state.show_details and st.session_state.selected_record:
    st.divider()
    record = st.session_state.selected_record
    
    # 基础信息
    st.markdown("### 基础信息")
    for key, value in list(record.items())[:-1]:
        # 格式化特殊字段
        st.markdown(f"**{key}**: {value if value is not None else '无'}")
    st.divider()

    # 媒体预览文档内容
    col1, col2 = st.columns(2)
    with col1:
        st.markdown("### 媒体文件预览")
        media_filename = record.get('mediafilename')
        if media_filename:
            image_path = Path("./data/images") / media_filename
            if image_path.exists():
                st.image(str(image_path), caption=media_filename, width="stretch")
            else:
                st.warning(f"找不到媒体文件: {media_filename}")
        else:
            st.info("无媒体文件")
    
    with col2:
        st.markdown("### 文档内容预览")
        content = record.get('content', '')
        if content:
            # 长内容折叠显示
            if len(content) > 800:
                with st.expander("查看完整内容", expanded=False):
                    st.markdown(content)
            else:
                st.markdown(content)
        else:
            st.info("无文档内容")
    
    # 返回按钮
    if st.button("返回列表", key="back_to_list"):
        st.session_state.show_details = False
        st.rerun()