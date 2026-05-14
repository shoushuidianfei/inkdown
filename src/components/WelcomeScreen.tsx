import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useAppStore, VaultInfo } from "../stores/useAppStore";

export function WelcomeScreen() {
  const setVault = useAppStore((state) => state.setVault);

  const handleOpenVault = async () => {
    try {
      const selected = await open({ directory: true, multiple: false, title: "选择 Vault 文件夹" });
      if (selected) {
        const vaultInfo = await invoke<VaultInfo>("open_vault", { path: selected });
        setVault(vaultInfo);
      }
    } catch (error) { console.error("打开 Vault 失败:", error); }
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg-app)" }}>
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <h1 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--font-medium)", color: "var(--text-primary)", letterSpacing: "-0.5px" }}>
          Ink<span style={{ color: "var(--accent)" }}>Down</span>
        </h1>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-tertiary)", marginTop: 8 }}>
          本地优先的知识管理
        </p>
      </div>

      <button
        onClick={handleOpenVault}
        style={{
          padding: "8px 24px", height: 34,
          fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)",
          borderRadius: "var(--radius-md)",
          backgroundColor: "var(--accent)", color: "#ffffff",
          transition: "background-color var(--duration-fast) var(--ease-default)",
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--accent-hover)"}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "var(--accent)"}
      >
        打开 Vault
      </button>

      <p style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", marginTop: 32 }}>
        Ctrl+O 打开文件夹
      </p>
    </div>
  );
}
