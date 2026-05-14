import { useEffect, useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { listen } from "@tauri-apps/api/event";
import { useAppStore, VaultInfo } from "./stores/useAppStore";
import { useAIStore } from "./stores/useAIStore";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { Sidebar } from "./components/sidebar/Sidebar";
import { TabBar } from "./components/editor/TabBar";
import { MarkdownEditor } from "./components/editor/MarkdownEditor";
import { ReadingView } from "./components/editor/ReadingView";
import { RightSidebar } from "./components/rightsidebar/RightSidebar";
import { GraphView } from "./components/GraphView";
import { StatusBar } from "./components/StatusBar";
import { SettingsModal } from "./components/settings/SettingsModal";
import { CommandPalette } from "./components/CommandPalette";
import { Network, FileText, BookOpen, Settings } from "lucide-react";

type ViewMode = "editor" | "reading" | "graph";

function App() {
  const { vaultPath, activeTabId, openTabs, setVault, closeTab } = useAppStore();
  const { loadConfig } = useAIStore();
  const [viewMode, setViewMode] = useState<ViewMode>("editor");
  const [showSettings, setShowSettings] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  // 侧边栏状态
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(240);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(256);
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);

  const activeTab = openTabs.find((tab) => tab.id === activeTabId);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 加载 AI 配置
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // P2-9: 自动恢复上次打开的 Vault
  useEffect(() => {
    if (!vaultPath) {
      const savedPath = localStorage.getItem("inkdown_vault_path");
      if (savedPath) {
        invoke<VaultInfo>("open_vault", { path: savedPath })
          .then((info) => setVault(info))
          .catch(() => localStorage.removeItem("inkdown_vault_path"));
      }
    }
  }, []);

  // 启动文件监听 + 监听 vault-changed 事件
  useEffect(() => {
    if (!vaultPath) return;

    // 启动 Rust 侧文件监听
    invoke("start_file_watcher", { vaultPath }).catch((e) =>
      console.error("启动文件监听失败:", e)
    );

    // 监听 vault-changed 事件，debounce 500ms 后刷新
    const unlisten = listen("vault-changed", () => {
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = setTimeout(() => {
        useAppStore.getState().loadFiles();
        useAppStore.getState().indexAllFiles();
      }, 500);
    });

    return () => {
      unlisten.then((fn) => fn());
      invoke("stop_file_watcher").catch(() => {});
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    };
  }, [vaultPath]);

  // 快捷键处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K: 命令面板
      if (e.ctrlKey && e.key === "k") {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
        return;
      }

      // Ctrl+P: 快速打开（也打开命令面板）
      if (e.ctrlKey && e.key === "p") {
        e.preventDefault();
        setShowCommandPalette(true);
        return;
      }

      // Ctrl+O: 打开 Vault
      if (e.ctrlKey && e.key === "o") {
        e.preventDefault();
        handleOpenVault();
        return;
      }

      // Ctrl+N: 新建文件
      if (e.ctrlKey && e.key === "n") {
        e.preventDefault();
        if (vaultPath) {
          useAppStore.getState().createNewFile("");
        }
        return;
      }

      // Ctrl+G: 切换图谱视图
      if (e.ctrlKey && e.key === "g") {
        e.preventDefault();
        setViewMode(viewMode === "graph" ? "editor" : "graph");
        return;
      }

      // Ctrl+Shift+E: 切换阅读模式
      if (e.ctrlKey && e.shiftKey && e.key === "E") {
        e.preventDefault();
        setViewMode(viewMode === "reading" ? "editor" : "reading");
        return;
      }

      // Ctrl+,: 打开设置
      if (e.ctrlKey && e.key === ",") {
        e.preventDefault();
        setShowSettings(true);
        return;
      }

      // Ctrl+W: 关闭当前标签
      if (e.ctrlKey && e.key === "w") {
        e.preventDefault();
        if (activeTabId) {
          closeTab(activeTabId);
        }
        return;
      }

      // Ctrl+S: 保存
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        if (activeTabId) {
          useAppStore.getState().saveFile(activeTabId);
        }
        return;
      }

      // Escape: 关闭命令面板
      if (e.key === "Escape") {
        setShowCommandPalette(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [vaultPath, viewMode, activeTabId, closeTab]);

  const handleOpenVault = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "选择 Vault 文件夹",
      });

      if (selected) {
        const vaultInfo = await invoke<VaultInfo>("open_vault", { path: selected });
        setVault(vaultInfo);
      }
    } catch (error) {
      console.error("打开 Vault 失败:", error);
    }
  };

  // 如果没有打开 Vault，显示欢迎页面
  if (!vaultPath) {
    return <WelcomeScreen />;
  }

  // 拖拽调整侧边栏宽度
  const startResize = (side: "left" | "right") => (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = side === "left" ? leftSidebarWidth : rightSidebarWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const newWidth = Math.max(160, Math.min(400, startWidth + (side === "left" ? delta : -delta)));
      if (side === "left") setLeftSidebarWidth(newWidth);
      else setRightSidebarWidth(newWidth);
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: "var(--bg-primary)" }}>
      {/* 主内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧边栏 */}
        {!leftSidebarCollapsed && (
          <div
            className="flex-shrink-0 relative"
            style={{ width: leftSidebarWidth, backgroundColor: "var(--bg-secondary)" }}
          >
            <Sidebar />
            {/* 拖拽手柄 */}
            <div
              className="absolute top-0 right-0 w-1 h-full cursor-col-resize opacity-0 hover:opacity-100 transition-opacity"
              style={{ backgroundColor: "var(--accent)" }}
              onMouseDown={startResize("left")}
            />
          </div>
        )}
        {/* 左侧边栏折叠按钮 */}
        <button
          className="flex-shrink-0 w-5 flex items-center justify-center hover:bg-[var(--bg-tertiary)] transition-colors"
          style={{ color: "var(--text-muted)" }}
          onClick={() => setLeftSidebarCollapsed(!leftSidebarCollapsed)}
          title={leftSidebarCollapsed ? "展开左侧边栏" : "折叠左侧边栏"}
        >
          <span className="text-xs">{leftSidebarCollapsed ? "»" : "«"}</span>
        </button>

        {/* 主编辑区 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 工具栏 */}
          <div
            className="flex items-center justify-between px-3 py-1"
            style={{
              backgroundColor: "var(--bg-secondary)",
            }}
          >
            {/* 标签栏 */}
            <div className="flex-1 overflow-hidden">
              <TabBar />
            </div>

            {/* 视图切换和设置按钮 */}
            <div className="flex items-center gap-0.5 ml-2">
              <button
                className="p-1 rounded-sm"
                style={{
                  backgroundColor: viewMode === "editor" ? "var(--accent-dim)" : "transparent",
                  color: viewMode === "editor" ? "var(--accent)" : "var(--text-muted)",
                }}
                onClick={() => setViewMode("editor")}
                title="编辑器视图"
              >
                <FileText size={14} />
              </button>
              <button
                className="p-1 rounded-sm"
                style={{
                  backgroundColor: viewMode === "reading" ? "var(--accent-dim)" : "transparent",
                  color: viewMode === "reading" ? "var(--accent)" : "var(--text-muted)",
                }}
                onClick={() => setViewMode("reading")}
                title="阅读模式 (Ctrl+Shift+E)"
              >
                <BookOpen size={14} />
              </button>
              <button
                className="p-1 rounded-sm"
                style={{
                  backgroundColor: viewMode === "graph" ? "var(--accent-dim)" : "transparent",
                  color: viewMode === "graph" ? "var(--accent)" : "var(--text-muted)",
                }}
                onClick={() => setViewMode("graph")}
                title="图谱视图 (Ctrl+G)"
              >
                <Network size={14} />
              </button>
              <div className="w-px h-3 mx-1" style={{ backgroundColor: "var(--border-hover)" }} />
              <button
                className="p-1 rounded-sm hover:bg-[rgba(148,163,184,0.05)]"
                style={{ color: "var(--text-muted)" }}
                onClick={() => setShowSettings(true)}
                title="设置 (Ctrl+,)"
              >
                <Settings size={14} />
              </button>
            </div>
          </div>

          {/* 内容区域 */}
          <div className="flex-1 overflow-hidden">
            {viewMode === "graph" ? (
              <GraphView />
            ) : viewMode === "reading" && activeTab ? (
              <ReadingView content={activeTab.content} />
            ) : activeTab ? (
              <MarkdownEditor key={activeTab.id} tab={activeTab} />
            ) : (
              <div
                className="h-full flex items-center justify-center"
                style={{ backgroundColor: "var(--bg-primary)" }}
              >
                <div className="text-center">
                  <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
                    选择一个文件开始编辑
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Ctrl+K 打开命令面板
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 右侧边栏折叠按钮 */}
        <button
          className="flex-shrink-0 w-5 flex items-center justify-center hover:bg-[var(--bg-tertiary)] transition-colors"
          style={{ color: "var(--text-muted)" }}
          onClick={() => setRightSidebarCollapsed(!rightSidebarCollapsed)}
          title={rightSidebarCollapsed ? "展开右侧边栏" : "折叠右侧边栏"}
        >
          <span className="text-xs">{rightSidebarCollapsed ? "«" : "»"}</span>
        </button>
        {/* 右侧边栏 */}
        {!rightSidebarCollapsed && (
          <div
            className="flex-shrink-0 relative"
            style={{ width: rightSidebarWidth, backgroundColor: "var(--bg-secondary)" }}
          >
            {/* 拖拽手柄 */}
            <div
              className="absolute top-0 left-0 w-1 h-full cursor-col-resize opacity-0 hover:opacity-100 transition-opacity"
              style={{ backgroundColor: "var(--accent)" }}
              onMouseDown={startResize("right")}
            />
            <RightSidebar />
          </div>
        )}
      </div>

      {/* 状态栏 */}
      <StatusBar />

      {/* 命令面板 */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onOpenSettings={() => {
          setShowCommandPalette(false);
          setShowSettings(true);
        }}
        onToggleGraph={() => {
          setShowCommandPalette(false);
          setViewMode((prev) => (prev === "editor" ? "graph" : "editor"));
        }}
      />

      {/* 设置模态框 */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
}

export default App;
