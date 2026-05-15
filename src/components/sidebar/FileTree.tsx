import { useState } from "react";
import { useAppStore, FileNode } from "../../stores/useAppStore";
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, FilePlus, FolderPlus, Pencil, Trash2, Bookmark } from "lucide-react";

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

  const handleClick = () => { if (node.is_dir) setIsExpanded(!isExpanded); else openFile(fullPath, node.name); };
  const handleContextMenu = (e: React.MouseEvent) => { e.preventDefault(); setShowContextMenu(true); };
  const handleRename = async () => {
    if (newName && newName !== node.name) {
      const parentDir = fullPath.substring(0, fullPath.lastIndexOf("/"));
      const newPath = parentDir ? `${parentDir}/${newName}` : newName;
      await renameFile(fullPath, newPath);
    }
    setIsRenaming(false);
  };
  const handleDelete = async () => { if (confirm(`确定要删除 "${node.name}" 吗？`)) await deleteFile(fullPath); setShowContextMenu(false); };

  return (
    <div>
      <div
        className="hover-bg"
        onClick={handleClick} onContextMenu={handleContextMenu}
        style={{
          display: "flex", alignItems: "center", gap: "var(--space-2)",
          padding: `0 var(--space-3) 0 ${depth * 16 + 12}px`, height: 32,
          cursor: "pointer", position: "relative",
          fontSize: "var(--text-sm)", fontWeight: "var(--font-normal)", color: "var(--text-secondary)",
        }}
        onMouseLeave={() => setShowContextMenu(false)}
      >
        {node.is_dir && (
          <span style={{ width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-tertiary)" }}>
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        )}
        <span style={{ width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", color: node.is_dir ? "var(--accent)" : "var(--gray-500)" }}>
          {node.is_dir ? (isExpanded ? <FolderOpen size={14} /> : <Folder size={14} />) : <File size={14} />}
        </span>

        {isRenaming ? (
          <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} onBlur={handleRename}
            onKeyDown={(e) => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") setIsRenaming(false); }}
            style={{ flex: 1, padding: "2px 6px", fontSize: "var(--text-sm)", height: 24, border: "var(--border-accent)" }}
            autoFocus
          />
        ) : (
          <span className="text-ellipsis" style={{ flex: 1 }}>{node.name}</span>
        )}

        {/* 右键菜单 */}
        {showContextMenu && (
          <div className="popup-card" style={{ position: "absolute", left: "100%", top: 0, zIndex: 50, width: 160, padding: "var(--space-1)" }}>
            {node.is_dir && (<>
              <button className="menu-item" onClick={(e) => { e.stopPropagation(); createNewFile(fullPath); setShowContextMenu(false); }}><FilePlus size={14} /> 新建文件</button>
              <button className="menu-item" onClick={(e) => { e.stopPropagation(); createNewFolder(fullPath); setShowContextMenu(false); }}><FolderPlus size={14} /> 新建文件夹</button>
              <div style={{ height: 1, backgroundColor: "var(--gray-700)", margin: "var(--space-1) 0" }} />
            </>)}
            <button className="menu-item" onClick={(e) => { e.stopPropagation(); setIsRenaming(true); setShowContextMenu(false); }}><Pencil size={14} /> 重命名</button>
            {!node.is_dir && (
              <button className="menu-item" style={bookmarked ? { color: "var(--accent)" } : undefined} onClick={(e) => { e.stopPropagation(); bookmarked ? removeBookmark(fullPath) : addBookmark(fullPath); setShowContextMenu(false); }}>
                <Bookmark size={14} fill={bookmarked ? "currentColor" : "none"} /> {bookmarked ? "取消收藏" : "收藏"}
              </button>
            )}
            <button className="menu-item" style={{ color: "var(--danger)" }} onClick={(e) => { e.stopPropagation(); handleDelete(); }}><Trash2 size={14} /> 删除</button>
          </div>
        )}
      </div>

      {node.is_dir && isExpanded && node.children && (
        <div>{node.children.map((child) => <FileTreeItem key={child.path} node={child} depth={depth + 1} parentPath={fullPath} />)}</div>
      )}
    </div>
  );
}

export function FileTree() {
  const { files, vaultName, createNewFile, createNewFolder } = useAppStore();
  const [showRootMenu, setShowRootMenu] = useState(false);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--space-3) var(--space-3) var(--space-2)" }}>
        <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "var(--text-tertiary)" }}>
          {vaultName || "文件"}
        </span>
        <div style={{ position: "relative" }}>
          <button
            className="hover-bg"
            style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "var(--radius-md)", color: "var(--gray-400)" }}
            onClick={() => setShowRootMenu(!showRootMenu)} onMouseLeave={() => setShowRootMenu(false)}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
          </button>
          {showRootMenu && (
            <div className="popup-card" style={{ position: "absolute", right: 0, top: "100%", zIndex: 50, width: 160, padding: "var(--space-1)" }}>
              <button className="menu-item" onClick={() => { createNewFile(""); setShowRootMenu(false); }}><FilePlus size={14} /> 新建文件</button>
              <button className="menu-item" onClick={() => { createNewFolder(""); setShowRootMenu(false); }}><FolderPlus size={14} /> 新建文件夹</button>
            </div>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
        {files.length === 0 ? (
          <div style={{ padding: "var(--space-7) var(--space-4)", textAlign: "center" }}>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>暂无文件</p>
          </div>
        ) : files.map((node) => <FileTreeItem key={node.path} node={node} depth={0} parentPath="" />)}
      </div>
    </div>
  );
}
