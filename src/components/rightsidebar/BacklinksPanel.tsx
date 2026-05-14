import { useAppStore, Backlink } from "../../stores/useAppStore";

export function BacklinksPanel() {
  const { backlinks, activeTabId, openTabs, openFile } = useAppStore();
  const activeTab = openTabs.find((tab) => tab.id === activeTabId);

  if (!activeTab) {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <p style={{ fontSize: "var(--text-xs)", textAlign: "center", color: "var(--text-tertiary)" }}>打开一个文件查看反向链接</p>
      </div>
    );
  }

  if (backlinks.length === 0) {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "6px 12px" }}>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>反向链接 · {activeTab.name}</p>
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>暂无反向链接</p>
        </div>
      </div>
    );
  }

  const handleBacklinkClick = (backlink: Backlink) => {
    const fileName = backlink.source_path.split("/").pop() || backlink.source_path;
    openFile(backlink.source_path, fileName);
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "6px 12px" }}>
        <p style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>
          反向链接 · {activeTab.name} ({backlinks.length})
        </p>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {backlinks.map((backlink, index) => (
          <div
            key={index}
            style={{
              padding: "6px 12px", cursor: "pointer",
              transition: "background-color var(--duration-fast) var(--ease-default)",
            }}
            onClick={() => handleBacklinkClick(backlink)}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--bg-hover)"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
          >
            <div style={{ fontSize: "var(--text-xs)", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {backlink.source_path.split("/").pop()?.replace('.md', '')}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>
              {backlink.link_text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
