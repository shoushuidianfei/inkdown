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

  const MenuItem = ({ onClick, color, children }: any) => (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); setShowContextMenu(false); }}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 8,
        padding: "0 12px", height: 32, fontSize: "var(--text-sm)", fontWeight: "var(--font-normal)",
        color: color || "var(--text-secondary)",
        borderRadius: "var(--radius-sm)",
        transition: "background-color var(--duration-fast) var(--ease-default)",
      }}
      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--bg-hover)"}
      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
    >
      {children}
    </button>
  );

  return (
    <div>
      <div
        onClick={handleClick} onContextMenu={handleContextMenu}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: `0 12px 0 ${depth * 16 + 12}px`, height: 32,
          cursor: "pointer", position: "relative",
          fontSize: "var(--text-sm)", fontWeight: "var(--font-normal)", color: "var(--text-secondary)",
          transition: "background-color var(--duration-fast) var(--ease-default)",
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--bg-hover)"}
        onMouseLeave={(e) => { setShowContextMenu(false); e.currentTarget.style.backgroundColor = "transparent"; }}
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
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{node.name}</span>
        )}

        {/* 右键菜单 */}
        {showContextMenu && (
          <div style={{
            position: "absolute", left: "100%", top: 0, zIndex: 50,
            width: 160, padding: 4,
            backgroundColor: "var(--bg-elevated)", borderRadius: "var(--radius-md)",
            border: "var(--border-subtle)", boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}>
            {node.is_dir && (<>
              <MenuItem onClick={() => createNewFile(fullPath)}><FilePlus size={14} /> 新建文件</MenuItem>
              <MenuItem onClick={() => createNewFolder(fullPath)}><FolderPlus size={14} /> 新建文件夹</MenuItem>
              <div style={{ height: 1, backgroundColor: "var(--gray-700)", margin: "4px 0" }} />
            </>)}
            <MenuItem onClick={() => setIsRenaming(true)}><Pencil size={14} /> 重命名</MenuItem>
            {!node.is_dir && (
              <MenuItem onClick={() => bookmarked ? removeBookmark(fullPath) : addBookmark(fullPath)} color={bookmarked ? "var(--accent)" : undefined}>
                <Bookmark size={14} fill={bookmarked ? "currentColor" : "none"} /> {bookmarked ? "取消收藏" : "收藏"}
              </MenuItem>
            )}
            <MenuItem onClick={handleDelete} color="var(--danger)"><Trash2 size={14} /> 删除</MenuItem>
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 12px 8px" }}>
        <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", color: "var(--text-tertiary)" }}>
          {vaultName || "文件"}
        </span>
        <div style={{ position: "relative" }}>
          <button
            style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "var(--radius-md)", color: "var(--gray-400)", transition: "background-color var(--duration-fast) var(--ease-default)" }}
            onClick={() => setShowRootMenu(!showRootMenu)} onMouseLeave={() => setShowRootMenu(false)}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--bg-hover)"}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
          </button>
          {showRootMenu && (
            <div style={{ position: "absolute", right: 0, top: "100%", zIndex: 50, width: 160, padding: 4, backgroundColor: "var(--bg-elevated)", borderRadius: "var(--radius-md)", border: "var(--border-subtle)", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
              <button style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "0 12px", height: 32, fontSize: "var(--text-sm)", color: "var(--text-secondary)", borderRadius: "var(--radius-sm)" }}
                onClick={() => { createNewFile(""); setShowRootMenu(false); }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--bg-hover)"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
              ><FilePlus size={14} /> 新建文件</button>
              <button style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "0 12px", height: 32, fontSize: "var(--text-sm)", color: "var(--text-secondary)", borderRadius: "var(--radius-sm)" }}
                onClick={() => { createNewFolder(""); setShowRootMenu(false); }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--bg-hover)"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
              ><FolderPlus size={14} /> 新建文件夹</button>
            </div>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
        {files.length === 0 ? (
          <div style={{ padding: "48px 16px", textAlign: "center" }}>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>暂无文件</p>
          </div>
        ) : files.map((node) => <FileTreeItem key={node.path} node={node} depth={0} parentPath="" />)}
      </div>
    </div>
  );
}
