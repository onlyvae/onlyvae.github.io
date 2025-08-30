# onlyvae's blog

基于 Jekyll 和 [Hacker](https://github.com/pages-themes/hacker) 主题的个人博客。

## 本地预览

需要 Ruby 3.3 和 Bundler。macOS 可通过 `brew install ruby@3.3` 安装。

```sh
export PATH="/opt/homebrew/opt/ruby@3.3/bin:$PATH"
bundle config set --local path vendor/bundle
bundle install
./bin/preview
```

打开 <http://127.0.0.1:4000>。修改文章后会自动重建；修改 `_config.yml` 后需要重启服务。按 `Ctrl+C` 停止。

依赖安装完成后，也可以直接运行 `./bin/preview`。

## 写文章

第一篇文章位于 `_posts/2026-10-21-hello-world.md`，可直接修改标题和正文。

新文章放在 `_posts/YYYY-MM-DD-英文短标题.md`，例如：

```markdown
---
title: "文章标题"
date: 2026-10-21 22:00:00 +0800
description: "一句话简介"
tags: [随笔]
---

这里是文章摘要。

<!--more-->

## 正文标题

从这里开始写正文。
```

文章会自动显示在首页。日期使用新加坡时区；未来日期的文章默认不会显示。
也可以先放在 `_drafts/英文短标题.md`，运行 `./bin/preview --drafts` 查看草稿。

## 以后发布

目前所有文件只保留在本地，尚未提交或推送。

确认内容后，再自行提交并推送。在 GitHub 仓库的 **Settings → Pages** 中，选择 **Deploy from a branch**，分支选择 `main`，目录选择 `/ (root)`。部署成功后，访问 <https://onlyvae.github.io>。
