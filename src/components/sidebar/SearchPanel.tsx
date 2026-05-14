import { useState, useCallback } from "react";
import { useAppStore, SearchResult } from "../../stores/useAppStore";
import { Search, File, Loader2 } from "lucide-react";

export function SearchPanel() {
  const [query, setQuery] = useState("");
  const { searchResults, isSearching, search, clearSearch, openFile } = useAppStore();

  const debouncedSearch = useCallback(
    (() => {
      let timeout: ReturnType<typeof setTimeout>;
      return (q: string) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          if (q.trim()) search(q);
          else clearSearch();
        }, 300);
      };
    })(),
    [search, clearSearch]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    debouncedSearch(value);
  };

  const handleResultClick = (result: SearchResult) => {
    openFile(result.path, result.title || result.path.split("/").pop() || "");
  };

  const highlightSnippet = (snippet: string) => {
    return snippet.replace(/<mark>/g, `<mark style="background-color: var(--accent-muted); color: var(--text-primary); padding: 1px 2px; border-radius: var(--radius-sm);">`);
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* 搜索输入框 */}
      <div style={{ padding: "8px 12px" }}>
        <div style={{ position: "relative" }}>
          <Search
            size={13}
            style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }}
          />
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            placeholder="搜索笔记内容..."
            style={{
              width: "100%", padding: "0 8px 0 28px", height: 32,
              fontSize: "var(--text-xs)", fontWeight: "var(--font-normal)",
              backgroundColor: "var(--bg-hover)", color: "var(--text-primary)",
              borderRadius: "var(--radius-sm)",
            }}
          />
          {isSearching && (
            <Loader2
              size={12}
              style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)", animation: "spin 1s linear infinite" }}
            />
          )}
        </div>
      </div>

      {/* 搜索结果 */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {searchResults.length === 0 && query && !isSearching && (
          <div style={{ padding: "24px 16px", textAlign: "center" }}>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>未找到匹配结果</p>
          </div>
        )}

        {!query && (
          <div style={{ padding: "24px 16px", textAlign: "center" }}>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>输入关键词搜索笔记</p>
          </div>
        )}

        {searchResults.map((result, index) => (
          <div
            key={index}
            style={{
              padding: "6px 12px", cursor: "pointer",
              transition: "background-color var(--duration-fast) var(--ease-default)",
            }}
            onClick={() => handleResultClick(result)}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--bg-hover)"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <File size={12} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
              <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {result.title || result.path.split("/").pop()}
              </span>
            </div>
            <p
              style={{ fontSize: 11, color: "var(--text-secondary)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
              dangerouslySetInnerHTML={{ __html: highlightSnippet(result.snippet) }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
