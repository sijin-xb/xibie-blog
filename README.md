# xibie 的博客

个人博客，基于 [Astro](https://astro.build) 与主题 [Fuwari](https://github.com/saicaca/fuwari)（MIT）搭建，部署在 Cloudflare Pages。

**线上地址**：[https://xibie-blog.pages.dev](https://xibie-blog.pages.dev)

## 本地开发

需要 Node.js ≥ 20 和 pnpm ≥ 9。

```bash
pnpm install        # 安装依赖
pnpm dev            # 本地预览，默认 http://localhost:4321
pnpm build          # 构建到 dist/
```

## 写文章

推荐用本机的 `blog` 命令（在 `~/.local/bin/blog`，任意目录可用）：

```bash
blog new 文章标题   # 新建文章并打开编辑器
blog up 说明文字    # 提交推送，Cloudflare 自动部署
blog dev            # 本地预览 http://localhost:4321
```

不用命令也可以直接在 `src/content/posts/` 下建 `.md` 文件，或运行 `pnpm new-post 文章名` 生成模板。`frontmatter` 里 `draft: true` 表示草稿，发布时删掉该行。

常用 frontmatter 字段：

```yaml
title: 文章标题        # 必填
published: 2026-01-01 # 必填，发布日期
description: 摘要      # 选填，显示在首页卡片
tags: [标签1, 标签2]   # 选填
category: 分类        # 选填
draft: true           # 草稿标记，发布时删除
```

## 管理后台

访问 `/admin`，输入管理密码即可在网页里写文章、贴图、发布，无需命令行。发布 = 提交 Markdown 到仓库 → Cloudflare 自动构建上线。

- 相关代码：`src/pages/admin.astro`（前端）+ `functions/api/`（Pages Functions 后端）
- 依赖的环境变量（Cloudflare Pages 项目设置里配置）：
  - `ADMIN_PASSWORD` —— 管理密码
  - `SESSION_SECRET` —— 会话签名密钥
  - `GITHUB_TOKEN` —— GitHub 令牌，需要 `xibie-blog` 仓库的 Contents 读写权限
- 本地调试函数：`pnpm dlx wrangler pages dev dist --port 8788`（配合 `.dev.vars` 文件，勿提交）

`blog` 命令（`~/.local/bin/blog`）依然可用：`blog new` / `blog up` / `blog dev`。

## 站点配置

个人资料、导航、社交链接都在 `src/config.ts`；「关于」页面在 `src/content/spec/about.md`；头像和横幅图在 `src/assets/images/`。

## 部署

推送到 GitHub 后，Cloudflare Pages 会自动构建部署（构建命令 `pnpm build`，输出目录 `dist`）。
