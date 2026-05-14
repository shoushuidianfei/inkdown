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

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentResponse]);

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
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderMessage = (msg: ChatMessage) => {
    const isUser = msg.role === "user";

    return (
      <div
        key={msg.id}
        className={`flex gap-2 mb-3 ${isUser ? "flex-row-reverse" : ""}`}
      >
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: isUser ? "var(--accent)" : "var(--bg-tertiary)",
            color: isUser ? "var(--bg-primary)" : "var(--text-secondary)",
          }}
        >
          {isUser ? <User size={12} /> : <Bot size={12} />}
        </div>
        <div
          className="flex-1 px-3 py-2 rounded-md text-xs"
          style={{
            backgroundColor: isUser ? "var(--accent)" : "var(--bg-tertiary)",
            color: isUser ? "var(--bg-primary)" : "var(--text-primary)",
          }}
        >
          <div className="whitespace-pre-wrap">{msg.content}</div>
        </div>
      </div>
    );
  };

  if (!config) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-4">
        <p className="text-xs text-center mb-2" style={{ color: "var(--text-secondary)" }}>
          请先配置 AI 设置
        </p>
        <p className="text-[11px] text-center" style={{ color: "var(--text-muted)" }}>
          设置 → AI 设置
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 头部 */}
      <div className="flex items-center justify-between px-3 py-1.5">
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          AI 助手
        </span>
        <button
          className="p-0.5 rounded-sm hover:bg-[rgba(148,163,184,0.1)]"
          style={{ color: "var(--text-muted)" }}
          onClick={clearMessages}
          title="清空对话"
        >
          <Trash2 size={11} />
        </button>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto px-3 py-1">
        {messages.length === 0 && !isStreaming && (
          <div className="h-full flex flex-col items-center justify-center">
            <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
              开始与 AI 对话
            </p>
          </div>
        )}

        {messages.map(renderMessage)}

        {/* 流式响应 */}
        {isStreaming && (
          <div className="flex gap-2 mb-3">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: "var(--bg-tertiary)",
                color: "var(--text-secondary)",
              }}
            >
              <Bot size={12} />
            </div>
            <div
              className="flex-1 px-3 py-2 rounded-md text-xs"
              style={{
                backgroundColor: "var(--bg-tertiary)",
                color: "var(--text-primary)",
              }}
            >
              {currentResponse || (
                <Loader2 size={12} className="animate-spin" />
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 输入框 */}
      <div className="px-3 py-2">
        <div className="flex gap-1.5">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入问题..."
            className="flex-1 px-2.5 py-1.5 text-xs resize-none"
            style={{
              backgroundColor: "var(--bg-tertiary)",
              color: "var(--text-primary)",
              minHeight: "32px",
              maxHeight: "80px",
            }}
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="p-1.5 rounded-md transition-all"
            style={{
              backgroundColor: input.trim() && !isStreaming ? "var(--accent)" : "var(--bg-tertiary)",
              color: input.trim() && !isStreaming ? "var(--bg-primary)" : "var(--text-muted)",
            }}
          >
            {isStreaming ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Send size={12} />
            )}
          </button>
        </div>
        <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
          {config.model}
        </p>
      </div>
    </div>
  );
}
