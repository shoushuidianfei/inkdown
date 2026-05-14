import { useState } from "react";
import { FileTree } from "./FileTree";
import { SearchPanel } from "./SearchPanel";
import { TagsPanel } from "./TagsPanel";
import { BookmarksPanel } from "./BookmarksPanel";
import { Search, Bookmark, Tag, Files } from "lucide-react";

type SidebarTab = "files" | "search" | "bookmarks" | "tags";

export function Sidebar() {
  const [activeTab, setActiveTab] = useState<SidebarTab>("files");

  const tabs = [
    { id: "files" as SidebarTab, icon: Files, label: "文件" },
    { id: "search" as SidebarTab, icon: Search, label: "搜索" },
    { id: "bookmarks" as SidebarTab, icon: Bookmark, label: "收藏" },
    { id: "tags" as SidebarTab, icon: Tag, label: "标签" },
  ];

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* 标签切换：Ghost 按钮风格 */}
      <div style={{ display: "flex", alignItems: "center", padding: "8px 8px 4px", gap: 2 }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "6px 8px",
              fontSize: "var(--text-sm)", fontWeight: "var(--font-normal)",
              borderRadius: "var(--radius-sm)",
              color: activeTab === tab.id ? "var(--accent)" : "var(--text-tertiary)",
              backgroundColor: activeTab === tab.id ? "var(--accent-muted)" : "transparent",
              transition: "all var(--duration-fast) var(--ease-default)",
            }}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: "hidden" }}>
        {activeTab === "files" && <FileTree />}
        {activeTab === "search" && <SearchPanel />}
        {activeTab === "bookmarks" && <BookmarksPanel />}
        {activeTab === "tags" && <TagsPanel />}
      </div>
    </div>
  );
}
