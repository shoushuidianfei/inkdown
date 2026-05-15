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
      <div style={{ display: "flex", alignItems: "center", padding: "var(--space-2) var(--space-2) var(--space-1)", gap: 2 }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn${activeTab === tab.id ? " active" : ""}`}
            style={{ height: 28, fontSize: "var(--text-xs)", gap: "var(--space-1)", padding: "0 var(--space-2)" }}
            onClick={() => setActiveTab(tab.id)}
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
