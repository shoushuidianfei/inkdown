import { useAppStore } from "../stores/useAppStore";

export function StatusBar() {
  const { activeTabId, openTabs, saveStatus } = useAppStore();
  const activeTab = openTabs.find((tab) => tab.id === activeTabId);
  const wordCount = activeTab ? activeTab.content.replace(/\s/g, "").length : 0;

  const dotColor: Record<string, string> = {
    saved: "var(--success)",
    saving: "var(--warning)",
    error: "var(--danger)",
    idle: "transparent",
  };

  return (
    <div style={{
      height: 24, display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 var(--space-3)", fontSize: "var(--text-xs)", fontWeight: "var(--font-normal)",
      color: "var(--text-tertiary)", backgroundColor: "var(--bg-sidebar)",
      borderTop: "var(--border-subtle)",
    }}>
      <span className="text-ellipsis">{activeTab?.path || ""}</span>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexShrink: 0 }}>
        {activeTab && <span>{wordCount} 字</span>}
        <div
          style={{ width: 6, height: 6, borderRadius: "var(--radius-full)", backgroundColor: dotColor[saveStatus] || "transparent" }}
          title={saveStatus === "saved" ? "已保存" : saveStatus === "saving" ? "保存中..." : saveStatus === "error" ? "保存失败" : ""}
        />
      </div>
    </div>
  );
}
