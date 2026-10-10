import { CompletionContext } from "@codemirror/autocomplete";
import { html, htmlLanguage } from "@codemirror/lang-html";
import { css, cssLanguage } from "@codemirror/lang-css";
import { EditorState } from "@codemirror/state";
import { emmetSource } from "@/modules/editor/lib/emmet";
import { expect, it } from "vitest";

function completion(marked: string, stylesheet = false) {
  const pos = marked.indexOf("|");
  const state = EditorState.create({
    doc: marked.replace("|", ""),
    selection: { anchor: pos },
    extensions: [stylesheet ? css() : html()],
  });
  return emmetSource(
    stylesheet ? cssLanguage : htmlLanguage,
    stylesheet ? "css" : "html",
  )(new CompletionContext(state, pos, true));
}

it("offers full HTML boilerplate and numbered nested structures without an opening tag", () => {
  expect(completion("!|")?.options[0].info).toContain("<!DOCTYPE html>");
  const result = completion("ul>li.item$*3|");
  expect(result?.options[0].info).toContain('class="item3"');
  expect(result?.options[0].info).toContain("</ul>");
  expect(result?.from).toBe(0);
  expect(completion(".card|")?.options[0].info).toContain('<div class="card">');
});

it("respects HTML attributes/comments/scripts and expands CSS declarations only inside rules", () => {
  expect(completion('<div title="ul>li|">')).toBeNull();
  expect(completion("<!-- ul>li| -->")).toBeNull();
  expect(completion("<script>const ul|</script>")).toBeNull();
  expect(completion(".box { m10| }", true)?.options[0].info).toBe(
    "margin: 10px;",
  );
  expect(completion("m10|", true)).toBeNull();
});
