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

  const handleAccept = () => {
    if (result) {
      onAccept(result);
    }
  };

  const handleRegenerate = () => {
    if (currentAction) {
      handleAction(currentAction);
    }
  };

  // 如果有结果显示，显示预览
  if (result) {
    return (
      <div
        className="fixed z-50 w-80 rounded-md"
        style={{
          left: position.x,
          top: position.y,
          backgroundColor: "var(--bg-primary)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
        }}
      >
        {/* 原文 */}
        <div className="px-3 py-2" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="text-[11px] mb-1" style={{ color: "var(--text-muted)" }}>
            原文
          </div>
          <div
            className="text-xs px-2 py-1.5 rounded-sm"
            style={{
              backgroundColor: "var(--bg-tertiary)",
              color: "var(--text-secondary)",
            }}
          >
            {selectedText.length > 150 ? selectedText.substring(0, 150) + "..." : selectedText}
          </div>
        </div>

        {/* AI 建议 */}
        <div className="px-3 py-2" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="text-[11px] mb-1" style={{ color: "var(--text-muted)" }}>
            AI 建议
          </div>
          <div
            className="text-xs px-2 py-1.5 rounded-sm"
            style={{
              backgroundColor: "var(--bg-tertiary)",
              color: "var(--text-primary)",
            }}
          >
            {result}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="px-3 py-2 flex items-center gap-2">
          <button
            onClick={handleAccept}
            className="flex items-center gap-1 px-2.5 py-1 rounded-sm text-xs font-medium"
            style={{
              backgroundColor: "var(--accent)",
              color: "var(--bg-primary)",
            }}
          >
            <Check size={12} />
            接受
          </button>
          <button
            onClick={onReject}
            className="flex items-center gap-1 px-2.5 py-1 rounded-sm text-xs"
            style={{
              color: "var(--text-secondary)",
            }}
          >
            <X size={12} />
            拒绝
          </button>
          <button
            onClick={handleRegenerate}
            className="flex items-center gap-1 px-2.5 py-1 rounded-sm text-xs"
            style={{
              color: "var(--text-secondary)",
            }}
          >
            <RefreshCw size={12} />
            重试
          </button>
        </div>
      </div>
    );
  }

  // 显示操作菜单
  return (
    <div
      className="fixed z-50 rounded-md py-0.5"
      style={{
        left: position.x,
        top: position.y,
        backgroundColor: "var(--bg-primary)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      }}
    >
      {isProcessing ? (
        <div className="px-4 py-2 flex items-center gap-2">
          <Loader2 size={13} className="animate-spin" style={{ color: "var(--accent)" }} />
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
            AI 处理中...
          </span>
        </div>
      ) : (
        <div>
          {AI_ACTIONS.map((action) => (
            <button
              key={action.id}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-[rgba(148,163,184,0.05)]"
              style={{ color: "var(--text-primary)" }}
              onClick={() => handleAction(action.id)}
            >
              <action.icon size={12} style={{ color: "var(--accent)" }} />
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
