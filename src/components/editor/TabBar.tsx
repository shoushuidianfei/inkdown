import { useAppStore, Tab } from "../../stores/useAppStore";
import { X } from "lucide-react";

export function TabBar() {
  const { openTabs, activeTabId, setActiveTab, closeTab } = useAppStore();

  if (openTabs.length === 0) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", overflowX: "auto", overflowY: "hidden", height: 40, minWidth: 0 }}>
      {openTabs.map((tab) => (
        <TabItem key={tab.id} tab={tab} isActive={tab.id === activeTabId} onClick={() => setActiveTab(tab.id)} onClose={() => closeTab(tab.id)} />
      ))}
    </div>
  );
}

interface TabItemProps {
  tab: Tab;
  isActive: boolean;
  onClick: () => void;
  onClose: () => void;
}

function TabItem({ tab, isActive, onClick, onClose }: TabItemProps) {
  return (
    <div
      onClick={onClick}
      className="group"
      style={{
        display: "flex", alignItems: "center", gap: "var(--space-2)",
        padding: "0 var(--space-3)", height: 40,
        cursor: "pointer", minWidth: 0, maxWidth: 180,
        fontSize: "var(--text-sm)", fontWeight: isActive ? "var(--font-medium)" : "var(--font-normal)",
        color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
        backgroundColor: isActive ? "var(--bg-main)" : "transparent",
        transition: "all var(--duration-fast) var(--ease-default)",
        position: "relative",
      }}
    >
      <span className="text-ellipsis" style={{ flex: 1 }}>
        {tab.name.replace(/\.md$/, "")}
      </span>
      {tab.isModified && <span style={{ color: "var(--warning)", fontSize: "var(--text-xs)" }}>•</span>}
      <button
        className="icon-btn opacity-0 group-hover:opacity-100"
        style={{ width: 20, height: 20, transition: "opacity var(--duration-fast) var(--ease-default)" }}
        onClick={(e) => { e.stopPropagation(); onClose(); }}
      >
        <X size={12} />
      </button>
    </div>
  );
}
