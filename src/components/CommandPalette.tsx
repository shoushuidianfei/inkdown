import { useState, useEffect, useRef, useCallback } from "react";
import { useAppStore } from "../stores/useAppStore";
import { Search, FileText, FolderPlus, FilePlus, Settings, Network } from "lucide-react";

interface Command { id: string; label: string; icon: any; action: () => void; category: "file" | "command" | "tag"; keywords: string[]; }
interface CommandPaletteProps { isOpen: boolean; onClose: () => void; onOpenSettings: () => void; onToggleGraph: () => void; }

export function CommandPalette({ isOpen, onClose, onOpenSettings, onToggleGraph }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { files, openFile, createNewFile, createNewFolder, allTags, loadAllTags } = useAppStore();

  useEffect(() => { if (isOpen) { setQuery(""); setSelectedIndex(0); loadAllTags(); setTimeout(() => inputRef.current?.focus(), 50); } }, [isOpen, loadAllTags]);

  const fuzzyMatch = useCallback((text: string, pattern: string): boolean => {
    const lt = text.toLowerCase(), lp = pattern.toLowerCase();
    let pi = 0;
    for (let i = 0; i < lt.length && pi < lp.length; i++) { if (lt[i] === lp[pi]) pi++; }
    return pi === lp.length;
  }, []);

  const getCommands = useCallback((): Command[] => {
    const cmds: Command[] = [];
    files.forEach((f) => { if (!f.is_dir) cmds.push({ id: `file-${f.path}`, label: f.name.replace(".md", ""), icon: FileText, action: () => { openFile(f.path, f.name); onClose(); }, category: "file", keywords: [f.name, f.path] }); });
    allTags.forEach(([tag]) => cmds.push({ id: `tag-${tag}`, label: `#${tag}`, icon: Search, action: () => onClose(), category: "tag", keywords: [tag] }));
    cmds.push(
      { id: "cmd-new-file", label: "新建文件", icon: FilePlus, action: () => { createNewFile(""); onClose(); }, category: "command", keywords: ["new", "file", "新建", "文件"] },
      { id: "cmd-new-folder", label: "新建文件夹", icon: FolderPlus, action: () => { createNewFolder(""); onClose(); }, category: "command", keywords: ["new", "folder", "新建", "文件夹"] },
      { id: "cmd-settings", label: "打开设置", icon: Settings, action: () => { onOpenSettings(); onClose(); }, category: "command", keywords: ["settings", "设置"] },
      { id: "cmd-graph", label: "打开图谱", icon: Network, action: () => onToggleGraph(), category: "command", keywords: ["graph", "图谱"] },
    );
    return cmds;
  }, [files, allTags, openFile, createNewFile, createNewFolder, onOpenSettings, onClose, onToggleGraph]);

  const filtered = getCommands().filter((cmd) => {
    if (!query) return true;
    if (query.startsWith(">")) { const q = query.slice(1).trim(); return cmd.category === "command" && cmd.keywords.some((k) => fuzzyMatch(k, q)); }
    if (query.startsWith("#")) { const q = query.slice(1).trim(); return cmd.category === "tag" && cmd.keywords.some((k) => fuzzyMatch(k, q)); }
    return cmd.keywords.some((k) => fuzzyMatch(k, query));
  });

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex((p) => p < filtered.length - 1 ? p + 1 : 0); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex((p) => p > 0 ? p - 1 : filtered.length - 1); }
      else if (e.key === "Enter") { e.preventDefault(); filtered[selectedIndex]?.action(); }
      else if (e.key === "Escape") { e.preventDefault(); onClose(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [isOpen, filtered, selectedIndex, onClose]);

  useEffect(() => { if (listRef.current) { const el = listRef.current.children[selectedIndex] as HTMLElement; if (el) el.scrollIntoView({ block: "nearest" }); } }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="overlay" style={{ paddingTop: "20vh" }}>
      <div style={{ position: "absolute", inset: 0 }} onClick={onClose} />
      <div style={{ position: "relative", width: 560, maxHeight: 400, borderRadius: "var(--radius-lg)", overflow: "hidden", backgroundColor: "var(--bg-elevated)", border: "var(--border-subtle)", boxShadow: "var(--shadow-popup)" }}>
        {/* 搜索框 */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", padding: "0 var(--space-4)", height: 48, borderBottom: "0.5px solid var(--gray-700)" }}>
          <Search size={16} style={{ color: "var(--gray-500)", flexShrink: 0 }} />
          <input ref={inputRef} type="text" value={query} onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            placeholder="搜索文件、命令或标签..."
            style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: "var(--text-sm)", color: "var(--text-primary)", height: "100%" }}
          />
        </div>

        {/* 结果列表 */}
        <div ref={listRef} style={{ maxHeight: 340, overflowY: "auto", padding: "var(--space-1) 0" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "var(--space-6) var(--space-4)", textAlign: "center", fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>未找到匹配结果</div>
          ) : filtered.map((cmd, i) => (
            <div key={cmd.id} onClick={cmd.action} onMouseEnter={() => setSelectedIndex(i)}
              style={{
                display: "flex", alignItems: "center", gap: "var(--space-3)",
                padding: "0 var(--space-4)", height: 36, cursor: "pointer",
                fontSize: "var(--text-sm)", fontWeight: i === selectedIndex ? "var(--font-medium)" : "var(--font-normal)",
                color: i === selectedIndex ? "var(--accent)" : "var(--text-secondary)",
                backgroundColor: i === selectedIndex ? "var(--accent-muted)" : "transparent",
                transition: "background-color var(--duration-fast) var(--ease-default)",
              }}
            >
              <cmd.icon size={14} style={{ color: i === selectedIndex ? "var(--accent)" : "var(--gray-500)", flexShrink: 0 }} />
              <span className="text-ellipsis" style={{ flex: 1 }}>{cmd.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
