export type AnnouncementInlineNode =
  | { type: "text"; value: string }
  | { type: "bold" | "italic" | "underline"; children: AnnouncementInlineNode[] }
  | { type: "link"; href: string; children: AnnouncementInlineNode[] };

export type AnnouncementBlockNode =
  | { type: "paragraph"; lines: AnnouncementInlineNode[][] }
  | {
      type: "unordered-list" | "ordered-list";
      items: AnnouncementInlineNode[][];
    };

type InlineParseResult = {
  nodes: AnnouncementInlineNode[];
  index: number;
  closed: boolean;
};

const MAX_INLINE_NESTING = 16;

function isSafeHttpUrl(value: string): boolean {
  if (!/^https?:\/\//i.test(value) || /\s/.test(value)) return false;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function appendText(
  nodes: AnnouncementInlineNode[],
  value: string,
): void {
  if (!value) return;

  const lastNode = nodes[nodes.length - 1];
  if (lastNode?.type === "text") {
    lastNode.value += value;
  } else {
    nodes.push({ type: "text", value });
  }
}

function parseInlineRange(
  source: string,
  start: number,
  closingToken: string | null,
  depth: number,
): InlineParseResult {
  const nodes: AnnouncementInlineNode[] = [];
  let text = "";
  let index = start;

  const flushText = () => {
    appendText(nodes, text);
    text = "";
  };

  while (index < source.length) {
    if (closingToken && source.startsWith(closingToken, index)) {
      flushText();
      return { nodes, index: index + closingToken.length, closed: true };
    }

    if (source[index] === "[") {
      const labelEnd = source.indexOf("](", index + 1);
      const urlEnd = labelEnd === -1 ? -1 : source.indexOf(")", labelEnd + 2);

      if (labelEnd > index + 1 && urlEnd > labelEnd + 2) {
        const href = source.slice(labelEnd + 2, urlEnd);
        const rawLink = source.slice(index, urlEnd + 1);

        if (isSafeHttpUrl(href)) {
          flushText();
          nodes.push({
            type: "link",
            href,
            children: parseInlineRange(source.slice(index + 1, labelEnd), 0, null, depth + 1).nodes,
          });
        } else {
          // Leave unsafe Markdown links visibly unchanged rather than turning
          // their labels into misleading, non-clickable link text.
          text += rawLink;
        }

        index = urlEnd + 1;
        continue;
      }
    }

    const delimiter = source.startsWith("**", index)
      ? { token: "**", type: "bold" as const }
      : source.startsWith("__", index)
        ? { token: "__", type: "underline" as const }
        : source[index] === "*"
          ? { token: "*", type: "italic" as const }
          : null;

    if (delimiter && depth < MAX_INLINE_NESTING) {
      const nested = parseInlineRange(
        source,
        index + delimiter.token.length,
        delimiter.token,
        depth + 1,
      );

      if (nested.closed && nested.nodes.length > 0) {
        flushText();
        nodes.push({ type: delimiter.type, children: nested.nodes });
        index = nested.index;
        continue;
      }

      // An unmatched marker remains ordinary visible text.
      text += delimiter.token;
      index += delimiter.token.length;
      continue;
    }

    text += source[index];
    index += 1;
  }

  flushText();
  return { nodes, index, closed: false };
}

function parseInline(source: string): AnnouncementInlineNode[] {
  return parseInlineRange(source, 0, null, 0).nodes;
}

/**
 * Converts the small Markdown subset used by school announcements to a safe
 * React-friendly tree. All unrecognized input remains ordinary text.
 */
export function parseAnnouncementMessage(
  message: string,
): AnnouncementBlockNode[] {
  if (!message) return [];

  const blocks: AnnouncementBlockNode[] = [];
  let paragraphLines: AnnouncementInlineNode[][] = [];
  let listType: "unordered-list" | "ordered-list" | null = null;
  let listItems: AnnouncementInlineNode[][] = [];

  const flushParagraph = () => {
    if (paragraphLines.length > 0) {
      blocks.push({ type: "paragraph", lines: paragraphLines });
      paragraphLines = [];
    }
  };

  const flushList = () => {
    if (listType && listItems.length > 0) {
      blocks.push({ type: listType, items: listItems });
    }
    listType = null;
    listItems = [];
  };

  for (const line of message.replace(/\r\n?/g, "\n").split("\n")) {
    if (line.trim() === "") {
      flushParagraph();
      flushList();
      continue;
    }

    const unordered = /^\s*[-*+]\s+(.*)$/.exec(line);
    const ordered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    const nextListType = unordered
      ? "unordered-list"
      : ordered
        ? "ordered-list"
        : null;

    if (nextListType) {
      flushParagraph();
      if (listType && listType !== nextListType) flushList();
      listType = nextListType;
      listItems.push(parseInline((unordered ?? ordered)![1]));
      continue;
    }

    flushList();
    paragraphLines.push(parseInline(line));
  }

  flushParagraph();
  flushList();
  return blocks;
}
