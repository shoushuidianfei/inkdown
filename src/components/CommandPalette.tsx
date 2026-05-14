import { useState, useEffect, useRef, useCallback } from "react";
import { useAppStore } from "../stores/useAppStore";
import {
  Search,
  FileText,
  FolderPlus,
  FilePlus,
  Settings,
  Network,
  X,
} from "lucide-react";

interface Command {
  id: string;
  label: string;
  description?: string;
  icon: any;
  action: () => void;
  category: "file" | "command" | "tag";
  keywords: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  onToggleGraph: () => void;
}

export function CommandPalette({ isOpen, onClose, onOpenSettings, onToggleGraph }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const {
    files,
    openFile,
    createNewFile,
    createNewFolder,
    allTags,
    loadAllTags,
  } = useAppStore();

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      loadAllTags();
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, loadAllTags]);

  // 模糊匹配算法
  const fuzzyMatch = useCallback((text: string, pattern: string): boolean => {
    const lowerText = text.toLowerCase();
    const lowerPattern = pattern.toLowerCase();

    let patternIdx = 0;
    for (let i = 0; i < lowerText.length && patternIdx < lowerPattern.length; i++) {
      if (lowerText[i] === lowerPattern[patternIdx]) {
        patternIdx++;
      }
    }
    return patternIdx === lowerPattern.length;
  }, []);

  // 获取所有命令
  const getCommands = useCallback((): Command[] => {
    const commands: Command[] = [];

    // 文件命令
    files.forEach((file) => {
      if (!file.is_dir) {
        commands.push({
          id: `file-${file.path}`,
          label: file.name.replace(".md", ""),
          description: file.path,
          icon: FileText,
          action: () => {
            openFile(file.path, file.name);
            onClose();
          },
          category: "file",
          keywords: [file.name, file.path],
        });
      }
    });

    // 标签命令
    allTags.forEach(([tag, count]) => {
      commands.push({
        id: `tag-${tag}`,
        label: `#${tag}`,
        description: `${count} 个文件`,
        icon: Search,
        action: () => {
          onClose();
        },
        category: "tag",
        keywords: [tag],
      });
    });

    // 应用命令
    commands.push(
      {
        id: "cmd-new-file",
        label: "新建文件",
        description: "创建新的 Markdown 文件",
        icon: FilePlus,
        action: () => {
          createNewFile("");
          onClose();
        },
        category: "command",
        keywords: ["new", "file", "create", "新建", "文件"],
      },
      {
        id: "cmd-new-folder",
        label: "新建文件夹",
        description: "创建新的文件夹",
        icon: FolderPlus,
        action: () => {
          createNewFolder("");
          onClose();
        },
        category: "command",
        keywords: ["new", "folder", "create", "新建", "文件夹"],
      },
      {
        id: "cmd-settings",
        label: "打开设置",
        description: "配置 AI、主题等设置",
        icon: Settings,
        action: () => {
          onOpenSettings();
          onClose();
        },
        category: "command",
        keywords: ["settings", "config", "设置", "配置"],
      },
      {
        id: "cmd-graph",
        label: "打开图谱",
        description: "查看知识图谱视图",
        icon: Network,
        action: () => {
          onToggleGraph();
        },
        category: "command",
        keywords: ["graph", "图谱", "知识图谱"],
      }
    );

    return commands;
  }, [files, allTags, openFile, createNewFile, createNewFolder, onOpenSettings, onClose, onToggleGraph]);

  // 过滤命令
  const filteredCommands = getCommands().filter((cmd) => {
    if (!query) return true;

    if (query.startsWith(">")) {
      const searchQuery = query.slice(1).trim();
      return cmd.category === "command" &&
        cmd.keywords.some((k) => fuzzyMatch(k, searchQuery));
    }

    if (query.startsWith("#")) {
      const searchQuery = query.slice(1).trim();
      return cmd.category === "tag" &&
        cmd.keywords.some((k) => fuzzyMatch(k, searchQuery));
    }

    return cmd.keywords.some((k) => fuzzyMatch(k, query));
  });

  // 键盘导航
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredCommands.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredCommands.length - 1
          );
          break;
        case "Enter":
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  // 滚动到选中项
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}
        onClick={onClose}
      />

      {/* 命令面板 */}
      <div
        className="relative w-[480px] rounded-md overflow-hidden"
        style={{
          backgroundColor: "var(--bg-primary)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
        }}
      >
        {/* 搜索框 */}
        <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
          <Search size={14} style={{ color: "var(--text-muted)" }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="搜索文件或命令..."
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: "var(--text-primary)" }}
          />
          <button
            className="p-0.5 rounded hover:bg-[rgba(148,163,184,0.05)]"
            style={{ color: "var(--text-muted)" }}
            onClick={onClose}
          >
            <X size={12} />
          </button>
        </div>

        {/* 命令列表 */}
        <div
          ref={listRef}
          className="max-h-[320px] overflow-y-auto py-1"
        >
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                未找到匹配结果
              </p>
            </div>
          ) : (
            filteredCommands.map((cmd, index) => (
              <div
                key={cmd.id}
                className="flex items-center gap-2 px-4 py-1.5 cursor-pointer"
                style={{
                  backgroundColor: index === selectedIndex ? "var(--accent-dim)" : "transparent",
                }}
                onClick={cmd.action}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <cmd.icon
                  size={13}
                  style={{ color: index === selectedIndex ? "var(--accent)" : "var(--text-muted)", flexShrink: 0 }}
                />
                <span
                  className="text-sm truncate flex-1"
                  style={{
                    color: index === selectedIndex ? "var(--accent)" : "var(--text-primary)",
                  }}
                >
                  {cmd.label}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
