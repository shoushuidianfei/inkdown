import { useAppStore, Tab } from "../../stores/useAppStore";
import { X } from "lucide-react";

export function TabBar() {
  const { openTabs, activeTabId, setActiveTab, closeTab } = useAppStore();

  if (openTabs.length === 0) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", overflow: "x-auto", height: 40 }}>
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
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "0 12px", height: 40,
        cursor: "pointer", minWidth: 0, maxWidth: 180,
        fontSize: "var(--text-sm)", fontWeight: isActive ? "var(--font-medium)" : "var(--font-normal)",
        color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
        backgroundColor: isActive ? "var(--bg-main)" : "transparent",
        transition: "all var(--duration-fast) var(--ease-default)",
        position: "relative",
      }}
      className="group"
    >
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {tab.name.replace(/\.md$/, "")}
      </span>
      {tab.isModified && <span style={{ color: "var(--warning)", fontSize: "var(--text-xs)" }}>•</span>}
      <button
        className="opacity-0 group-hover:opacity-100"
        style={{
          width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: "var(--radius-sm)", flexShrink: 0,
          color: "var(--text-tertiary)",
          transition: "opacity var(--duration-fast) var(--ease-default)",
        }}
        onClick={(e) => { e.stopPropagation(); onClose(); }}
      >
        <X size={12} />
      </button>
    </div>
  );
}
