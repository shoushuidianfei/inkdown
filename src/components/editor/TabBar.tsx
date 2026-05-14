import { useAppStore, Tab } from "../../stores/useAppStore";
import { X } from "lucide-react";

export function TabBar() {
  const { openTabs, activeTabId, setActiveTab, closeTab } = useAppStore();

  if (openTabs.length === 0) {
    return null;
  }

  return (
    <div
      className="flex items-center overflow-x-auto"
      style={{
        backgroundColor: "var(--bg-secondary)",
        minHeight: "32px",
      }}
    >
      {openTabs.map((tab) => (
        <TabItem
          key={tab.id}
          tab={tab}
          isActive={tab.id === activeTabId}
          onClick={() => setActiveTab(tab.id)}
          onClose={() => closeTab(tab.id)}
        />
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
      className="flex items-center gap-1.5 px-3 py-1 cursor-pointer min-w-0 max-w-40 group"
      style={{
        backgroundColor: isActive ? "var(--bg-tertiary)" : "transparent",
        color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
      }}
      onClick={onClick}
    >
      <span className="truncate text-xs">
        {tab.name.replace(/\.md$/, "")}
      </span>
      {tab.isModified && (
        <span style={{ color: "var(--warning)" }}>•</span>
      )}
      <button
        className="opacity-0 group-hover:opacity-100 w-3.5 h-3.5 flex items-center justify-center rounded-sm hover:bg-[rgba(148,163,184,0.1)]"
        style={{ color: "var(--text-muted)", flexShrink: 0 }}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        <X size={10} />
      </button>
    </div>
  );
}
