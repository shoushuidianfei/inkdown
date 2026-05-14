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
    <div style={{ height: "100%", overflow: "auto", backgroundColor: "var(--bg-main)" }}>
      <div
        className="reading-view"
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "48px 24px",
          color: "var(--text-primary)",
          fontFamily: 'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif',
          lineHeight: "1.8",
          fontSize: "var(--text-base)",
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
