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
      <div style={{ display: "flex", alignItems: "center", padding: "var(--space-2) var(--space-2) var(--space-1)", gap: 2 }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn${activeTab === tab.id ? " active" : ""}`}
            style={{ height: 28, fontSize: "var(--text-sm)", padding: "var(--space-2) var(--space-2)" }}
            onClick={() => setActiveTab(tab.id)}
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
