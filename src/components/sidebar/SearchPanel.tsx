import { useState, useCallback } from "react";
import { useAppStore, SearchResult } from "../../stores/useAppStore";
import { Search, File, Loader2 } from "lucide-react";

export function SearchPanel() {
  const [query, setQuery] = useState("");
  const { searchResults, isSearching, search, clearSearch, openFile } = useAppStore();

  // 防抖搜索
  const debouncedSearch = useCallback(
    (() => {
      let timeout: ReturnType<typeof setTimeout>;
      return (q: string) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          if (q.trim()) {
            search(q);
          } else {
            clearSearch();
          }
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

  // 高亮搜索关键词
  const highlightSnippet = (snippet: string) => {
    return snippet.replace(/<mark>/g, '<mark style="background-color: var(--accent-dim); color: var(--text-primary); padding: 1px 2px; border-radius: 2px;">');
  };

  return (
    <div className="h-full flex flex-col">
      {/* 搜索输入框 */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search
            size={13}
            className="absolute left-2.5 top-1/2 transform -translate-y-1/2"
            style={{ color: "var(--text-muted)" }}
          />
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            placeholder="搜索笔记内容..."
            className="w-full pl-8 pr-3 py-1.5 text-xs"
            style={{
              backgroundColor: "var(--bg-tertiary)",
              color: "var(--text-primary)",
            }}
          />
          {isSearching && (
            <Loader2
              size={12}
              className="absolute right-2.5 top-1/2 transform -translate-y-1/2 animate-spin"
              style={{ color: "var(--text-muted)" }}
            />
          )}
        </div>
      </div>

      {/* 搜索结果 */}
      <div className="flex-1 overflow-y-auto">
        {searchResults.length === 0 && query && !isSearching && (
          <div className="px-4 py-6 text-center">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              未找到匹配结果
            </p>
          </div>
        )}

        {!query && (
          <div className="px-4 py-6 text-center">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              输入关键词搜索笔记
            </p>
          </div>
        )}

        {searchResults.map((result, index) => (
          <div
            key={index}
            className="px-3 py-1.5 cursor-pointer hover:bg-[rgba(148,163,184,0.05)]"
            onClick={() => handleResultClick(result)}
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              <File size={12} style={{ color: "var(--text-muted)" }} />
              <span className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>
                {result.title || result.path.split("/").pop()}
              </span>
            </div>
            <p
              className="text-[11px] line-clamp-2"
              style={{ color: "var(--text-secondary)" }}
              dangerouslySetInnerHTML={{ __html: highlightSnippet(result.snippet) }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
