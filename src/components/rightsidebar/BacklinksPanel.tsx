import { useAppStore, Backlink } from "../../stores/useAppStore";

export function BacklinksPanel() {
  const { backlinks, activeTabId, openTabs, openFile } = useAppStore();

  const activeTab = openTabs.find((tab) => tab.id === activeTabId);

  if (!activeTab) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-4">
        <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
          打开一个文件查看反向链接
        </p>
      </div>
    );
  }

  if (backlinks.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-3 py-1.5">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            反向链接 · {activeTab.name}
          </p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            暂无反向链接
          </p>
        </div>
      </div>
    );
  }

  const handleBacklinkClick = (backlink: Backlink) => {
    const fileName = backlink.source_path.split("/").pop() || backlink.source_path;
    openFile(backlink.source_path, fileName);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-1.5">
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          反向链接 · {activeTab.name} ({backlinks.length})
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {backlinks.map((backlink, index) => (
          <div
            key={index}
            className="px-3 py-1.5 cursor-pointer hover:bg-[rgba(148,163,184,0.05)]"
            onClick={() => handleBacklinkClick(backlink)}
          >
            <div className="text-xs truncate" style={{ color: "var(--text-primary)" }}>
              {backlink.source_path.split("/").pop()?.replace('.md', '')}
            </div>
            <div className="text-[11px] truncate mt-0.5" style={{ color: "var(--text-secondary)" }}>
              {backlink.link_text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
