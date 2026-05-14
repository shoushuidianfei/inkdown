import { useAppStore } from "../../stores/useAppStore";

export function BookmarksPanel() {
  const { bookmarks, openFile, removeBookmark } = useAppStore();

  if (bookmarks.length === 0) {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <p style={{ fontSize: "var(--text-xs)", textAlign: "center", color: "var(--text-tertiary)" }}>暂无收藏</p>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "6px 12px" }}>
        <p style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>{bookmarks.length} 个收藏</p>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {bookmarks.map((path) => {
          const name = path.split("/").pop() || path;
          return (
            <div
              key={path}
              style={{
                display: "flex", alignItems: "center", padding: "0 12px", height: 32,
                cursor: "pointer", transition: "background-color var(--duration-fast) var(--ease-default)",
              }}
              onClick={() => openFile(path, name)}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--bg-hover)"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
            >
              <span style={{ flex: 1, fontSize: "var(--text-xs)", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {name.replace(/\.md$/, "")}
              </span>
              <button
                style={{
                  width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center",
                  borderRadius: "var(--radius-sm)", fontSize: 12, color: "var(--text-tertiary)",
                  opacity: 0, transition: "opacity var(--duration-fast) var(--ease-default)",
                }}
                className="bookmark-remove"
                onClick={(e) => { e.stopPropagation(); removeBookmark(path); }}
                title="取消收藏"
              >
                x
              </button>
            </div>
          );
        })}
      </div>
      <style>{`.bookmark-remove { opacity: 0; } div:hover > .bookmark-remove { opacity: 1; }`}</style>
    </div>
  );
}
