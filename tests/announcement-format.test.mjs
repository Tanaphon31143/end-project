import assert from "node:assert/strict";
import test from "node:test";
import { parseAnnouncementMessage } from "../src/lib/announcement-format.ts";

test("legacy plain text keeps paragraphs and explicit line breaks", () => {
  assert.deepEqual(parseAnnouncementMessage("บรรทัดแรก\nบรรทัดสอง\n\nย่อหน้าใหม่"), [
    {
      type: "paragraph",
      lines: [
        [{ type: "text", value: "บรรทัดแรก" }],
        [{ type: "text", value: "บรรทัดสอง" }],
      ],
    },
    { type: "paragraph", lines: [[{ type: "text", value: "ย่อหน้าใหม่" }]] },
  ]);
});

test("bold, italic, underline and links form safe inline nodes", () => {
  assert.deepEqual(
    parseAnnouncementMessage("**สำคัญ** *เอียง* __ขีดเส้นใต้__ [เว็บไซต์](https://school.example/path)"),
    [
      {
        type: "paragraph",
        lines: [[
          { type: "bold", children: [{ type: "text", value: "สำคัญ" }] },
          { type: "text", value: " " },
          { type: "italic", children: [{ type: "text", value: "เอียง" }] },
          { type: "text", value: " " },
          { type: "underline", children: [{ type: "text", value: "ขีดเส้นใต้" }] },
          { type: "text", value: " " },
          {
            type: "link",
            href: "https://school.example/path",
            children: [{ type: "text", value: "เว็บไซต์" }],
          },
        ]],
      },
    ],
  );
});

test("unordered and numbered lists preserve item order", () => {
  assert.deepEqual(parseAnnouncementMessage("- หนึ่ง\n- **สอง**\n\n1. ขั้นแรก\n2) ขั้นต่อไป"), [
    {
      type: "unordered-list",
      items: [
        [{ type: "text", value: "หนึ่ง" }],
        [{ type: "bold", children: [{ type: "text", value: "สอง" }] }],
      ],
    },
    {
      type: "ordered-list",
      items: [
        [{ type: "text", value: "ขั้นแรก" }],
        [{ type: "text", value: "ขั้นต่อไป" }],
      ],
    },
  ]);
});

test("HTML-looking content and executable link destinations stay plain text", () => {
  const unsafeMessage =
    '<script>alert("xss")</script> [กดที่นี่](javascript:alert(1)) [ไม่ปลอดภัย](data:text/html,hi)';
  const [block] = parseAnnouncementMessage(unsafeMessage);

  assert.equal(block.type, "paragraph");
  if (block.type !== "paragraph") return;
  const nodes = block.lines[0];
  assert.ok(nodes.every((node) => node.type === "text"));
  assert.equal(nodes.map((node) => node.type === "text" ? node.value : "").join(""), unsafeMessage);
});

test("HTTP and HTTPS only are accepted as links", () => {
  const [block] = parseAnnouncementMessage(
    "[HTTP](http://example.com) [HTTPS](https://example.com) [Mail](mailto:school@example.com)",
  );
  assert.equal(block.type, "paragraph");
  if (block.type !== "paragraph") return;
  assert.deepEqual(
    block.lines[0].filter((node) => node.type === "link").map((node) => node.href),
    ["http://example.com", "https://example.com"],
  );
  assert.ok(block.lines[0].some((node) => node.type === "text" && node.value.includes("mailto:")));
});
