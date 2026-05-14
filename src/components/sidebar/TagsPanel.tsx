import { useEffect } from "react";
import { useAppStore } from "../../stores/useAppStore";

export function TagsPanel() {
  const { allTags, loadAllTags, search } = useAppStore();

  useEffect(() => { loadAllTags(); }, [loadAllTags]);

  const handleTagClick = (tagName: string) => { search(`#${tagName}`); };

  if (allTags.length === 0) {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <p style={{ fontSize: "var(--text-xs)", textAlign: "center", color: "var(--text-tertiary)" }}>暂无标签</p>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "6px 12px" }}>
        <p style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>{allTags.length} 个标签</p>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {allTags.map(([tag, count]) => (
          <div
            key={tag}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "0 12px", height: 32, cursor: "pointer",
              transition: "background-color var(--duration-fast) var(--ease-default)",
            }}
            onClick={() => handleTagClick(tag)}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--bg-hover)"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
          >
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-primary)" }}>#{tag}</span>
            <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
