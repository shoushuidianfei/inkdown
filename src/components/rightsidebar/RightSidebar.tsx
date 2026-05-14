import { useState } from "react";
import { BacklinksPanel } from "./BacklinksPanel";
import { OutlinePanel } from "./OutlinePanel";
import { AIPanel } from "./AIPanel";
import { Link, List, MessageSquare } from "lucide-react";

type RightSidebarTab = "backlinks" | "outline" | "ai";

export function RightSidebar() {
  const [activeTab, setActiveTab] = useState<RightSidebarTab>("backlinks");

  const tabs = [
    { id: "backlinks" as RightSidebarTab, icon: Link, label: "反向链接" },
    { id: "outline" as RightSidebarTab, icon: List, label: "大纲" },
    { id: "ai" as RightSidebarTab, icon: MessageSquare, label: "AI" },
  ];

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: "var(--bg-secondary)" }}>
      {/* 标签切换：单行横向排列，无边框 */}
      <div className="flex items-center px-2 py-1 gap-0.5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded-sm transition-colors"
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
        {activeTab === "backlinks" && <BacklinksPanel />}
        {activeTab === "outline" && <OutlinePanel />}
        {activeTab === "ai" && <AIPanel />}
      </div>
    </div>
  );
}
