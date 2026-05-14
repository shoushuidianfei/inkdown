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

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

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
      setServer("");
      setUsername("");
      setPassword("");
      setFolder("/inkdown/");
      setTestResult(null);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
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

  return (
    <div className="space-y-4">
      <h2 className="text-base font-medium" style={{ color: "var(--text-primary)" }}>
        同步设置
      </h2>

      {/* 预设 */}
      <div>
        <label className="block text-xs mb-1" style={{ color: "var(--text-secondary)" }}>
          预设
        </label>
        <select
          value={isConfigured ? "custom" : ""}
          onChange={(e) => handlePresetChange(e.target.value)}
          className="w-full text-sm"
        >
          <option value="">选择预设</option>
          <option value="jianguoyun">坚果云</option>
          <option value="aliyundrive">阿里云盘</option>
          <option value="custom">自定义</option>
        </select>
      </div>

      {/* 服务器 */}
      <div>
        <label className="block text-xs mb-1" style={{ color: "var(--text-secondary)" }}>
          服务器地址
        </label>
        <input
          type="text"
          value={server}
          onChange={(e) => setServer(e.target.value)}
          placeholder="https://dav.jianguoyun.com/dav/"
          className="w-full text-sm"
        />
      </div>

      {/* 用户名 */}
      <div>
        <label className="block text-xs mb-1" style={{ color: "var(--text-secondary)" }}>
          用户名
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="your@email.com"
          className="w-full text-sm"
        />
      </div>

      {/* 密码 */}
      <div>
        <label className="block text-xs mb-1" style={{ color: "var(--text-secondary)" }}>
          密码
        </label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="应用专用密码"
            className="w-full text-sm pr-8"
          />
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs"
            style={{ color: "var(--text-muted)" }}
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? "隐藏" : "显示"}
          </button>
        </div>
      </div>

      {/* 文件夹 */}
      <div>
        <label className="block text-xs mb-1" style={{ color: "var(--text-secondary)" }}>
          远程文件夹
        </label>
        <input
          type="text"
          value={folder}
          onChange={(e) => setFolder(e.target.value)}
          className="w-full text-sm"
        />
      </div>

      {/* 测试结果 */}
      {testResult !== null && (
        <p
          className="text-xs"
          style={{ color: testResult ? "var(--success)" : "var(--error)" }}
        >
          {testResult ? "连接成功" : "连接失败"}
        </p>
      )}

      {/* 同步状态 */}
      {isConfigured && (
        <div className="text-xs space-y-0.5" style={{ color: "var(--text-secondary)" }}>
          <span
            className="inline-block px-1.5 py-0.5 rounded-sm"
            style={{
              backgroundColor:
                status === "success" ? "var(--success)"
                : status === "error" ? "var(--error)"
                : status === "syncing" ? "var(--warning)"
                : "var(--bg-tertiary)",
              color: status === "idle" ? "var(--text-muted)" : "var(--bg-primary)",
            }}
          >
            {status === "idle" ? "未同步" : status === "syncing" ? "同步中" : status === "success" ? "已同步" : "失败"}
          </span>
          {syncMessage && <p>{syncMessage}</p>}
          {lastSyncTime && <p>{new Date(lastSyncTime).toLocaleString()}</p>}
        </div>
      )}

      {/* 按钮 */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleSave}
          className="px-4 py-1.5 text-xs font-medium rounded-sm transition-opacity hover:opacity-90"
          style={{ backgroundColor: "var(--accent)", color: "var(--bg-primary)" }}
        >
          {saved ? "已保存" : "保存"}
        </button>
        <button
          onClick={handleTest}
          disabled={testing || !server || !username}
          className="px-4 py-1.5 text-xs rounded-sm transition-colors hover:bg-[rgba(148,163,184,0.05)]"
          style={{ color: "var(--text-primary)", opacity: testing || !server || !username ? 0.5 : 1 }}
        >
          {testing ? "测试中..." : "测试"}
        </button>
        {isConfigured && (
          <button
            onClick={handleClear}
            className="px-4 py-1.5 text-xs rounded-sm transition-colors hover:bg-[rgba(148,163,184,0.05)]"
            style={{ color: "var(--error)" }}
          >
            清除
          </button>
        )}
      </div>

      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        坚果云需在账户设置中生成应用专用密码
      </p>
    </div>
  );
}
