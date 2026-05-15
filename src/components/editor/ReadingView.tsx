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
        style={{ color: "var(--text-primary)" }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
