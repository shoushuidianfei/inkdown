import { useState, useEffect } from "react";
import { useAIStore } from "../../stores/useAIStore";
import { AIConfig, AI_PROVIDERS } from "../../services/ai";

export function AISettings() {
  const { config, loadConfig, saveConfig, clearConfig } = useAIStore();

  const [provider, setProvider] = useState("deepseek");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2000);
  const [showApiKey, setShowApiKey] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  useEffect(() => {
    if (config) {
      setProvider(config.provider);
      setApiKey(config.apiKey);
      setBaseUrl(config.baseUrl);
      setModel(config.model);
      setTemperature(config.temperature);
      setMaxTokens(config.maxTokens);
    }
  }, [config]);

  useEffect(() => {
    const providerConfig = AI_PROVIDERS.find((p) => p.id === provider);
    if (providerConfig) {
      setBaseUrl(providerConfig.baseUrl);
      if (!model || !providerConfig.models.includes(model)) setModel(providerConfig.models[0]);
    }
  }, [provider]);

  const handleSave = () => {
    const newConfig: AIConfig = { provider, apiKey, baseUrl, model, temperature, maxTokens };
    saveConfig(newConfig);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = () => {
    if (confirm("确定要清除 AI 配置吗？")) {
      clearConfig();
      setApiKey(""); setProvider("deepseek"); setModel("deepseek-chat");
      setTemperature(0.7); setMaxTokens(2000);
    }
  };

  const currentProvider = AI_PROVIDERS.find((p) => p.id === provider);

  const labelStyle: React.CSSProperties = { display: "block", fontSize: "var(--text-xs)", fontWeight: "var(--font-normal)", color: "var(--text-secondary)", marginBottom: 4 };
  const inputStyle: React.CSSProperties = {
    width: "100%", height: 32, padding: "0 8px",
    fontSize: "var(--text-sm)", fontWeight: "var(--font-normal)",
    backgroundColor: "var(--bg-hover)", color: "var(--text-primary)",
    borderRadius: "var(--radius-sm)", border: "var(--border-subtle)",
  };
  const selectStyle: React.CSSProperties = { ...inputStyle };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h2 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-medium)", color: "var(--text-primary)" }}>AI 设置</h2>

      <div>
        <label style={labelStyle}>提供商</label>
        <select value={provider} onChange={(e) => setProvider(e.target.value)} style={selectStyle}>
          {AI_PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div>
        <label style={labelStyle}>API Key</label>
        <div style={{ position: "relative" }}>
          <input type={showApiKey ? "text" : "password"} value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="输入 API Key" style={{ ...inputStyle, paddingRight: 40 }} />
          <button
            style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}
            onClick={() => setShowApiKey(!showApiKey)}
          >
            {showApiKey ? "隐藏" : "显示"}
          </button>
        </div>
      </div>

      <div>
        <label style={labelStyle}>模型</label>
        <select value={model} onChange={(e) => setModel(e.target.value)} style={selectStyle}>
          {currentProvider?.models.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div>
        <label style={labelStyle}>Base URL</label>
        <input type="text" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} style={inputStyle} />
      </div>

      <div>
        <label style={labelStyle}>温度: {temperature}</label>
        <input type="range" min="0" max="2" step="0.1" value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value))} style={{ width: "100%" }} />
      </div>

      <div>
        <label style={labelStyle}>最大 Token: {maxTokens}</label>
        <input type="range" min="100" max="8000" step="100" value={maxTokens} onChange={(e) => setMaxTokens(parseInt(e.target.value))} style={{ width: "100%" }} />
      </div>

      <div style={{ display: "flex", gap: 8, paddingTop: 8 }}>
        <button
          onClick={handleSave}
          style={{
            padding: "0 16px", height: 32, borderRadius: "var(--radius-sm)",
            fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)",
            backgroundColor: "var(--accent)", color: "var(--text-on-accent)",
            transition: "opacity var(--duration-fast) var(--ease-default)",
          }}
        >
          {saved ? "已保存" : "保存"}
        </button>
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
      </div>
    </div>
  );
}
