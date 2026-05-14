import { useAppStore } from "../../stores/useAppStore";

export function BookmarksPanel() {
  const { bookmarks, openFile, removeBookmark } = useAppStore();

  if (bookmarks.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-4">
        <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
          暂无收藏
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-1.5">
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {bookmarks.length} 个收藏
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {bookmarks.map((path) => {
          const name = path.split("/").pop() || path;
          return (
            <div
              key={path}
              className="flex items-center px-3 py-1 cursor-pointer hover:bg-[rgba(148,163,184,0.05)] group transition-colors"
              onClick={() => openFile(path, name)}
            >
              <span className="flex-1 truncate text-xs" style={{ color: "var(--text-primary)" }}>
                {name.replace(/\.md$/, "")}
              </span>
              <button
                className="opacity-0 group-hover:opacity-100 text-[10px] px-1 rounded-sm hover:bg-[rgba(148,163,184,0.1)]"
                style={{ color: "var(--text-muted)" }}
                onClick={(e) => {
                  e.stopPropagation();
                  removeBookmark(path);
                }}
                title="取消收藏"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
