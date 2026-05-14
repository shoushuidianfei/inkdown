import { useEffect } from "react";
import { useAppStore } from "../../stores/useAppStore";

export function TagsPanel() {
  const { allTags, loadAllTags, search } = useAppStore();

  useEffect(() => {
    loadAllTags();
  }, [loadAllTags]);

  const handleTagClick = (tagName: string) => {
    search(`#${tagName}`);
  };

  if (allTags.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-4">
        <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
          暂无标签
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-1.5">
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {allTags.length} 个标签
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {allTags.map(([tag, count]) => (
          <div
            key={tag}
            className="flex items-center justify-between px-3 py-1 cursor-pointer hover:bg-[rgba(148,163,184,0.05)]"
            onClick={() => handleTagClick(tag)}
          >
            <span className="text-xs" style={{ color: "var(--text-primary)" }}>
              #{tag}
            </span>
            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              {count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
