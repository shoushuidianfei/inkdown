import { useMemo } from "react";
import { useAppStore } from "../../stores/useAppStore";

interface Heading {
  level: number;
  text: string;
  line: number;
}

export function OutlinePanel() {
  const { activeTabId, openTabs, scrollToLine } = useAppStore();
  const activeTab = openTabs.find((tab) => tab.id === activeTabId);

  const headings = useMemo((): Heading[] => {
    if (!activeTab) return [];
    const lines = activeTab.content.split("\n");
    const result: Heading[] = [];
    let inCodeBlock = false;

    lines.forEach((line, index) => {
      if (line.trim().startsWith("```")) { inCodeBlock = !inCodeBlock; return; }
      if (inCodeBlock) return;
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) result.push({ level: match[1].length, text: match[2].trim(), line: index });
    });

    return result;
  }, [activeTab]);

  if (!activeTab) {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <p style={{ fontSize: "var(--text-xs)", textAlign: "center", color: "var(--text-tertiary)" }}>打开一个文件查看大纲</p>
      </div>
    );
  }

  if (headings.length === 0) {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "6px 12px" }}>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>大纲 · {activeTab.name}</p>
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>暂无标题</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "6px 12px" }}>
        <p style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>大纲 · {activeTab.name}</p>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
        {headings.map((heading, index) => (
          <button
            key={index}
            style={{
              width: "100%", textAlign: "left", height: 28, cursor: "pointer",
              padding: `0 12px 0 ${(heading.level - 1) * 16 + 12}px`,
              display: "flex", alignItems: "center", gap: 6,
              transition: "background-color var(--duration-fast) var(--ease-default)",
            }}
            onClick={() => scrollToLine?.(heading.line)}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--bg-hover)"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
          >
            <span
              style={{
                width: 6, height: 6, borderRadius: "var(--radius-full)", flexShrink: 0,
                backgroundColor: heading.level === 1 ? "var(--accent)" : heading.level === 2 ? "var(--success)" : "var(--text-tertiary)",
              }}
            />
            <span
              style={{
                fontSize: "var(--text-xs)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                color: heading.level === 1 ? "var(--text-primary)" : "var(--text-secondary)",
                fontWeight: heading.level === 1 ? "var(--font-medium)" : "var(--font-normal)",
              }}
            >
              {heading.text}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
