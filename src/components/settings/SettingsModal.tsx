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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}
        onClick={onClose}
      />

      {/* 模态框 */}
      <div
        className="relative w-[640px] h-[480px] rounded-md flex overflow-hidden"
        style={{
          backgroundColor: "var(--bg-primary)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
        }}
      >
        {/* 左侧标签 */}
        <div
          className="w-32 flex flex-col py-2"
          style={{ backgroundColor: "var(--bg-secondary)" }}
        >
          <div className="px-3 py-2 flex items-center justify-between">
            <h2 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              设置
            </h2>
            <button
              className="p-0.5 rounded hover:bg-[rgba(148,163,184,0.05)]"
              style={{ color: "var(--text-muted)" }}
              onClick={onClose}
            >
              <X size={14} />
            </button>
          </div>

          <div className="flex-1 px-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-xs transition-colors"
                style={{
                  backgroundColor: activeTab === tab.id ? "var(--accent-dim)" : "transparent",
                  color: activeTab === tab.id ? "var(--accent)" : "var(--text-secondary)",
                }}
                onClick={() => setActiveTab(tab.id)}
              >
                <tab.icon size={13} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 右侧内容 */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {activeTab === "ai" && <AISettings />}
          {activeTab === "sync" && <SyncSettings />}
          {activeTab === "theme" && (
            <div>
              <h2 className="text-base font-medium mb-4" style={{ color: "var(--text-primary)" }}>
                主题
              </h2>

              <div className="flex gap-3">
                {[
                  { id: "dark" as Theme, name: "暗色", icon: Moon },
                  { id: "light" as Theme, name: "亮色", icon: Sun },
                ].map((t) => (
                  <button
                    key={t.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-sm text-sm transition-colors"
                    style={{
                      backgroundColor: theme === t.id ? "var(--accent-dim)" : "var(--bg-secondary)",
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
              <h2 className="text-base font-medium mb-4" style={{ color: "var(--text-primary)" }}>
                快捷键
              </h2>
              <div className="space-y-1">
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
                    className="flex items-center justify-between px-3 py-1.5 rounded-sm"
                    style={{ backgroundColor: "var(--bg-secondary)" }}
                  >
                    <span className="text-xs" style={{ color: "var(--text-primary)" }}>{item.action}</span>
                    <kbd
                      className="px-1.5 py-0.5 rounded text-xs"
                      style={{
                        backgroundColor: "var(--bg-tertiary)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {item.key}
                    </kbd>
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
