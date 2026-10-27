import type { ReactNode } from "react";
import {
  parseAnnouncementMessage,
  type AnnouncementInlineNode,
} from "@/lib/announcement-format";
import styles from "./AnnouncementContent.module.css";

function renderInline(nodes: AnnouncementInlineNode[], keyPrefix: string): ReactNode[] {
  return nodes.map((node, index) => {
    const key = `${keyPrefix}-${index}`;

    switch (node.type) {
      case "text":
        return node.value;
      case "bold":
        return <strong key={key}>{renderInline(node.children, key)}</strong>;
      case "italic":
        return <em key={key}>{renderInline(node.children, key)}</em>;
      case "underline":
        return <u key={key}>{renderInline(node.children, key)}</u>;
      case "link":
        return (
          <a
            key={key}
            href={node.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            {renderInline(node.children, key)}
          </a>
        );
    }
  });
}

export default function AnnouncementContent({
  message,
  className,
  compact = false,
}: {
  message: string;
  className?: string;
  compact?: boolean;
}) {
  const blocks = parseAnnouncementMessage(message);
  const rootClassName = [styles.content, compact && styles.compact, className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClassName}>
      {blocks.map((block, blockIndex) => {
        if (block.type === "paragraph") {
          return (
            <p key={`paragraph-${blockIndex}`}>
              {block.lines.map((line, lineIndex) => (
                <span key={`line-${lineIndex}`}>
                  {lineIndex > 0 && <br />}
                  {renderInline(line, `paragraph-${blockIndex}-line-${lineIndex}`)}
                </span>
              ))}
            </p>
          );
        }

        const List = block.type === "ordered-list" ? "ol" : "ul";
        return (
          <List key={`list-${blockIndex}`}>
            {block.items.map((item, itemIndex) => (
              <li key={`item-${itemIndex}`}>
                {renderInline(item, `list-${blockIndex}-item-${itemIndex}`)}
              </li>
            ))}
          </List>
        );
      })}
    </div>
  );
}
