---
# ↓ 下面是文章的“元信息”，正文写在第二个 --- 之后
# title: 必填，文章标题（也会显示在浏览器标签页上）
# published: 必填，发布日期，格式 YYYY-MM-DD 或带上时间
# description: 选填，文章摘要，显示在首页卡片和 meta 标签里
# tags / category: 选填，标签和分类，用于归档页筛选
# draft: true 表示草稿，构建时不会发布；写完删掉这一行即可
title: 我的开篇文
published: 2026-11-19
description: 博客的第一篇文章——这里是摘要，会显示在首页卡片上。
tags: [随笔]
category: 随笔
draft: true
---

你好，世界！这是博客的第一篇文章。

把 `src/content/posts/my-first-post.md` 的内容换成你想写的就行；以后新建文章最方便的方式是在项目根目录执行：

```bash
pnpm new-post 文章文件名
```

它会在 `src/content/posts/` 下生成一个带好 frontmatter 的模板文件。

## 正文支持这些写法

**加粗**、*斜体*、[链接](https://astro.build)、行内代码 `console.log("hi")`，都支持。

引用块长这样：

> 一切皆文件。—— Unix 哲学

代码块带高亮和复制按钮，语言写在第一行：

```python
def fib(n: int) -> int:
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a
```

标题用 `##`、`###`，会自动出现在右侧目录里。写完记得把 frontmatter 里的 `draft: true` 删掉，文章才会正式发布。
