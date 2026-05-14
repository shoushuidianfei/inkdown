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

  const [leftSidebarWidth, setLeftSidebarWidth] = useState(240);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(260);
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);

  const activeTab = openTabs.find((tab) => tab.id === activeTabId);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { loadConfig(); }, [loadConfig]);

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

  useEffect(() => {
    if (!vaultPath) return;
    invoke("start_file_watcher", { vaultPath }).catch((e) =>
      console.error("启动文件监听失败:", e)
    );
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "k") { e.preventDefault(); setShowCommandPalette((prev) => !prev); return; }
      if (e.ctrlKey && e.key === "p") { e.preventDefault(); setShowCommandPalette(true); return; }
      if (e.ctrlKey && e.key === "o") { e.preventDefault(); handleOpenVault(); return; }
      if (e.ctrlKey && e.key === "n") { e.preventDefault(); if (vaultPath) useAppStore.getState().createNewFile(""); return; }
      if (e.ctrlKey && e.key === "g") { e.preventDefault(); setViewMode(viewMode === "graph" ? "editor" : "graph"); return; }
      if (e.ctrlKey && e.shiftKey && e.key === "E") { e.preventDefault(); setViewMode(viewMode === "reading" ? "editor" : "reading"); return; }
      if (e.ctrlKey && e.key === ",") { e.preventDefault(); setShowSettings(true); return; }
      if (e.ctrlKey && e.key === "w") { e.preventDefault(); if (activeTabId) closeTab(activeTabId); return; }
      if (e.ctrlKey && e.key === "s") { e.preventDefault(); if (activeTabId) useAppStore.getState().saveFile(activeTabId); return; }
      if (e.key === "Escape") setShowCommandPalette(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [vaultPath, viewMode, activeTabId, closeTab]);

  const handleOpenVault = async () => {
    try {
      const selected = await open({ directory: true, multiple: false, title: "选择 Vault 文件夹" });
      if (selected) {
        const vaultInfo = await invoke<VaultInfo>("open_vault", { path: selected });
        setVault(vaultInfo);
      }
    } catch (error) { console.error("打开 Vault 失败:", error); }
  };

  if (!vaultPath) return <WelcomeScreen />;

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

  const IconButton = ({ onClick, title, active, children }: any) => (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 28, height: 28,
        display: "flex", alignItems: "center", justifyContent: "center",
        borderRadius: "var(--radius-md)",
        color: active ? "var(--text-primary)" : "var(--gray-400)",
        backgroundColor: active ? "var(--bg-active)" : "transparent",
        transition: "all var(--duration-fast) var(--ease-default)",
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.backgroundColor = "var(--bg-hover)"; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.backgroundColor = "transparent"; }}
    >
      {children}
    </button>
  );

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", backgroundColor: "var(--bg-app)" }}>
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* 左侧边栏 */}
        {!leftSidebarCollapsed && (
          <div style={{ width: leftSidebarWidth, flexShrink: 0, position: "relative", backgroundColor: "var(--bg-sidebar)" }}>
            <Sidebar />
            <div
              style={{ position: "absolute", top: 0, right: 0, width: 4, height: "100%", cursor: "col-resize" }}
              onMouseDown={startResize("left")}
            />
          </div>
        )}
        <button
          style={{
            width: 20, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--gray-500)", backgroundColor: "var(--bg-app)",
            transition: "background-color var(--duration-fast) var(--ease-default)",
          }}
          onClick={() => setLeftSidebarCollapsed(!leftSidebarCollapsed)}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--bg-hover)"}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "var(--bg-app)"}
        >
          <span style={{ fontSize: 10 }}>{leftSidebarCollapsed ? "»" : "«"}</span>
        </button>

        {/* 主编辑区 */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* TabBar: 40px */}
          <div style={{ height: 40, display: "flex", alignItems: "center", justifyContent: "space-between", paddingLeft: 12, paddingRight: 12, backgroundColor: "var(--bg-sidebar)", borderBottom: "var(--border-subtle)" }}>
            <div style={{ flex: 1, overflow: "hidden" }}><TabBar /></div>
            <div style={{ display: "flex", alignItems: "center", gap: 2, marginLeft: 8 }}>
              <IconButton onClick={() => setViewMode("editor")} title="编辑器" active={viewMode === "editor"}><FileText size={16} /></IconButton>
              <IconButton onClick={() => setViewMode("reading")} title="阅读模式" active={viewMode === "reading"}><BookOpen size={16} /></IconButton>
              <IconButton onClick={() => setViewMode("graph")} title="图谱视图" active={viewMode === "graph"}><Network size={16} /></IconButton>
              <div style={{ width: 1, height: 16, margin: "0 4px", backgroundColor: "var(--border-primary)" }} />
              <IconButton onClick={() => setShowSettings(true)} title="设置"><Settings size={16} /></IconButton>
            </div>
          </div>

          {/* 内容区 */}
          <div style={{ flex: 1, overflow: "hidden", backgroundColor: "var(--bg-main)" }}>
            {viewMode === "graph" ? <GraphView />
              : viewMode === "reading" && activeTab ? <ReadingView content={activeTab.content} />
              : activeTab ? <MarkdownEditor key={activeTab.id} tab={activeTab} />
              : (
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ textAlign: "center" }}>
                    <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", marginBottom: 4 }}>选择一个文件开始编辑</p>
                    <p style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>Ctrl+K 打开命令面板</p>
                  </div>
                </div>
              )}
          </div>
        </div>

        {/* 右侧边栏折叠按钮 */}
        <button
          style={{
            width: 20, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--gray-500)", backgroundColor: "var(--bg-app)",
            transition: "background-color var(--duration-fast) var(--ease-default)",
          }}
          onClick={() => setRightSidebarCollapsed(!rightSidebarCollapsed)}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--bg-hover)"}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "var(--bg-app)"}
        >
          <span style={{ fontSize: 10 }}>{rightSidebarCollapsed ? "«" : "»"}</span>
        </button>
        {/* 右侧边栏 */}
        {!rightSidebarCollapsed && (
          <div style={{ width: rightSidebarWidth, flexShrink: 0, position: "relative", backgroundColor: "var(--bg-sidebar)" }}>
            <div
              style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", cursor: "col-resize" }}
              onMouseDown={startResize("right")}
            />
            <RightSidebar />
          </div>
        )}
      </div>

      {/* 状态栏: 24px */}
      <StatusBar />

      <CommandPalette isOpen={showCommandPalette} onClose={() => setShowCommandPalette(false)} onOpenSettings={() => { setShowCommandPalette(false); setShowSettings(true); }} onToggleGraph={() => { setShowCommandPalette(false); setViewMode((prev) => (prev === "editor" ? "graph" : "editor")); }} />
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}

export default App;
