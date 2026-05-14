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

  useEffect(() => {
    (window as any).__inkdown_store = useAppStore.getState();
    return () => { delete (window as any).__inkdown_store; };
  }, []);

  const [showAIToolbar, setShowAIToolbar] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });
  const [selectionRange, setSelectionRange] = useState<{ from: number; to: number } | null>(null);

  const debouncedSave = useCallback(
    (() => {
      let timeout: ReturnType<typeof setTimeout>;
      return (tabId: string) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => saveFile(tabId), 1000);
      };
    })(),
    [saveFile]
  );

  useEffect(() => {
    if (!editorRef.current) return;

    const state = EditorState.create({
      doc: tab.content,
      extensions: [
        lineNumbers(),
        history(),
        highlightActiveLine(),
        placeholder("开始写作..."),
        markdown({ base: markdownLanguage }),
        syntaxHighlighting(defaultHighlightStyle),
        theme === "dark" ? oneDark : [],
        wikilinkExtension(),

        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          { key: "Ctrl-s", run: () => { saveFile(tab.id); return true; } },
        ]),

        CMEditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const content = update.state.doc.toString();
            updateTabContent(tab.id, content);
            debouncedSave(tab.id);
          }

          if (update.selectionSet) {
            const { from, to } = update.state.selection.main;
            if (from !== to) {
              const text = update.state.doc.sliceString(from, to);
              if (text.trim().length > 0 && config) {
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

        // 编辑器样式 — 使用新 Design Token
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
            padding: "0",
          },
          ".cm-gutters": {
            backgroundColor: "var(--bg-sidebar)",
            border: "none",
            color: "var(--text-tertiary)",
          },
          ".cm-activeLineGutter": {
            backgroundColor: "var(--bg-hover)",
          },
          ".cm-activeLine": {
            backgroundColor: "var(--accent-subtle)",
          },
          ".cm-selectionBackground": {
            backgroundColor: "var(--accent-muted) !important",
          },
          "&.cm-focused .cm-selectionBackground": {
            backgroundColor: "var(--accent-muted) !important",
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

    const view = new CMEditorView({ state, parent: editorRef.current });
    viewRef.current = view;

    setScrollToLine((line: number) => {
      const v = viewRef.current;
      if (!v) return;
      const lineNum = Math.min(line + 1, v.state.doc.lines);
      const pos = v.state.doc.line(lineNum).from;
      v.dispatch({ selection: { anchor: pos }, scrollIntoView: true });
    });

    return () => { view.destroy(); setScrollToLine(null); };
  }, [tab.id, theme]);

  const handleAcceptAI = (newText: string) => {
    if (viewRef.current && selectionRange) {
      viewRef.current.dispatch({
        changes: { from: selectionRange.from, to: selectionRange.to, insert: newText },
      });
    }
    setShowAIToolbar(false);
    setSelectionRange(null);
  };

  const handleRejectAI = () => {
    setShowAIToolbar(false);
    setSelectionRange(null);
  };

  return (
    <div style={{ position: "relative", height: "100%", width: "100%", backgroundColor: "var(--bg-main)" }}>
      <div ref={editorRef} style={{ height: "100%", width: "100%" }} />
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
