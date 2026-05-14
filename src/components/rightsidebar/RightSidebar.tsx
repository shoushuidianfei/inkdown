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
    <div style={{ height: "100%", display: "flex", flexDirection: "column", backgroundColor: "var(--bg-sidebar)" }}>
      {/* 标签切换：单行横向排列，ghost button */}
      <div style={{ display: "flex", alignItems: "center", padding: "8px 8px 4px", gap: 2 }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "0 8px", height: 28, borderRadius: "var(--radius-sm)",
              fontSize: "var(--text-xs)", fontWeight: "var(--font-normal)",
              color: activeTab === tab.id ? "var(--accent)" : "var(--text-tertiary)",
              backgroundColor: activeTab === tab.id ? "var(--accent-muted)" : "transparent",
              transition: "all var(--duration-fast) var(--ease-default)",
            }}
            onClick={() => setActiveTab(tab.id)}
            onMouseEnter={(e) => { if (activeTab !== tab.id) e.currentTarget.style.backgroundColor = "var(--bg-hover)"; }}
            onMouseLeave={(e) => { if (activeTab !== tab.id) e.currentTarget.style.backgroundColor = "transparent"; }}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* 内容区域 */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {activeTab === "backlinks" && <BacklinksPanel />}
        {activeTab === "outline" && <OutlinePanel />}
        {activeTab === "ai" && <AIPanel />}
      </div>
    </div>
  );
}
