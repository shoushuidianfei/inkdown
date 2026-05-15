<div align="center">

<img src="https://raw.githubusercontent.com/shoushuidianfei/inkdown/main/src-tauri/icons/icon.png" width="120" height="120" alt="InkDown Logo">

# InkDown

**本地优先 · AI 原生 · 极简设计的个人知识管理工具**

*Local-first · AI-native · Minimalist Knowledge Manager*

[![License](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](https://github.com/shoushuidianfei/inkdown/blob/main/LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-FFC131?logo=tauri)](https://tauri.app)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![Rust](https://img.shields.io/badge/Rust-000000?logo=rust)](https://www.rust-lang.org)
[![Release](https://img.shields.io/github/v/release/shoushuidianfei/inkdown)](https://github.com/shoushuidianfei/inkdown/releases)

[English](#english) | [中文](#中文)

</div>

---

<a id="english"></a>
## 🇺🇸 English

InkDown is a **local-first**, **AI-native** knowledge management application inspired by Obsidian, built with Tauri + React. All your data stays on your local disk — no cloud lock-in, no privacy concerns.

### ✨ Features

| Feature | Description |
|---------|-------------|
| 📝 **Dual-link Notes** | `[[WikiLinks]]` syntax with real-time backlink tracking and graph visualization |
| 🤖 **AI Writing Assistant** | Native integration with OpenAI, Tongyi Qianwen, Wenxin Yiyan, DeepSeek, Xiaomi MiMo and more |
| 🌐 **Knowledge Graph** | Interactive D3.js force-directed graph to visualize connections between your notes |
| 🔍 **Full-text Search** | SQLite FTS5 + jieba-rs for lightning-fast Chinese/English search |
| ☁️ **WebDAV Sync** | Sync your vault to any WebDAV-compatible storage (NAS, cloud drive, etc.) |
| 🎨 **Yellow-Blue Minimal Theme** | Carefully crafted design system with zero borders, zero shadows philosophy |
| ⚡ **Lightning Fast** | Rust core + native desktop performance, starts in under 1 second |
| 🔒 **100% Local** | Your notes live on your disk. No account, no tracking, no cloud dependency |

### 📸 Screenshots

> *Screenshots will be added here. The app features a dark blue (#0B1120) + bright yellow (#F5A623) color scheme with a borderless, shadowless minimalist design.*

<!--
![Editor](docs/screenshots/editor.png)
![Graph View](docs/screenshots/graph.png)
![Settings](docs/screenshots/settings.png)
-->

### 📥 Download

| Platform | Download |
|----------|----------|
| **Windows** | [`.msi`](https://github.com/shoushuidianfei/inkdown/releases/latest) / [`.exe`](https://github.com/shoushuidianfei/inkdown/releases/latest) |
| **macOS (Intel)** | [`.dmg`](https://github.com/shoushuidianfei/inkdown/releases/latest) |
| **macOS (Apple Silicon)** | [`.dmg`](https://github.com/shoushuidianfei/inkdown/releases/latest) |
| **Linux** | [`.AppImage`](https://github.com/shoushuidianfei/inkdown/releases/latest) / [`.deb`](https://github.com/shoushuidianfei/inkdown/releases/latest) |

> ⬆️ [View all releases](https://github.com/shoushuidianfei/inkdown/releases)

### 🚀 Quick Start

1. Download and install from the [latest release](https://github.com/shoushuidianfei/inkdown/releases/latest)
2. Launch InkDown — select a local folder as your knowledge vault
3. Press `Ctrl+N` to create your first note
4. Press `Ctrl+K` to open the command palette
5. Configure your AI provider in Settings (⚙️) → AI

### 🛠️ Tech Stack

```
Frontend:  React 19 + TypeScript + Vite + Tailwind CSS
Editor:    CodeMirror 6 + Custom WikiLink Extension
Graph:     D3.js Force Simulation
Backend:   Tauri 2 (Rust) + SQLite FTS5 + jieba-rs
AI:        OpenAI-Compatible API (multi-provider support)
Sync:      WebDAV Protocol
```

### 🤝 Contributing

We welcome contributions! Please read our [Contributing Guide](./CONTRIBUTING.md) before submitting PRs.

### 📄 License

[AGPL-3.0](https://github.com/shoushuidianfei/inkdown/blob/main/LICENSE) © 2026 InkDown Contributors

---

<a id="中文"></a>
## 🇨🇳 中文

InkDown 是一款受 Obsidian 启发的**本地优先**、**AI 原生**知识管理工具，基于 Tauri + React 构建。你的所有数据都保存在本地磁盘 —— 没有云锁定，没有隐私顾虑。

### ✨ 核心特性

| 特性 | 说明 |
|------|------|
| 📝 **双链笔记** | 支持 `[[WikiLinks]]` 语法，实时反链追踪，一键打开知识图谱 |
| 🤖 **AI 辅助写作** | 原生接入 OpenAI、通义千问、文心一言、DeepSeek、小米 MiMo 等主流模型 |
| 🌐 **知识图谱** | 基于 D3.js 的力导向图，直观展示笔记间的关联关系 |
| 🔍 **全文搜索** | SQLite FTS5 + jieba-rs 分词，中英文毫秒级检索 |
| ☁️ **WebDAV 同步** | 支持同步到任意兼容 WebDAV 的存储（NAS、坚果云、阿里云盘等） |
| 🎨 **黄蓝极简主题** | 去边框、去阴影的极简设计理念，暗色极深蓝 + 明黄强调色 |
| ⚡ **极速体验** | Rust 核心 + 原生桌面性能，1 秒内冷启动 |
| 🔒 **完全本地** | 笔记文件纯本地存储，无需账号、不上传云端、无追踪 |

### 📸 界面预览

> *截图待补充。应用采用暗色极深蓝（#0B1120）+ 明黄（#F5A623）配色方案，去边框、去阴影的极简设计风格。*

<!--
![编辑器](docs/screenshots/editor.png)
![图谱视图](docs/screenshots/graph.png)
![设置面板](docs/screenshots/settings.png)
-->

### 📥 下载安装

| 平台 | 安装包 |
|------|--------|
| **Windows** | [`.msi`](https://github.com/shoushuidianfei/inkdown/releases/latest) / [`.exe`](https://github.com/shoushuidianfei/inkdown/releases/latest) |
| **macOS (Intel)** | [`.dmg`](https://github.com/shoushuidianfei/inkdown/releases/latest) |
| **macOS (Apple Silicon)** | [`.dmg`](https://github.com/shoushuidianfei/inkdown/releases/latest) |
| **Linux** | [`.AppImage`](https://github.com/shoushuidianfei/inkdown/releases/latest) / [`.deb`](https://github.com/shoushuidianfei/inkdown/releases/latest) |

> ⬆️ [查看所有版本](https://github.com/shoushuidianfei/inkdown/releases)

### 🚀 快速开始

1. 从 [最新 Release](https://github.com/shoushuidianfei/inkdown/releases/latest) 下载安装包
2. 启动 InkDown —— 选择一个本地文件夹作为知识库
3. 按 `Ctrl+N` 创建第一篇笔记
4. 按 `Ctrl+K` 打开命令面板
5. 在设置（⚙️）→ AI 中配置你的模型 API Key

### 🛠️ 技术栈

```
前端:     React 19 + TypeScript + Vite + Tailwind CSS
编辑器:   CodeMirror 6 + 自定义 WikiLink 扩展
图谱:     D3.js 力导向图模拟
后端:     Tauri 2 (Rust) + SQLite FTS5 + jieba-rs 分词
AI:       OpenAI 兼容 API（多供应商聚合）
同步:     WebDAV 协议
```

### 🗺️ 路线图

- [x] 双链笔记与知识图谱
- [x] AI 辅助写作（续写、润色、翻译）
- [x] WebDAV 多端同步
- [x] 本地全文搜索
- [ ] 标签系统完善
- [ ] 插件系统（Rust + JS 插件）
- [ ] 移动端适配（Tauri 2 Mobile）
- [ ] 协作编辑（基于 CRDT）

### 🤝 参与贡献

欢迎提交 Issue 和 PR！请参考 [贡献指南](./CONTRIBUTING.md)。

### 📄 开源协议

[AGPL-3.0](https://github.com/shoushuidianfei/inkdown/blob/main/LICENSE) © 2026 InkDown Contributors

---

<div align="center">

### ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=shoushuidianfei/inkdown&type=Date)](https://star-history.com/#shoushuidianfei/inkdown&Date)

**如果 InkDown 对你有帮助，请点个 Star ⭐️ 支持一下！**

</div>
