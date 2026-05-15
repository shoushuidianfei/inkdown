import { useState } from "react";
import { AISettings } from "./AISettings";
import { SyncSettings } from "./SyncSettings";
import { useTheme, Theme } from "../../hooks/useTheme";
import { X, Bot, Palette, Keyboard, Moon, Sun, Check, Cloud } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsTab = "ai" | "sync" | "theme" | "shortcuts";

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("ai");
  const { theme, setTheme } = useTheme();

  if (!isOpen) return null;

  const tabs = [
    { id: "ai" as SettingsTab, icon: Bot, label: "AI" },
    { id: "sync" as SettingsTab, icon: Cloud, label: "同步" },
    { id: "theme" as SettingsTab, icon: Palette, label: "主题" },
    { id: "shortcuts" as SettingsTab, icon: Keyboard, label: "快捷键" },
  ];

  return (
    <div className="overlay" style={{ alignItems: "center" }}>
      <div style={{ position: "absolute", inset: 0 }} onClick={onClose} />

      <div
        style={{
          position: "relative", width: 520, height: 420, borderRadius: "var(--radius-lg)",
          display: "flex", overflow: "hidden",
          backgroundColor: "var(--bg-elevated)",
          boxShadow: "var(--shadow-popup)",
        }}
      >
        {/* 左侧标签 */}
        <div style={{ width: 120, display: "flex", flexDirection: "column", padding: "var(--space-2) 0", backgroundColor: "var(--bg-sidebar)" }}>
          <div style={{ padding: "0 var(--space-3)", height: 40, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "var(--text-primary)" }}>设置</span>
            <button className="icon-btn" style={{ width: 24, height: 24 }} onClick={onClose}><X size={14} /></button>
          </div>

          <div style={{ flex: 1, padding: "0 var(--space-1)" }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`tab-btn${activeTab === tab.id ? " active" : ""}`}
                style={{ width: "100%", height: 32, fontSize: "var(--text-xs)" }}
                onClick={() => setActiveTab(tab.id)}
              >
                <tab.icon size={13} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 右侧内容 */}
        <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-5)" }}>
          {activeTab === "ai" && <AISettings />}
          {activeTab === "sync" && <SyncSettings />}
          {activeTab === "theme" && (
            <div>
              <h2 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--text-primary)", marginBottom: "var(--space-5)" }}>
                主题
              </h2>

              <div style={{ display: "flex", gap: "var(--space-3)" }}>
                {[
                  { id: "dark" as Theme, name: "暗色", icon: Moon },
                  { id: "light" as Theme, name: "亮色", icon: Sun },
                ].map((t) => (
                  <button
                    key={t.id}
                    className="hover-bg"
                    style={{
                      display: "flex", alignItems: "center", gap: "var(--space-2)",
                      padding: "0 var(--space-3)", height: 36, borderRadius: "var(--radius-md)",
                      fontSize: "var(--text-sm)", fontWeight: "var(--font-normal)",
                      backgroundColor: theme === t.id ? "var(--accent-muted)" : "var(--bg-hover)",
                      color: theme === t.id ? "var(--accent)" : "var(--text-primary)",
                    }}
                    onClick={() => setTheme(t.id)}
                  >
                    {theme === t.id && <Check size={12} />}
                    <t.icon size={14} />
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {activeTab === "shortcuts" && (
            <div>
              <h2 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--text-primary)", marginBottom: "var(--space-5)" }}>
                快捷键
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
                {[
                  { key: "Ctrl+K", action: "命令面板" },
                  { key: "Ctrl+P", action: "快速打开文件" },
                  { key: "Ctrl+O", action: "打开 Vault" },
                  { key: "Ctrl+N", action: "新建文件" },
                  { key: "Ctrl+S", action: "保存文件" },
                  { key: "Ctrl+W", action: "关闭当前标签" },
                  { key: "Ctrl+G", action: "切换图谱视图" },
                  { key: "Ctrl+Shift+E", action: "切换阅读模式" },
                  { key: "Ctrl+,", action: "打开设置" },
                ].map((item) => (
                  <div
                    key={item.key}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "0 var(--space-3)", height: 32, borderRadius: "var(--radius-sm)",
                      backgroundColor: "var(--bg-hover)",
                    }}
                  >
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--text-primary)" }}>{item.action}</span>
                    <kbd>{item.key}</kbd>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
