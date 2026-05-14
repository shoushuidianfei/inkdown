import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

export interface FileNode {
  name: string;
  path: string;
  is_dir: boolean;
  children?: FileNode[];
  modified_at: number;
}

export interface Tab {
  id: string;
  path: string;
  name: string;
  content: string;
  isModified: boolean;
}

export interface VaultInfo {
  path: string;
  name: string;
}

export interface SearchResult {
  path: string;
  title: string;
  snippet: string;
  score: number;
}

export interface Backlink {
  source_path: string;
  target_path: string;
  link_text: string;
}

export interface GraphNode {
  id: string;
  title: string;
  tag_count: number;
  connection_count: number;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface AppState {
  // Vault 状态
  vaultPath: string | null;
  vaultName: string | null;

  // 文件树
  files: FileNode[];

  // 标签页
  openTabs: Tab[];
  activeTabId: string | null;

  // 保存状态
  saveStatus: "idle" | "saving" | "saved" | "error";

  // 搜索
  searchResults: SearchResult[];
  isSearching: boolean;

  // 反向链接
  backlinks: Backlink[];

  // 标签
  allTags: [string, number][];

  // 图谱
  graphData: GraphData | null;
  isLoadingGraph: boolean;

  // 编辑器滚动
  scrollToLine: ((line: number) => void) | null;

  // 收藏夹
  bookmarks: string[];

  // Actions
  setVault: (info: VaultInfo) => void;
  clearVault: () => void;
  loadFiles: () => Promise<void>;
  openFile: (path: string, name: string) => Promise<void>;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateTabContent: (tabId: string, content: string) => void;
  saveFile: (tabId: string) => Promise<void>;
  createNewFile: (parentPath: string) => Promise<void>;
  createNewFolder: (parentPath: string) => Promise<void>;
  renameFile: (oldPath: string, newPath: string) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;

  // 搜索
  search: (query: string) => Promise<void>;
  clearSearch: () => void;

  // 反向链接
  loadBacklinks: (filePath: string) => Promise<void>;

  // 标签
  loadAllTags: () => Promise<void>;

  // 图谱
  loadGraphData: () => Promise<void>;

  // 索引
  indexAllFiles: () => Promise<void>;

  // 设置滚动函数
  setScrollToLine: (fn: ((line: number) => void) | null) => void;

  // 收藏夹
  addBookmark: (path: string) => void;
  removeBookmark: (path: string) => void;
  isBookmarked: (path: string) => boolean;
}

export const useAppStore = create<AppState>((set, get) => ({
  // 初始状态
  vaultPath: null,
  vaultName: null,
  files: [],
  openTabs: [],
  activeTabId: null,
  saveStatus: "idle",
  searchResults: [],
  isSearching: false,
  backlinks: [],
  allTags: [],
  graphData: null,
  isLoadingGraph: false,
  scrollToLine: null,
  bookmarks: JSON.parse(localStorage.getItem("inkdown_bookmarks") || "[]"),

  // 设置 Vault
  setVault: (info: VaultInfo) => {
    // 记住 Vault 路径
    localStorage.setItem("inkdown_vault_path", info.path);
    set({
      vaultPath: info.path,
      vaultName: info.name,
      openTabs: [],
      activeTabId: null,
    });
    // 加载文件列表
    get().loadFiles();
    // 初始化索引
    get().indexAllFiles();
  },

  // 清除 Vault
  clearVault: () => {
    set({
      vaultPath: null,
      vaultName: null,
      files: [],
      openTabs: [],
      activeTabId: null,
      searchResults: [],
      backlinks: [],
      allTags: [],
      graphData: null,
    });
  },

  // 加载文件列表
  loadFiles: async () => {
    const { vaultPath } = get();
    if (!vaultPath) return;

    try {
      const files = await invoke<FileNode[]>("list_files", { vaultPath });
      set({ files });
    } catch (error) {
      console.error("加载文件列表失败:", error);
    }
  },

  // 打开文件
  openFile: async (path: string, name: string) => {
    const { vaultPath, openTabs } = get();
    if (!vaultPath) return;

    // 检查文件是否已经打开
    const existingTab = openTabs.find((tab) => tab.path === path);
    if (existingTab) {
      set({ activeTabId: existingTab.id });
      // 加载反向链接
      get().loadBacklinks(path);
      return;
    }

    try {
      const content = await invoke<string>("read_file", { vaultPath, relativePath: path });

      const newTab: Tab = {
        id: Date.now().toString(),
        path,
        name,
        content,
        isModified: false,
      };

      set({
        openTabs: [...openTabs, newTab],
        activeTabId: newTab.id,
      });

      // 加载反向链接
      get().loadBacklinks(path);
    } catch (error) {
      console.error("打开文件失败:", error);
    }
  },

  // 关闭标签页
  closeTab: (tabId: string) => {
    const { openTabs, activeTabId } = get();
    const tabIndex = openTabs.findIndex((tab) => tab.id === tabId);

    if (tabIndex === -1) return;

    const newTabs = openTabs.filter((tab) => tab.id !== tabId);

    // 如果关闭的是当前活动标签，需要切换到其他标签
    let newActiveTabId = activeTabId;
    if (activeTabId === tabId) {
      if (newTabs.length === 0) {
        newActiveTabId = null;
      } else if (tabIndex > 0) {
        newActiveTabId = newTabs[tabIndex - 1].id;
      } else {
        newActiveTabId = newTabs[0].id;
      }
    }

    set({
      openTabs: newTabs,
      activeTabId: newActiveTabId,
    });
  },

  // 设置活动标签
  setActiveTab: (tabId: string) => {
    const { openTabs } = get();
    const tab = openTabs.find((t) => t.id === tabId);
    if (tab) {
      set({ activeTabId: tabId });
      // 加载反向链接
      get().loadBacklinks(tab.path);
    }
  },

  // 更新标签内容
  updateTabContent: (tabId: string, content: string) => {
    const { openTabs } = get();
    set({
      openTabs: openTabs.map((tab) =>
        tab.id === tabId ? { ...tab, content, isModified: true } : tab
      ),
    });
  },

  // 保存文件
  saveFile: async (tabId: string) => {
    const { vaultPath, openTabs } = get();
    if (!vaultPath) return;

    const tab = openTabs.find((t) => t.id === tabId);
    if (!tab || !tab.isModified) return;

    set({ saveStatus: "saving" });

    try {
      await invoke("write_file", {
        vaultPath,
        relativePath: tab.path,
        content: tab.content,
      });

      // 更新索引
      await invoke("index_file", {
        vaultPath,
        relativePath: tab.path,
      });

      set({
        openTabs: openTabs.map((t) =>
          t.id === tabId ? { ...t, isModified: false } : t
        ),
        saveStatus: "saved",
      });

      // 2 秒后重置保存状态
      setTimeout(() => {
        set({ saveStatus: "idle" });
      }, 2000);
    } catch (error) {
      console.error("保存文件失败:", error);
      set({ saveStatus: "error" });
    }
  },

  // 创建新文件
  createNewFile: async (parentPath: string) => {
    const { vaultPath } = get();
    if (!vaultPath) return;

    try {
      const relativePath = parentPath ? `${parentPath}/新文件.md` : "新文件.md";
      const newFile = await invoke<FileNode>("create_file", {
        vaultPath,
        relativePath,
      });

      // 重新加载文件列表
      await get().loadFiles();

      // 打开新创建的文件
      await get().openFile(newFile.path, newFile.name);
    } catch (error) {
      console.error("创建文件失败:", error);
    }
  },

  // 创建新文件夹
  createNewFolder: async (parentPath: string) => {
    const { vaultPath } = get();
    if (!vaultPath) return;

    try {
      const relativePath = parentPath ? `${parentPath}/新文件夹` : "新文件夹";
      await invoke("create_directory", {
        vaultPath,
        relativePath,
      });

      // 重新加载文件列表
      await get().loadFiles();
    } catch (error) {
      console.error("创建文件夹失败:", error);
    }
  },

  // 重命名文件
  renameFile: async (oldPath: string, newPath: string) => {
    const { vaultPath, openTabs } = get();
    if (!vaultPath) return;

    try {
      await invoke("rename_file", { vaultPath, oldPath, newPath });

      // 更新打开的标签
      set({
        openTabs: openTabs.map((tab) =>
          tab.path === oldPath
            ? { ...tab, path: newPath, name: newPath.split("/").pop() || tab.name }
            : tab
        ),
      });

      // 重新加载文件列表
      await get().loadFiles();
    } catch (error) {
      console.error("重命名失败:", error);
    }
  },

  // 删除文件
  deleteFile: async (path: string) => {
    const { vaultPath, openTabs } = get();
    if (!vaultPath) return;

    try {
      await invoke("delete_file", { vaultPath, relativePath: path });

      // 关闭已删除文件的标签
      const tabToClose = openTabs.find((tab) => tab.path === path);
      if (tabToClose) {
        get().closeTab(tabToClose.id);
      }

      // 重新加载文件列表
      await get().loadFiles();
    } catch (error) {
      console.error("删除文件失败:", error);
    }
  },

  // 搜索
  search: async (query: string) => {
    if (!query.trim()) {
      set({ searchResults: [], isSearching: false });
      return;
    }

    set({ isSearching: true });

    try {
      const results = await invoke<SearchResult[]>("search", { query });
      set({ searchResults: results, isSearching: false });
    } catch (error) {
      console.error("搜索失败:", error);
      set({ searchResults: [], isSearching: false });
    }
  },

  // 清除搜索
  clearSearch: () => {
    set({ searchResults: [], isSearching: false });
  },

  // 加载反向链接
  loadBacklinks: async (filePath: string) => {
    try {
      const backlinks = await invoke<Backlink[]>("get_backlinks_for_file", { filePath });
      set({ backlinks });
    } catch (error) {
      console.error("加载反向链接失败:", error);
      set({ backlinks: [] });
    }
  },

  // 加载所有标签
  loadAllTags: async () => {
    try {
      const tags = await invoke<[string, number][]>("get_all_tags");
      set({ allTags: tags });
    } catch (error) {
      console.error("加载标签失败:", error);
    }
  },

  // 加载图谱数据
  loadGraphData: async () => {
    set({ isLoadingGraph: true });
    try {
      const data = await invoke<GraphData>("get_graph_data");
      set({ graphData: data, isLoadingGraph: false });
    } catch (error) {
      console.error("加载图谱数据失败:", error);
      set({ graphData: null, isLoadingGraph: false });
    }
  },

  // 索引所有文件
  indexAllFiles: async () => {
    const { vaultPath } = get();
    if (!vaultPath) return;

    try {
      const count = await invoke<number>("index_all_files", { vaultPath });
      console.log(`索引完成，共 ${count} 个文件`);
      // 加载标签
      get().loadAllTags();
    } catch (error) {
      console.error("索引文件失败:", error);
    }
  },

  // 设置滚动函数
  setScrollToLine: (fn) => {
    set({ scrollToLine: fn });
  },

  // 收藏夹
  addBookmark: (path: string) => {
    const { bookmarks } = get();
    if (!bookmarks.includes(path)) {
      const newBookmarks = [...bookmarks, path];
      localStorage.setItem("inkdown_bookmarks", JSON.stringify(newBookmarks));
      set({ bookmarks: newBookmarks });
    }
  },

  removeBookmark: (path: string) => {
    const { bookmarks } = get();
    const newBookmarks = bookmarks.filter((b) => b !== path);
    localStorage.setItem("inkdown_bookmarks", JSON.stringify(newBookmarks));
    set({ bookmarks: newBookmarks });
  },

  isBookmarked: (path: string) => {
    return get().bookmarks.includes(path);
  },
}));
