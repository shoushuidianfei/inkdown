import { useEffect, useRef, useCallback, useState } from "react";
import { EditorView as CMEditorView, keymap, placeholder, highlightActiveLine, lineNumbers } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language";
import { useAppStore, Tab } from "../../stores/useAppStore";
import { useAIStore } from "../../stores/useAIStore";
import { useTheme } from "../../hooks/useTheme";
import { AIToolbar } from "./AIToolbar";
import { wikilinkExtension } from "./wikilinkExtension";

interface MarkdownEditorProps {
  tab: Tab;
}

export function MarkdownEditor({ tab }: MarkdownEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<CMEditorView | null>(null);
  const { updateTabContent, saveFile, setScrollToLine } = useAppStore();
  const { config } = useAIStore();
  const { theme } = useTheme();

  // 暴露 store 给 wikilink 扩展使用
  useEffect(() => {
    (window as any).__inkdown_store = useAppStore.getState();
    return () => {
      delete (window as any).__inkdown_store;
    };
  }, []);

  // AI 工具栏状态
  const [showAIToolbar, setShowAIToolbar] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });
  const [selectionRange, setSelectionRange] = useState<{ from: number; to: number } | null>(null);

  // 保存文件的防抖函数
  const debouncedSave = useCallback(
    (() => {
      let timeout: ReturnType<typeof setTimeout>;
      return (tabId: string) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          saveFile(tabId);
        }, 1000);
      };
    })(),
    [saveFile]
  );

  useEffect(() => {
    if (!editorRef.current) return;

    // 创建编辑器状态
    const state = EditorState.create({
      doc: tab.content,
      extensions: [
        // 基础功能
        lineNumbers(),
        history(),
        highlightActiveLine(),
        placeholder("开始写作..."),

        // Markdown 语言支持
        markdown({ base: markdownLanguage }),

        // 语法高亮
        syntaxHighlighting(defaultHighlightStyle),

        // 主题跟随切换
        theme === "dark" ? oneDark : [],

        // Wikilink 装饰 + 自动补全 + 点击跳转
        wikilinkExtension(),

        // 快捷键
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          {
            key: "Ctrl-s",
            run: () => {
              saveFile(tab.id);
              return true;
            },
          },
        ]),

        // 内容变化监听
        CMEditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const content = update.state.doc.toString();
            updateTabContent(tab.id, content);
            debouncedSave(tab.id);
          }

          // 检测选区变化
          if (update.selectionSet) {
            const { from, to } = update.state.selection.main;
            if (from !== to) {
              const text = update.state.doc.sliceString(from, to);
              if (text.trim().length > 0 && config) {
                // 获取选区位置
                const coords = view.coordsAtPos(to);
                if (coords) {
                  setSelectedText(text);
                  setSelectionRange({ from, to });
                  setToolbarPosition({
                    x: Math.min(coords.left, window.innerWidth - 400),
                    y: coords.bottom + 10,
                  });
                  setShowAIToolbar(true);
                }
              }
            } else {
              setShowAIToolbar(false);
            }
          }
        }),

        // 编辑器样式
        CMEditorView.theme({
          "&": {
            height: "100%",
            fontSize: "14px",
          },
          ".cm-content": {
            fontFamily: 'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif',
            padding: "16px",
            lineHeight: "1.8",
          },
          ".cm-line": {
            padding: "0 0 0 0",
          },
          ".cm-gutters": {
            backgroundColor: "var(--bg-secondary)",
            border: "none",
            color: "var(--text-muted)",
          },
          ".cm-activeLineGutter": {
            backgroundColor: "var(--bg-tertiary)",
          },
          ".cm-activeLine": {
            backgroundColor: "var(--accent-dim)",
          },
          ".cm-selectionBackground": {
            backgroundColor: "rgba(245, 166, 35, 0.2) !important",
          },
          "&.cm-focused .cm-selectionBackground": {
            backgroundColor: "rgba(245, 166, 35, 0.2) !important",
          },
          ".cm-cursor": {
            borderLeftColor: "var(--accent)",
          },
          ".cm-scroller": {
            overflow: "auto",
          },
        }),
      ],
    });

    // 创建编辑器视图
    const view = new CMEditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    // 暴露 scrollToLine 给 store
    setScrollToLine((line: number) => {
      const v = viewRef.current;
      if (!v) return;
      const lineNum = Math.min(line + 1, v.state.doc.lines);
      const pos = v.state.doc.line(lineNum).from;
      v.dispatch({
        selection: { anchor: pos },
        scrollIntoView: true,
      });
    });

    return () => {
      view.destroy();
      setScrollToLine(null);
    };
  }, [tab.id, theme]); // tab.id 或主题变化时重建编辑器

  // 接受 AI 建议
  const handleAcceptAI = (newText: string) => {
    if (viewRef.current && selectionRange) {
      viewRef.current.dispatch({
        changes: { from: selectionRange.from, to: selectionRange.to, insert: newText },
      });
    }
    setShowAIToolbar(false);
    setSelectionRange(null);
  };

  // 拒绝 AI 建议
  const handleRejectAI = () => {
    setShowAIToolbar(false);
    setSelectionRange(null);
  };

  return (
    <div className="relative h-full w-full" style={{ backgroundColor: "var(--bg-primary)" }}>
      <div ref={editorRef} className="h-full w-full" />

      {/* AI 工具栏 */}
      {showAIToolbar && selectedText && (
        <AIToolbar
          selectedText={selectedText}
          onAccept={handleAcceptAI}
          onReject={handleRejectAI}
          position={toolbarPosition}
        />
      )}
    </div>
  );
}
