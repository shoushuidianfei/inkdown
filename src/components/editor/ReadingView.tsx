import { useMemo } from "react";
import MarkdownIt from "markdown-it";
import DOMPurify from "dompurify";

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
});

interface ReadingViewProps {
  content: string;
}

export function ReadingView({ content }: ReadingViewProps) {
  const html = useMemo(() => {
    const raw = md.render(content);
    return DOMPurify.sanitize(raw, {
      ADD_TAGS: ["mark"],
      ADD_ATTR: ["target"],
    });
  }, [content]);

  return (
    <div
      className="h-full overflow-auto"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      <div
        className="reading-view"
        style={{
          maxWidth: "720px",
          margin: "0 auto",
          padding: "48px 24px",
          color: "var(--text-primary)",
          fontFamily: 'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif',
          lineHeight: "1.8",
          fontSize: "15px",
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <style>{`
        .reading-view h1 {
          font-size: 1.8em;
          font-weight: 600;
          margin: 1.2em 0 0.6em;
          padding-bottom: 0.3em;
          color: var(--text-primary);
        }
        .reading-view h2 {
          font-size: 1.4em;
          font-weight: 500;
          margin: 1em 0 0.5em;
          color: var(--text-primary);
        }
        .reading-view h3 {
          font-size: 1.15em;
          font-weight: 500;
          margin: 0.8em 0 0.4em;
          color: var(--text-primary);
        }
        .reading-view h4, .reading-view h5, .reading-view h6 {
          font-size: 1em;
          font-weight: 500;
          margin: 0.6em 0 0.3em;
          color: var(--text-primary);
        }
        .reading-view p {
          margin: 0.6em 0;
        }
        .reading-view a {
          color: var(--accent);
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .reading-view a:hover {
          opacity: 0.8;
        }
        .reading-view code {
          background: var(--bg-tertiary);
          padding: 0.15em 0.4em;
          border-radius: var(--radius-sm);
          font-size: 0.9em;
          font-family: "JetBrains Mono", "Fira Code", Consolas, monospace;
          color: var(--text-primary);
        }
        .reading-view pre {
          background: var(--bg-secondary);
          border-radius: var(--radius-md);
          padding: 1em;
          overflow-x: auto;
          margin: 0.8em 0;
        }
        .reading-view pre code {
          background: transparent;
          padding: 0;
          font-size: 0.85em;
        }
        .reading-view blockquote {
          border-left: 3px solid var(--accent);
          margin: 0.8em 0;
          padding: 0.4em 1em;
          color: var(--text-secondary);
          border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
        }
        .reading-view ul, .reading-view ol {
          margin: 0.6em 0;
          padding-left: 1.5em;
        }
        .reading-view li {
          margin: 0.2em 0;
        }
        .reading-view img {
          max-width: 100%;
          border-radius: var(--radius-md);
          margin: 0.8em 0;
        }
        .reading-view table {
          width: 100%;
          border-collapse: collapse;
          margin: 0.8em 0;
        }
        .reading-view th, .reading-view td {
          border: 1px solid var(--border);
          padding: 0.5em 0.8em;
          text-align: left;
        }
        .reading-view th {
          background: var(--bg-secondary);
          font-weight: 500;
        }
        .reading-view hr {
          border: none;
          border-top: 1px solid var(--border);
          margin: 1.5em 0;
        }
        .reading-view mark {
          background: var(--accent-dim);
          padding: 0.1em 0.2em;
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}
