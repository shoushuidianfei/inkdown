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

  // 解析标题
  const headings = useMemo((): Heading[] => {
    if (!activeTab) return [];

    const lines = activeTab.content.split("\n");
    const result: Heading[] = [];

    let inCodeBlock = false;

    lines.forEach((line, index) => {
      if (line.trim().startsWith("```")) {
        inCodeBlock = !inCodeBlock;
        return;
      }

      if (inCodeBlock) return;

      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        result.push({
          level: match[1].length,
          text: match[2].trim(),
          line: index,
        });
      }
    });

    return result;
  }, [activeTab]);

  if (!activeTab) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-4">
        <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
          打开一个文件查看大纲
        </p>
      </div>
    );
  }

  if (headings.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-3 py-1.5">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            大纲 · {activeTab.name}
          </p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            暂无标题
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-1.5">
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          大纲 · {activeTab.name}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {headings.map((heading, index) => (
          <button
            key={index}
            className="w-full text-left px-3 py-1 hover:bg-[rgba(148,163,184,0.05)] transition-colors"
            style={{
              paddingLeft: `${(heading.level - 1) * 16 + 12}px`,
            }}
            onClick={() => {
              scrollToLine?.(heading.line);
            }}
          >
            <div className="flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{
                  backgroundColor:
                    heading.level === 1
                      ? "var(--accent)"
                      : heading.level === 2
                      ? "var(--success)"
                      : "var(--text-muted)",
                }}
              />
              <span
                className="text-xs truncate"
                style={{
                  color: heading.level === 1 ? "var(--text-primary)" : "var(--text-secondary)",
                  fontWeight: heading.level === 1 ? 500 : 400,
                }}
              >
                {heading.text}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
