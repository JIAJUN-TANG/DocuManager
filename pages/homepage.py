import streamlit as st
from datetime import datetime
from utils.data_util import get_db_statistics

st.title("欢迎使用个人图书馆")
st.write(f"现在是 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

st.divider()

st.metric(
    label="数据总数",
    value=get_db_statistics()["document_count"] if get_db_statistics() else 0
)