import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useAppStore, VaultInfo } from "../stores/useAppStore";

export function WelcomeScreen() {
  const setVault = useAppStore((state) => state.setVault);

  const handleOpenVault = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "选择 Vault 文件夹",
      });

      if (selected) {
        const vaultInfo = await invoke<VaultInfo>("open_vault", { path: selected });
        setVault(vaultInfo);
      }
    } catch (error) {
      console.error("打开 Vault 失败:", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8" style={{ backgroundColor: "var(--bg-primary)" }}>
      {/* Logo */}
      <div className="text-center">
        <h1 className="text-4xl font-light tracking-tight" style={{ color: "var(--text-primary)" }}>
          Ink<span style={{ color: "var(--accent)" }}>Down</span>
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          本地优先的知识管理
        </p>
      </div>

      {/* 打开按钮 */}
      <button
        onClick={handleOpenVault}
        className="px-6 py-2 text-sm font-medium rounded transition-colors hover:opacity-90"
        style={{ backgroundColor: "var(--accent)", color: "var(--bg-primary)" }}
      >
        打开 Vault
      </button>

      {/* 快捷键提示 */}
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        Ctrl+O 打开文件夹
      </p>
    </div>
  );
}
