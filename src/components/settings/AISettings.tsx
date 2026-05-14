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

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

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
      if (!model || !providerConfig.models.includes(model)) {
        setModel(providerConfig.models[0]);
      }
    }
  }, [provider]);

  const handleSave = () => {
    const newConfig: AIConfig = {
      provider,
      apiKey,
      baseUrl,
      model,
      temperature,
      maxTokens,
    };
    saveConfig(newConfig);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = () => {
    if (confirm("确定要清除 AI 配置吗？")) {
      clearConfig();
      setApiKey("");
      setProvider("deepseek");
      setModel("deepseek-chat");
      setTemperature(0.7);
      setMaxTokens(2000);
    }
  };

  const currentProvider = AI_PROVIDERS.find((p) => p.id === provider);

  return (
    <div className="space-y-4">
      <h2 className="text-base font-medium" style={{ color: "var(--text-primary)" }}>
        AI 设置
      </h2>

      {/* 提供商：下拉选择 */}
      <div>
        <label className="block text-xs mb-1" style={{ color: "var(--text-secondary)" }}>
          提供商
        </label>
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className="w-full text-sm"
        >
          {AI_PROVIDERS.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* API Key */}
      <div>
        <label className="block text-xs mb-1" style={{ color: "var(--text-secondary)" }}>
          API Key
        </label>
        <div className="relative">
          <input
            type={showApiKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="输入 API Key"
            className="w-full text-sm pr-8"
          />
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs"
            style={{ color: "var(--text-muted)" }}
            onClick={() => setShowApiKey(!showApiKey)}
          >
            {showApiKey ? "隐藏" : "显示"}
          </button>
        </div>
      </div>

      {/* 模型 */}
      <div>
        <label className="block text-xs mb-1" style={{ color: "var(--text-secondary)" }}>
          模型
        </label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="w-full text-sm"
        >
          {currentProvider?.models.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {/* Base URL */}
      <div>
        <label className="block text-xs mb-1" style={{ color: "var(--text-secondary)" }}>
          Base URL
        </label>
        <input
          type="text"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          className="w-full text-sm"
        />
      </div>

      {/* 温度 */}
      <div>
        <label className="block text-xs mb-1" style={{ color: "var(--text-secondary)" }}>
          温度: {temperature}
        </label>
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={temperature}
          onChange={(e) => setTemperature(parseFloat(e.target.value))}
          className="w-full"
        />
      </div>

      {/* Max Tokens */}
      <div>
        <label className="block text-xs mb-1" style={{ color: "var(--text-secondary)" }}>
          最大 Token: {maxTokens}
        </label>
        <input
          type="range"
          min="100"
          max="8000"
          step="100"
          value={maxTokens}
          onChange={(e) => setMaxTokens(parseInt(e.target.value))}
          className="w-full"
        />
      </div>

      {/* 按钮 */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleSave}
          className="px-4 py-1.5 text-xs font-medium rounded-sm transition-opacity hover:opacity-90"
          style={{
            backgroundColor: "var(--accent)",
            color: "var(--bg-primary)",
          }}
        >
          {saved ? "已保存" : "保存"}
        </button>
        <button
          onClick={handleClear}
          className="px-4 py-1.5 text-xs rounded-sm transition-colors hover:bg-[rgba(148,163,184,0.05)]"
          style={{ color: "var(--error)" }}
        >
          清除
        </button>
      </div>
    </div>
  );
}
