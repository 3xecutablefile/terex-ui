import {
  hasNextSnippetField,
  snippetCompletion,
  CompletionContext,
  type CompletionResult,
} from "@codemirror/autocomplete";
import { indentUnit, syntaxTree, type Language } from "@codemirror/language";
import { Prec, type Extension } from "@codemirror/state";
import { keymap } from "@codemirror/view";
import expand, { extract } from "emmet";

export function emmetSource(language: Language, syntax: "html" | "css") {
  let cache = {};
  let lastIndent = "";
  return (context: CompletionContext): CompletionResult | null => {
    const { state, pos } = context;
    if (
      state.readOnly ||
      !state.selection.main.empty ||
      !language.isActiveAt(state, pos, -1)
    )
      return null;
    let inBlock = false;
    const tree = syntaxTree(state);
    for (
      let node: typeof tree.topNode | null = tree.resolveInner(pos, -1);
      node;
      node = node.parent
    ) {
      if (
        /^(?:Comment|BlockComment|LineComment|String|AttributeValue|AttributeName|OpenTag|CloseTag|SelfClosingTag)$/.test(
          node.name,
        )
      )
        return null;
      if (node.name === "Block") inBlock = true;
    }
    if (syntax === "css" && !inBlock) return null;
    const line = state.doc.lineAt(pos);
    if (line.length > 4096) return null;
    const abbreviation = extract(line.text, pos - line.from, {
      type: syntax === "css" ? "stylesheet" : "markup",
      lookAhead: true,
    });
    if (!abbreviation || abbreviation.abbreviation.length > 512) return null;
    const before = line.text.slice(0, abbreviation.start).trimEnd();
    if (syntax === "html" && before && !before.endsWith(">")) return null;
    if (syntax === "css" && before && !/[{;]$/.test(before)) return null;
    const unit = state.facet(indentUnit);
    if (unit !== lastIndent) {
      lastIndent = unit;
      cache = {};
    }
    try {
      const template = expand(abbreviation.abbreviation, {
        type: syntax === "css" ? "stylesheet" : "markup",
        syntax,
        cache,
        maxRepeat: 100,
        options: {
          "output.indent": unit,
          "output.field": (index, placeholder) =>
            `\${${index + 1}:${placeholder}}`,
          "stylesheet.strictMatch": true,
        },
      });
      if (
        !template ||
        template.length > 64_000 ||
        template === abbreviation.abbreviation
      )
        return null;
      return {
        from: line.from + abbreviation.start,
        to: line.from + abbreviation.end,
        options: [
          snippetCompletion(template, {
            label: abbreviation.abbreviation,
            detail: "Emmet",
            type: "snippet",
            boost: 99,
            info: template.replace(/\$\{\d+:([^}]*)\}/g, "$1"),
          }),
        ],
      };
    } catch {
      return null;
    }
  };
}

export function emmetExtension(
  language: Language,
  syntax: "html" | "css",
): Extension {
  const source = emmetSource(language, syntax);
  return [
    language.data.of({ autocomplete: source }),
    Prec.high(
      keymap.of([
        {
          key: "Tab",
          run: (view) => {
            if (hasNextSnippetField(view.state)) return false;
            const result = source(
              new CompletionContext(
                view.state,
                view.state.selection.main.head,
                true,
              ),
            );
            const option = result?.options[0];
            if (!result || !option || typeof option.apply !== "function")
              return false;
            option.apply(
              view,
              option,
              result.from,
              result.to ?? view.state.selection.main.head,
            );
            return true;
          },
        },
      ]),
    ),
  ];
}
