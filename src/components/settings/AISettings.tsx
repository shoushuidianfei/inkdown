import { useState, useEffect, useRef } from "react";
import { useAIStore } from "../../stores/useAIStore";
import { AIConfig, AI_PROVIDERS } from "../../services/ai";

export function AISettings() {
  const { config, loadConfig, saveConfig, clearConfig } = useAIStore();

  const [provider, setProvider] = useState("deepseek");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(4096);
  const [showApiKey, setShowApiKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const configLoadedRef = useRef(false);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  useEffect(() => {
    if (config) {
      configLoadedRef.current = true;
      setProvider(config.provider);
      setApiKey(config.apiKey);
      setBaseUrl(config.baseUrl);
      setModel(config.model);
      setTemperature(config.temperature);
      setMaxTokens(config.maxTokens);
    }
  }, [config]);

  // 仅在用户手动切换提供商时填充默认值，不覆盖已加载的配置
  const handleProviderChange = (newProvider: string) => {
    setProvider(newProvider);
    const providerConfig = AI_PROVIDERS.find((p) => p.id === newProvider);
    if (providerConfig) {
      setBaseUrl(providerConfig.baseUrl);
      setModel(providerConfig.models[0]);
    }
  };

  const handleSave = () => {
    const newConfig: AIConfig = { provider, apiKey, baseUrl, model, temperature, maxTokens };
    saveConfig(newConfig);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = () => {
    if (confirm("确定要清除 AI 配置吗？")) {
      clearConfig();
      setApiKey("");
      handleProviderChange("deepseek");
      setTemperature(0.7);
      setMaxTokens(4096);
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
        <select value={provider} onChange={(e) => handleProviderChange(e.target.value)} style={selectStyle}>
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
        <input
          type="text"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="输入模型名称"
          list="model-suggestions"
          style={inputStyle}
        />
        <datalist id="model-suggestions">
          {currentProvider?.models.map((m) => <option key={m} value={m} />)}
        </datalist>
      </div>

      <div>
        <label style={labelStyle}>Base URL</label>
        <input type="text" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} style={inputStyle} />
        <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: "var(--space-1)" }}>
          API 接口地址，切换提供商自动填充，可自行修改
        </p>
      </div>

      <div>
        <label style={labelStyle}>温度: {temperature}</label>
        <input type="range" min="0" max="2" step="0.1" value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value))} style={{ width: "100%" }} />
        <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: "var(--space-1)" }}>
          控制输出的随机性。0 = 最确定、最严谨；1 = 平衡；2 = 最随机、最有创意。写作推荐 0.7，代码推荐 0.3
        </p>
      </div>

      <div>
        <label style={labelStyle}>最大输出长度: {maxTokens >= 1024 ? `${(maxTokens / 1024).toFixed(0)}K` : maxTokens}</label>
        <input type="range" min="256" max="65536" step="256" value={maxTokens} onChange={(e) => setMaxTokens(parseInt(e.target.value))} style={{ width: "100%" }} />
        <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: "var(--space-1)" }}>
          单次回复的最大长度，不是上下文窗口。上下文大小由模型决定（如 128K、1M），无需在此设置
        </p>
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
