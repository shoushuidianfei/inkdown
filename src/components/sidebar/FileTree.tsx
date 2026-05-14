import { useState } from "react";
import { useAppStore, FileNode } from "../../stores/useAppStore";
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  FilePlus,
  FolderPlus,
  Pencil,
  Trash2,
  Bookmark,
} from "lucide-react";

interface FileTreeItemProps {
  node: FileNode;
  depth: number;
  parentPath: string;
}

function FileTreeItem({ node, depth, parentPath }: FileTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(depth < 2);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(node.name);

  const { openFile, createNewFile, createNewFolder, renameFile, deleteFile, addBookmark, removeBookmark, isBookmarked } = useAppStore();

  const fullPath = parentPath ? `${parentPath}/${node.name}` : node.name;
  const bookmarked = !node.is_dir && isBookmarked(fullPath);

  const handleClick = () => {
    if (node.is_dir) {
      setIsExpanded(!isExpanded);
    } else {
      openFile(fullPath, node.name);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowContextMenu(true);
  };

  const handleRename = async () => {
    if (newName && newName !== node.name) {
      const parentDir = fullPath.substring(0, fullPath.lastIndexOf("/"));
      const newPath = parentDir ? `${parentDir}/${newName}` : newName;
      await renameFile(fullPath, newPath);
    }
    setIsRenaming(false);
  };

  const handleDelete = async () => {
    if (confirm(`确定要删除 "${node.name}" 吗？`)) {
      await deleteFile(fullPath);
    }
    setShowContextMenu(false);
  };

  return (
    <div>
      <div
        className="flex items-center gap-1.5 px-2 py-0.5 cursor-pointer group relative"
        style={{
          paddingLeft: `${depth * 14 + 6}px`,
          color: "var(--text-primary)",
        }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onMouseLeave={() => setShowContextMenu(false)}
      >
        {/* 展开/折叠图标 */}
        {node.is_dir && (
          <span className="w-3 h-3 flex items-center justify-center" style={{ color: "var(--text-muted)" }}>
            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </span>
        )}

        {/* 文件/文件夹图标：极淡 */}
        <span className="w-3 h-3 flex items-center justify-center" style={{ color: node.is_dir ? "var(--text-secondary)" : "var(--text-muted)" }}>
          {node.is_dir ? (
            isExpanded ? <FolderOpen size={12} /> : <Folder size={12} />
          ) : (
            <File size={12} />
          )}
        </span>

        {/* 文件名 */}
        {isRenaming ? (
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
              if (e.key === "Escape") setIsRenaming(false);
            }}
            className="flex-1 px-1 py-0 text-xs"
            style={{
              backgroundColor: "var(--bg-tertiary)",
              border: "none",
              borderRadius: "3px",
              outline: "none",
            }}
            autoFocus
          />
        ) : (
          <span className="flex-1 truncate text-xs" style={{ color: bookmarked ? "var(--accent)" : "var(--text-primary)" }}>
            {node.name}
          </span>
        )}

        {/* 右键菜单 */}
        {showContextMenu && (
          <div
            className="absolute right-1 top-full z-50 w-40 py-1 rounded shadow-sm"
            style={{
              backgroundColor: "var(--bg-primary)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            }}
          >
            {node.is_dir && (
              <>
                <button
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-[rgba(148,163,184,0.05)]"
                  style={{ color: "var(--text-primary)" }}
                  onClick={(e) => { e.stopPropagation(); createNewFile(fullPath); setShowContextMenu(false); }}
                >
                  <FilePlus size={12} />
                  新建文件
                </button>
                <button
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-[rgba(148,163,184,0.05)]"
                  style={{ color: "var(--text-primary)" }}
                  onClick={(e) => { e.stopPropagation(); createNewFolder(fullPath); setShowContextMenu(false); }}
                >
                  <FolderPlus size={12} />
                  新建文件夹
                </button>
              </>
            )}
            <button
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-[rgba(148,163,184,0.05)]"
              style={{ color: "var(--text-primary)" }}
              onClick={(e) => { e.stopPropagation(); setIsRenaming(true); setShowContextMenu(false); }}
            >
              <Pencil size={12} />
              重命名
            </button>
            {!node.is_dir && (
              <button
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-[rgba(148,163,184,0.05)]"
                style={{ color: bookmarked ? "var(--accent)" : "var(--text-primary)" }}
                onClick={(e) => {
                  e.stopPropagation();
                  bookmarked ? removeBookmark(fullPath) : addBookmark(fullPath);
                  setShowContextMenu(false);
                }}
              >
                <Bookmark size={12} fill={bookmarked ? "currentColor" : "none"} />
                {bookmarked ? "取消收藏" : "收藏"}
              </button>
            )}
            <button
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-[rgba(148,163,184,0.05)]"
              style={{ color: "var(--error)" }}
              onClick={(e) => { e.stopPropagation(); handleDelete(); }}
            >
              <Trash2 size={12} />
              删除
            </button>
          </div>
        )}
      </div>

      {/* 子节点 */}
      {node.is_dir && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              parentPath={fullPath}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileTree() {
  const { files, vaultName, createNewFile, createNewFolder } = useAppStore();
  const [showRootMenu, setShowRootMenu] = useState(false);

  return (
    <div className="h-full flex flex-col">
      {/* 标题栏：无 border，紧凑 */}
      <div className="flex items-center justify-between px-3 py-1.5">
        <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
          {vaultName}
        </span>
        <div className="relative">
          <button
            className="w-5 h-5 flex items-center justify-center rounded-sm hover:bg-[rgba(148,163,184,0.05)]"
            style={{ color: "var(--text-muted)" }}
            onClick={() => setShowRootMenu(!showRootMenu)}
            onMouseLeave={() => setShowRootMenu(false)}
          >
            <span className="text-xs">+</span>
          </button>

          {showRootMenu && (
            <div
              className="absolute right-0 top-full z-50 w-36 py-1 rounded shadow-sm"
              style={{
                backgroundColor: "var(--bg-primary)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
              }}
            >
              <button
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-[rgba(148,163,184,0.05)]"
                style={{ color: "var(--text-primary)" }}
                onClick={() => { createNewFile(""); setShowRootMenu(false); }}
              >
                <FilePlus size={12} />
                新建文件
              </button>
              <button
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-[rgba(148,163,184,0.05)]"
                style={{ color: "var(--text-primary)" }}
                onClick={() => { createNewFolder(""); setShowRootMenu(false); }}
              >
                <FolderPlus size={12} />
                新建文件夹
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 文件树 */}
      <div className="flex-1 overflow-y-auto py-1">
        {files.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              暂无文件
            </p>
          </div>
        ) : (
          files.map((node) => (
            <FileTreeItem key={node.path} node={node} depth={0} parentPath="" />
          ))
        )}
      </div>
    </div>
  );
}
