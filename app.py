import streamlit as st
from utils.init import init_db

st.set_page_config(page_title="个人图书馆",
                   layout="wide")

with st.spinner("正在初始化中...", show_time=True):
    init_db()

pg = st.navigation([
    st.Page("pages/homepage.py", title="主页"),
    st.Page("pages/insert.py", title="数据录入"),
])

pg.run()