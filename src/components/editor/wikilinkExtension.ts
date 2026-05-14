import {
  ViewPlugin,
  Decoration,
  DecorationSet,
  ViewUpdate,
  EditorView,
  hoverTooltip,
} from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { autocompletion, CompletionContext, CompletionResult } from "@codemirror/autocomplete";
import { invoke } from "@tauri-apps/api/core";

const WIKILINK_RE = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
const EMBED_RE = /!\[\[([^\]]+)\]\]/g;

const wikilinkMark = Decoration.mark({ class: "cm-wikilink" });
const embedMark = Decoration.mark({ class: "cm-embed" });

function getStore() {
  return (window as any).__inkdown_store;
}

function getFileNames(): string[] {
  try {
    const store = getStore();
    if (store) {
      return store.files
        .filter((f: any) => !f.is_dir)
        .map((f: any) => f.name.replace(/\.md$/, ""));
    }
  } catch {}
  return [];
}

function getFilePaths(): Map<string, string> {
  const map = new Map<string, string>();
  try {
    const store = getStore();
    if (store) {
      store.files
        .filter((f: any) => !f.is_dir)
        .forEach((f: any) => {
          const name = f.name.replace(/\.md$/, "");
          map.set(name, f.path);
        });
    }
  } catch {}
  return map;
}

function getFullPathMap(): Map<string, string> {
  const map = new Map<string, string>();
  try {
    const store = getStore();
    if (store) {
      store.files
        .filter((f: any) => !f.is_dir)
        .forEach((f: any) => {
          const relPath = f.path.replace(/\.md$/, "");
          map.set(relPath, f.path);
        });
    }
  } catch {}
  return map;
}

function resolveTargetPath(target: string): string | null {
  const fullPathMap = getFullPathMap();
  const filePaths = getFilePaths();
  return fullPathMap.get(target) || filePaths.get(target) || null;
}

function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const doc = view.state.doc;
  let inCodeBlock = false;

  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i);
    const text = line.text;

    if (text.trimStart().startsWith("```")) { inCodeBlock = !inCodeBlock; continue; }
    if (inCodeBlock) continue;

    for (const match of text.matchAll(EMBED_RE)) {
      const start = line.from + match.index!;
      const end = start + match[0].length;
      builder.add(start, end, embedMark);
    }

    for (const match of text.matchAll(WIKILINK_RE)) {
      const start = line.from + match.index!;
      const end = start + match[0].length;
      if (match.index! > 0 && text[match.index! - 1] === "!") continue;
      builder.add(start, end, wikilinkMark);
    }
  }

  return builder.finish();
}

const wikilinkDecorationPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) { this.decorations = buildDecorations(view); }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  { decorations: (v) => v.decorations }
);

function handleClick(event: MouseEvent, view: EditorView): boolean {
  const target = event.target as HTMLElement;
  if (!target.classList.contains("cm-wikilink") && !target.classList.contains("cm-embed")) return false;

  const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
  if (pos === null) return false;

  const line = view.state.doc.lineAt(pos);
  const lineText = line.text;
  const offset = pos - line.from;

  for (const match of lineText.matchAll(WIKILINK_RE)) {
    const matchStart = match.index!;
    const matchEnd = matchStart + match[0].length;
    if (offset >= matchStart && offset <= matchEnd) {
      const linkTarget = match[1].trim();
      const filePath = resolveTargetPath(linkTarget);
      if (filePath) {
        const store = getStore();
        if (store) store.openFile(filePath, linkTarget.split("/").pop() + ".md");
      }
      return true;
    }
  }
  return false;
}

const wikilinkHover = hoverTooltip((view, pos, _side) => {
  const line = view.state.doc.lineAt(pos);
  const lineText = line.text;
  const offset = pos - line.from;

  for (const match of lineText.matchAll(WIKILINK_RE)) {
    const matchStart = match.index!;
    const matchEnd = matchStart + match[0].length;
    if (offset >= matchStart && offset <= matchEnd) {
      const linkTarget = match[1].trim();
      const filePath = resolveTargetPath(linkTarget);
      const from = line.from + matchStart;
      const to = line.from + matchEnd;

      return {
        pos: from,
        end: to,
        create() {
          const dom = document.createElement("div");
          dom.className = "cm-wikilink-tooltip";
          dom.style.cssText = "padding: 8px 12px; max-width: 360px; max-height: 240px; overflow: auto; font-size: 13px; background: var(--bg-elevated); border-radius: 8px; color: var(--text-primary); box-shadow: 0 4px 12px rgba(0,0,0,0.15); line-height: 1.6; border: var(--border-subtle);";

          dom.textContent = "加载中...";

          if (filePath) {
            const store = getStore();
            if (store) {
              const tab = store.openTabs.find((t: any) => t.path === filePath);
              if (tab) {
                const lines = tab.content.split("\n").filter((l: string) => !l.startsWith("---"));
                const preview = lines.slice(0, 6).join("\n").trim();
                dom.textContent = preview || "(空文件)";
                return { dom };
              }
            }

            const store2 = getStore();
            if (store2?.vaultPath) {
              invoke<string>("read_file", {
                vaultPath: store2.vaultPath,
                relativePath: filePath,
              }).then((content) => {
                const lines = content.split("\n").filter((l: string) => !l.startsWith("---"));
                const preview = lines.slice(0, 6).join("\n").trim();
                dom.textContent = preview || "(空文件)";
              }).catch(() => {
                dom.textContent = `[${linkTarget}]`;
              });
            }
          } else {
            dom.textContent = `[${linkTarget}] - 文件不存在`;
            dom.style.color = "var(--text-tertiary)";
          }

          return { dom };
        },
      };
    }
  }
  return null;
}, { hoverTime: 300 });

function wikilinkAutocompletion(context: CompletionContext): CompletionResult | null {
  const match = context.matchBefore(/\[\[[^\]|]*$/);
  if (!match) return null;

  const from = match.from + 2;
  const fileNames = getFileNames();
  const fullPathMap = getFullPathMap();

  const options = [
    ...fileNames.map((name) => ({
      label: name,
      type: "text",
      detail: fullPathMap.get(name) || "",
      apply: name + "]]",
    })),
  ];

  for (const [relPath, fullPath] of fullPathMap) {
    if (!fileNames.includes(relPath) && relPath.includes("/")) {
      options.push({
        label: relPath,
        type: "text",
        detail: fullPath,
        apply: relPath + "]]",
      });
    }
  }

  return { from, options, filter: true };
}

export function wikilinkExtension() {
  return [
    wikilinkDecorationPlugin,
    EditorView.domEventHandlers({ click: handleClick }),
    wikilinkHover,
    autocompletion({
      override: [wikilinkAutocompletion],
      activateOnTyping: true,
    }),
    // Wikilink 样式 — 使用新 accent 色 #4f8eff
    EditorView.baseTheme({
      ".cm-wikilink": {
        color: "var(--accent)",
        textDecoration: "underline",
        cursor: "pointer",
        textUnderlineOffset: "2px",
      },
      ".cm-embed": {
        color: "var(--success)",
        fontStyle: "italic",
        cursor: "pointer",
      },
      ".cm-wikilink-tooltip": {
        fontFamily: 'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif',
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      },
    }),
  ];
}
