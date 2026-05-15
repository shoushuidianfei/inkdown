import { useState, useEffect } from "react";
import { useSyncStore } from "../../stores/useSyncStore";
import { WEBDAV_PRESETS } from "../../services/webdav";

export function SyncSettings() {
  const {
    config,
    isConfigured,
    status,
    lastSyncTime,
    syncMessage,
    loadConfig,
    saveConfig,
    clearConfig,
    testConnection,
    applyPreset,
  } = useSyncStore();

  const [server, setServer] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [folder, setFolder] = useState("/inkdown/");
  const [showPassword, setShowPassword] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<boolean | null>(null);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  useEffect(() => {
    if (config) {
      setServer(config.server);
      setUsername(config.username);
      setPassword(config.password);
      setFolder(config.folder);
    }
  }, [config]);

  const handleSave = () => {
    saveConfig({ server, username, password, folder });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = () => {
    if (confirm("确定要清除同步配置吗？")) {
      clearConfig();
      setServer(""); setUsername(""); setPassword(""); setFolder("/inkdown/");
      setTestResult(null);
    }
  };

  const handleTest = async () => {
    setTesting(true); setTestResult(null);
    saveConfig({ server, username, password, folder });
    const result = await testConnection();
    setTestResult(result);
    setTesting(false);
  };

  const handlePresetChange = (preset: string) => {
    applyPreset(preset);
    const presetConfig = WEBDAV_PRESETS[preset];
    if (presetConfig) {
      setServer(presetConfig.server || "");
      setFolder(presetConfig.folder || "/inkdown/");
    }
  };

  const labelStyle: React.CSSProperties = { display: "block", fontSize: "var(--text-xs)", fontWeight: "var(--font-normal)", color: "var(--text-secondary)", marginBottom: 4 };
  const inputStyle: React.CSSProperties = {
    width: "100%", height: 32, padding: "0 8px",
    fontSize: "var(--text-sm)", fontWeight: "var(--font-normal)",
    backgroundColor: "var(--bg-hover)", color: "var(--text-primary)",
    borderRadius: "var(--radius-sm)", border: "var(--border-subtle)",
  };

  const statusColors: Record<string, { bg: string; text: string }> = {
    success: { bg: "var(--success)", text: "var(--text-on-accent)" },
    error: { bg: "var(--danger)", text: "var(--text-on-accent)" },
    syncing: { bg: "var(--warning)", text: "var(--text-on-accent)" },
    idle: { bg: "var(--bg-hover)", text: "var(--text-tertiary)" },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h2 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--text-primary)" }}>同步设置</h2>

      <div>
        <label style={labelStyle}>预设</label>
        <select value={isConfigured ? "custom" : ""} onChange={(e) => handlePresetChange(e.target.value)} style={inputStyle}>
          <option value="">选择预设</option>
          <option value="jianguoyun">坚果云</option>
          <option value="aliyundrive">阿里云盘</option>
          <option value="custom">自定义</option>
        </select>
      </div>

      <div>
        <label style={labelStyle}>服务器地址</label>
        <input type="text" value={server} onChange={(e) => setServer(e.target.value)} placeholder="https://dav.jianguoyun.com/dav/" style={inputStyle} />
      </div>

      <div>
        <label style={labelStyle}>用户名</label>
        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="your@email.com" style={inputStyle} />
      </div>

      <div>
        <label style={labelStyle}>密码</label>
        <div style={{ position: "relative" }}>
          <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="应用专用密码" style={{ ...inputStyle, paddingRight: 40 }} />
          <button
            style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? "隐藏" : "显示"}
          </button>
        </div>
      </div>

      <div>
        <label style={labelStyle}>远程文件夹</label>
        <input type="text" value={folder} onChange={(e) => setFolder(e.target.value)} style={inputStyle} />
      </div>

      {testResult !== null && (
        <p style={{ fontSize: "var(--text-xs)", color: testResult ? "var(--success)" : "var(--danger)" }}>
          {testResult ? "连接成功" : "连接失败"}
        </p>
      )}

      {isConfigured && (
        <div style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: 2 }}>
          <span
            style={{
              display: "inline-block", padding: "2px 6px", borderRadius: "var(--radius-sm)",
              backgroundColor: statusColors[status]?.bg || "var(--bg-hover)",
              color: statusColors[status]?.text || "var(--text-tertiary)",
              fontSize: 11, width: "fit-content",
            }}
          >
            {status === "idle" ? "未同步" : status === "syncing" ? "同步中" : status === "success" ? "已同步" : "失败"}
          </span>
          {syncMessage && <p>{syncMessage}</p>}
          {lastSyncTime && <p>{new Date(lastSyncTime).toLocaleString()}</p>}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, paddingTop: 8 }}>
        <button
          onClick={handleSave}
          style={{
            padding: "0 16px", height: 32, borderRadius: "var(--radius-sm)",
            fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)",
            backgroundColor: "var(--accent)", color: "var(--text-on-accent)",
          }}
        >
          {saved ? "已保存" : "保存"}
        </button>
        <button
          onClick={handleTest}
          disabled={testing || !server || !username}
          style={{
            padding: "0 16px", height: 32, borderRadius: "var(--radius-sm)",
            fontSize: "var(--text-xs)", fontWeight: "var(--font-normal)",
            color: "var(--text-primary)", opacity: testing || !server || !username ? 0.5 : 1,
          }}
        >
          {testing ? "测试中..." : "测试"}
        </button>
        {isConfigured && (
          <button
            onClick={handleClear}
            style={{
              padding: "0 16px", height: 32, borderRadius: "var(--radius-sm)",
              fontSize: "var(--text-xs)", fontWeight: "var(--font-normal)",
              color: "var(--danger)",
            }}
          >
            清除
          </button>
        )}
      </div>

      <p style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>坚果云需在账户设置中生成应用专用密码</p>
    </div>
  );
}
