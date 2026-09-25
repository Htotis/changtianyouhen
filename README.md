# 《长天有痕》在线阅读站

纯静态站点，无构建、无后端、无依赖。本地双击能开，上传到任何静态托管即可发布。

## 目录结构

```
novel-site/
├── index.html          书架页（封面 + 简介 + 章节目录）
├── read.html           阅读页（正文 + 翻章 + 设置）
├── assets/
│   ├── style.css       全站样式（含响应式与三套阅读主题）
│   ├── home.js         书架页逻辑
│   └── reader.js       阅读页逻辑
├── data/
│   ├── book.js         书籍信息 + 章节目录（脚本生成，勿手改）
│   └── ch/001.js …     各章正文（脚本生成，勿手改）
├── tools/
│   ├── build_data.py   章节 txt → 站点数据
│   └── dev-selftest.html  无头浏览器回归测试（33 项）
└── shots/              预览截图
```

## 更新章节

写完新章节后，把 txt 放进小说目录的 `章节/` 文件夹，然后：

```bash
python tools/build_data.py
```

脚本会重新扫描全部章节并覆盖 `data/`。**不需要改任何页面代码。**

章节文件命名规则：`第NNN章-标题.txt`（如 `第031章-入邑.txt`），首行可写 `第031章　入邑`。

## 改书名 / 笔名 / 简介

打开 `tools/build_data.py`，顶部 `BOOK` 字典：

```python
BOOK = {
    "title": "长天有痕",
    "author": "待填",        # ← 笔名改这里，改成别的值才会显示在页面上
    "genre": "东方玄幻",
    "status": "连载中",
    "intro": "...",          # 空行分段
    "tags": [...],
}
```

改完重跑一次 `build_data.py`。

## 本地预览

```bash
python -m http.server 8765
# 打开 http://127.0.0.1:8765/
```

## 功能

- 响应式：手机 / 平板 / 桌面自适应，移动端带安全区适配
- 阅读设置：字号四档、行距三档、主题三套（宣纸 / 护眼 / 夜间），存 localStorage
- 进度记忆：记住读到哪章、章内位置，书架页出现「继续阅读」
- 章节目录抽屉、上一章 / 下一章、键盘 ← →、点击正文切换工具栏
- 按章懒加载正文，并预取下一章

## 测试

```bash
python -m http.server 8765
# 另开终端，用无头 Chrome 跑：
chrome --headless=new --disable-gpu --virtual-time-budget=60000 \
  --dump-dom http://127.0.0.1:8765/tools/dev-selftest.html
```

结果在输出的 `<pre id="out">` 里。覆盖首页渲染、翻章、URL 同步、设置持久化、抽屉跳章、进度保存、已读标记、越界兜底。
