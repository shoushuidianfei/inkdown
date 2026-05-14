import { useAppStore } from "../stores/useAppStore";

export function StatusBar() {
  const { activeTabId, openTabs, saveStatus } = useAppStore();

  const activeTab = openTabs.find((tab) => tab.id === activeTabId);

  // 计算字数
  const wordCount = activeTab
    ? activeTab.content.replace(/\s/g, "").length
    : 0;

  return (
    <div
      className="flex items-center justify-between px-3 py-0.5 text-xs"
      style={{
        backgroundColor: "var(--bg-secondary)",
        color: "var(--text-muted)",
      }}
    >
      {/* 左侧：当前文件路径 */}
      <span className="truncate">
        {activeTab?.path || ""}
      </span>

      {/* 右侧：字数 + 保存状态圆点 */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {activeTab && (
          <span>{wordCount} 字</span>
        )}
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{
            backgroundColor:
              saveStatus === "saved"
                ? "var(--success)"
                : saveStatus === "saving"
                ? "var(--warning)"
                : saveStatus === "error"
                ? "var(--error)"
                : "transparent",
          }}
          title={
            saveStatus === "saved"
              ? "已保存"
              : saveStatus === "saving"
              ? "保存中..."
              : saveStatus === "error"
              ? "保存失败"
              : ""
          }
        />
      </div>
    </div>
  );
}
