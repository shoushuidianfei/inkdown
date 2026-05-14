import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  WebDAVConfig,
  SyncResult,
  saveSyncConfig,
  loadSyncConfig,
  WEBDAV_PRESETS,
} from "../services/webdav";
import { useAppStore } from "./useAppStore";

export type SyncStatus = "idle" | "syncing" | "success" | "error";

interface SyncState {
  // 配置
  config: WebDAVConfig | null;
  isConfigured: boolean;

  // 同步状态
  status: SyncStatus;
  lastSyncTime: number | null;
  lastSyncResult: SyncResult | null;
  syncMessage: string;

  // Actions
  loadConfig: () => void;
  saveConfig: (config: WebDAVConfig) => void;
  clearConfig: () => void;
  testConnection: () => Promise<boolean>;
  startSync: () => Promise<void>;
  applyPreset: (preset: string) => void;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  // 初始状态
  config: null,
  isConfigured: false,
  status: "idle",
  lastSyncTime: null,
  lastSyncResult: null,
  syncMessage: "",

  // 加载配置
  loadConfig: () => {
    const config = loadSyncConfig();
    set({
      config,
      isConfigured: !!config,
    });
  },

  // 保存配置
  saveConfig: (config: WebDAVConfig) => {
    saveSyncConfig(config);
    set({
      config,
      isConfigured: true,
    });
  },

  // 清除配置
  clearConfig: () => {
    localStorage.removeItem("inkdown_sync_config");
    set({
      config: null,
      isConfigured: false,
      status: "idle",
      lastSyncTime: null,
      lastSyncResult: null,
    });
  },

  // 测试连接（通过 Rust 后端）
  testConnection: async () => {
    const { config } = get();
    if (!config) return false;

    try {
      return await invoke<boolean>("webdav_test_connection", { config });
    } catch (error) {
      console.error("连接测试失败:", error);
      return false;
    }
  },

  // 开始同步（通过 Rust 后端）
  startSync: async () => {
    const { config } = get();
    if (!config) return;

    const { vaultPath } = useAppStore.getState();
    if (!vaultPath) return;

    set({
      status: "syncing",
      syncMessage: "准备同步...",
    });

    // 监听同步进度事件
    const unlisten = await listen<string>("sync-progress", (event) => {
      set({ syncMessage: event.payload });
    });

    try {
      const result = await invoke<SyncResult>("webdav_sync", {
        vaultPath,
        config,
      });

      set({
        status: result.errors.length > 0 ? "error" : "success",
        lastSyncTime: Date.now(),
        lastSyncResult: result,
        syncMessage: result.errors.length > 0
          ? `同步完成，但有 ${result.errors.length} 个错误`
          : `同步完成：上传 ${result.uploaded.length}，下载 ${result.downloaded.length}`,
      });
    } catch (error) {
      set({
        status: "error",
        syncMessage: `同步失败: ${error}`,
      });
    } finally {
      unlisten();
    }
  },

  // 应用预设
  applyPreset: (preset: string) => {
    const presetConfig = WEBDAV_PRESETS[preset];
    if (!presetConfig) return;

    const { config } = get();
    set({
      config: {
        server: presetConfig.server || "",
        username: config?.username || "",
        password: config?.password || "",
        folder: presetConfig.folder || "/inkdown/",
      },
    });
  },
}));
