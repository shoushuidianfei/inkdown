import { useState } from "react";
import { useAIStore } from "../../stores/useAIStore";
import {
  Wand2,
  Languages,
  PenTool,
  BookOpen,
  Key,
  Loader2,
  Check,
  X,
  RefreshCw,
} from "lucide-react";

interface AIToolbarProps {
  selectedText: string;
  onAccept: (newText: string) => void;
  onReject: () => void;
  position: { x: number; y: number };
}

type AIAction = "summarize" | "expand" | "translate_en" | "translate_zh" | "rewrite" | "explain" | "keywords";

const AI_ACTIONS: { id: AIAction; label: string; icon: any }[] = [
  { id: "summarize", label: "总结", icon: Wand2 },
  { id: "expand", label: "扩写", icon: PenTool },
  { id: "translate_en", label: "翻译→英", icon: Languages },
  { id: "translate_zh", label: "翻译→中", icon: Languages },
  { id: "rewrite", label: "改写", icon: RefreshCw },
  { id: "explain", label: "解释", icon: BookOpen },
  { id: "keywords", label: "关键词", icon: Key },
];

export function AIToolbar({ selectedText, onAccept, onReject, position }: AIToolbarProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [currentAction, setCurrentAction] = useState<AIAction | null>(null);
  const { processText } = useAIStore();

  const handleAction = async (action: AIAction) => {
    setIsProcessing(true);
    setCurrentAction(action);
    setResult(null);
    try {
      const response = await processText(selectedText, action);
      setResult(response);
    } catch (error) {
      console.error("AI 处理失败:", error);
      alert(error instanceof Error ? error.message : "AI 处理失败");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAccept = () => { if (result) onAccept(result); };
  const handleRegenerate = () => { if (currentAction) handleAction(currentAction); };

  // 预览结果
  if (result) {
    return (
      <div
        style={{
          position: "fixed", zIndex: 50, width: 320,
          left: position.x, top: position.y,
          borderRadius: "var(--radius-md)",
          backgroundColor: "var(--bg-elevated)",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          border: "var(--border-subtle)",
        }}
      >
        {/* 原文 */}
        <div style={{ padding: "8px 12px", borderBottom: "var(--border-subtle)" }}>
          <div style={{ fontSize: 11, marginBottom: 4, color: "var(--text-tertiary)" }}>原文</div>
          <div style={{ fontSize: "var(--text-xs)", padding: "4px 8px", borderRadius: "var(--radius-sm)", backgroundColor: "var(--bg-hover)", color: "var(--text-secondary)" }}>
            {selectedText.length > 150 ? selectedText.substring(0, 150) + "..." : selectedText}
          </div>
        </div>

        {/* AI 建议 */}
        <div style={{ padding: "8px 12px", borderBottom: "var(--border-subtle)" }}>
          <div style={{ fontSize: 11, marginBottom: 4, color: "var(--text-tertiary)" }}>AI 建议</div>
          <div style={{ fontSize: "var(--text-xs)", padding: "4px 8px", borderRadius: "var(--radius-sm)", backgroundColor: "var(--bg-hover)", color: "var(--text-primary)" }}>
            {result}
          </div>
        </div>

        {/* 操作按钮: 12px/400 */}
        <div style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={handleAccept}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "0 10px", height: 28, borderRadius: "var(--radius-sm)",
              fontSize: "var(--text-xs)", fontWeight: "var(--font-medium)",
              backgroundColor: "var(--accent)", color: "#ffffff",
            }}
          >
            <Check size={12} /> 接受
          </button>
          <button
            onClick={onReject}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "0 10px", height: 28, borderRadius: "var(--radius-sm)",
              fontSize: "var(--text-xs)", fontWeight: "var(--font-normal)",
              color: "var(--text-secondary)",
            }}
          >
            <X size={12} /> 拒绝
          </button>
          <button
            onClick={handleRegenerate}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "0 10px", height: 28, borderRadius: "var(--radius-sm)",
              fontSize: "var(--text-xs)", fontWeight: "var(--font-normal)",
              color: "var(--text-secondary)",
            }}
          >
            <RefreshCw size={12} /> 重试
          </button>
        </div>
      </div>
    );
  }

  // 操作菜单: bg --gray-700, --radius-md, shadow
  return (
    <div
      style={{
        position: "fixed", zIndex: 50,
        left: position.x, top: position.y,
        borderRadius: "var(--radius-md)", padding: "4px 0",
        backgroundColor: "var(--bg-elevated)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        border: "var(--border-subtle)",
      }}
    >
      {isProcessing ? (
        <div style={{ padding: "8px 16px", display: "flex", alignItems: "center", gap: 8 }}>
          <Loader2 size={13} style={{ color: "var(--accent)", animation: "spin 1s linear infinite" }} />
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>AI 处理中...</span>
        </div>
      ) : (
        AI_ACTIONS.map((action) => (
          <button
            key={action.id}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 8,
              padding: "0 12px", height: 32,
              fontSize: "var(--text-xs)", fontWeight: "var(--font-normal)",
              color: "var(--text-primary)",
              transition: "background-color var(--duration-fast) var(--ease-default)",
            }}
            onClick={() => handleAction(action.id)}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--bg-hover)"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
          >
            <action.icon size={12} style={{ color: "var(--accent)" }} />
            {action.label}
          </button>
        ))
      )}
    </div>
  );
}
