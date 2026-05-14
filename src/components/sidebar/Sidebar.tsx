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
    <div className="h-full flex flex-col" style={{ backgroundColor: "var(--bg-secondary)" }}>
      {/* 标签切换：横向单行，无下划线 */}
      <div className="flex items-center px-2 py-1 gap-0.5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-sm transition-colors"
            style={{
              color: activeTab === tab.id ? "var(--accent)" : "var(--text-muted)",
              backgroundColor: activeTab === tab.id ? "var(--accent-dim)" : "transparent",
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={13} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "files" && <FileTree />}
        {activeTab === "search" && <SearchPanel />}
        {activeTab === "bookmarks" && <BookmarksPanel />}
        {activeTab === "tags" && <TagsPanel />}
      </div>
    </div>
  );
}
