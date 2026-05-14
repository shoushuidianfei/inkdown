import { useState, useRef, useEffect } from "react";
import { useAIStore, ChatMessage } from "../../stores/useAIStore";
import { useAppStore } from "../../stores/useAppStore";
import { Send, Trash2, Loader2, Bot, User } from "lucide-react";

export function AIPanel() {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const {
    config,
    messages,
    isStreaming,
    currentResponse,
    sendMessage,
    clearMessages,
    loadConfig,
  } = useAIStore();

  const { activeTabId, openTabs } = useAppStore();
  const activeTab = openTabs.find((tab) => tab.id === activeTabId);

  useEffect(() => { loadConfig(); }, [loadConfig]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, currentResponse]);

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;
    const message = input.trim();
    setInput("");
    try {
      await sendMessage(message, activeTab?.content);
    } catch (error) {
      console.error("发送消息失败:", error);
      alert(error instanceof Error ? error.message : "发送失败");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const renderMessage = (msg: ChatMessage) => {
    const isUser = msg.role === "user";
    return (
      <div key={msg.id} style={{ display: "flex", gap: 8, marginBottom: 12, flexDirection: isUser ? "row-reverse" : "row" }}>
        {/* 头像: 20px */}
        <div
          style={{
            width: 20, height: 20, borderRadius: "var(--radius-full)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            backgroundColor: isUser ? "var(--accent)" : "var(--bg-hover)",
            color: isUser ? "#ffffff" : "var(--text-secondary)",
          }}
        >
          {isUser ? <User size={10} /> : <Bot size={10} />}
        </div>
        {/* 消息气泡: 13px/400 */}
        <div
          style={{
            flex: 1, padding: "8px 12px", borderRadius: "var(--radius-md)",
            fontSize: "var(--text-sm)", fontWeight: "var(--font-normal)",
            backgroundColor: isUser ? "var(--accent-muted)" : "transparent",
            color: "var(--text-primary)",
            whiteSpace: "pre-wrap",
          }}
        >
          {msg.content}
        </div>
      </div>
    );
  };

  if (!config) {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <p style={{ fontSize: "var(--text-xs)", textAlign: "center", color: "var(--text-secondary)", marginBottom: 8 }}>请先配置 AI 设置</p>
        <p style={{ fontSize: 11, textAlign: "center", color: "var(--text-tertiary)" }}>设置 → AI 设置</p>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* 头部 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 12px" }}>
        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>AI 助手</span>
        <button
          style={{
            width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: "var(--radius-sm)", color: "var(--text-tertiary)",
            transition: "background-color var(--duration-fast) var(--ease-default)",
          }}
          onClick={clearMessages}
          title="清空对话"
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--bg-hover)"}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
        >
          <Trash2 size={11} />
        </button>
      </div>

      {/* 消息列表 */}
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 12px" }}>
        {messages.length === 0 && !isStreaming && (
          <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <p style={{ fontSize: "var(--text-xs)", textAlign: "center", color: "var(--text-tertiary)" }}>开始与 AI 对话</p>
          </div>
        )}

        {messages.map(renderMessage)}

        {/* 流式响应 */}
        {isStreaming && (
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <div
              style={{
                width: 20, height: 20, borderRadius: "var(--radius-full)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                backgroundColor: "var(--bg-hover)", color: "var(--text-secondary)",
              }}
            >
              <Bot size={10} />
            </div>
            <div
              style={{
                flex: 1, padding: "8px 12px", borderRadius: "var(--radius-md)",
                fontSize: "var(--text-sm)", fontWeight: "var(--font-normal)",
                backgroundColor: "transparent", color: "var(--text-primary)",
              }}
            >
              {currentResponse || <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 输入框: bg --gray-800, --border-subtle, --radius-lg, 40px min-height */}
      <div style={{ padding: 8 }}>
        <div style={{ display: "flex", gap: 6 }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入问题..."
            style={{
              flex: 1, padding: "8px 10px", fontSize: "var(--text-xs)", fontWeight: "var(--font-normal)",
              resize: "none", minHeight: 40, maxHeight: 80,
              backgroundColor: "var(--gray-800)", color: "var(--text-primary)",
              border: "var(--border-subtle)", borderRadius: "var(--radius-lg)",
            }}
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            style={{
              width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
              borderRadius: "var(--radius-md)", flexShrink: 0, alignSelf: "flex-end",
              backgroundColor: input.trim() && !isStreaming ? "var(--accent)" : "var(--bg-hover)",
              color: input.trim() && !isStreaming ? "#ffffff" : "var(--text-tertiary)",
              transition: "all var(--duration-fast) var(--ease-default)",
            }}
          >
            {isStreaming ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={12} />}
          </button>
        </div>
        <p style={{ fontSize: 10, marginTop: 4, color: "var(--text-tertiary)" }}>{config.model}</p>
      </div>
    </div>
  );
}
