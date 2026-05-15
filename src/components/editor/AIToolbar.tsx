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

  if (result) {
    return (
      <div className="popup-card" style={{ position: "fixed", zIndex: 50, width: 320, left: position.x, top: position.y }}>
        <div style={{ padding: "var(--space-2) var(--space-3)", borderBottom: "var(--border-subtle)" }}>
          <div style={{ fontSize: 11, marginBottom: "var(--space-1)", color: "var(--text-tertiary)" }}>原文</div>
          <div style={{ fontSize: "var(--text-xs)", padding: "var(--space-1) var(--space-2)", borderRadius: "var(--radius-sm)", backgroundColor: "var(--bg-hover)", color: "var(--text-secondary)" }}>
            {selectedText.length > 150 ? selectedText.substring(0, 150) + "..." : selectedText}
          </div>
        </div>

        <div style={{ padding: "var(--space-2) var(--space-3)", borderBottom: "var(--border-subtle)" }}>
          <div style={{ fontSize: 11, marginBottom: "var(--space-1)", color: "var(--text-tertiary)" }}>AI 建议</div>
          <div style={{ fontSize: "var(--text-xs)", padding: "var(--space-1) var(--space-2)", borderRadius: "var(--radius-sm)", backgroundColor: "var(--bg-hover)", color: "var(--text-primary)" }}>
            {result}
          </div>
        </div>

        <div style={{ padding: "var(--space-2) var(--space-3)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <button className="btn-primary" style={{ height: 28, fontSize: "var(--text-xs)" }} onClick={handleAccept}>
            <Check size={12} /> 接受
          </button>
          <button className="hover-bg" style={{ display: "flex", alignItems: "center", gap: "var(--space-1)", padding: "0 var(--space-3)", height: 28, borderRadius: "var(--radius-sm)", fontSize: "var(--text-xs)", color: "var(--text-secondary)" }} onClick={onReject}>
            <X size={12} /> 拒绝
          </button>
          <button className="hover-bg" style={{ display: "flex", alignItems: "center", gap: "var(--space-1)", padding: "0 var(--space-3)", height: 28, borderRadius: "var(--radius-sm)", fontSize: "var(--text-xs)", color: "var(--text-secondary)" }} onClick={handleRegenerate}>
            <RefreshCw size={12} /> 重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="popup-card" style={{ position: "fixed", zIndex: 50, left: position.x, top: position.y, padding: "var(--space-1) 0" }}>
      {isProcessing ? (
        <div style={{ padding: "var(--space-2) var(--space-4)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <Loader2 size={13} style={{ color: "var(--accent)", animation: "spin 1s linear infinite" }} />
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>AI 处理中...</span>
        </div>
      ) : (
        AI_ACTIONS.map((action) => (
          <button
            key={action.id}
            className="menu-item"
            style={{ height: 32, fontSize: "var(--text-xs)" }}
            onClick={() => handleAction(action.id)}
          >
            <action.icon size={12} style={{ color: "var(--accent)" }} />
            {action.label}
          </button>
        ))
      )}
    </div>
  );
}
