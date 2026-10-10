export type CompletionRequest = {
  prefix: string;
  suffix: string;
  language: string | null;
  filename: string | null;
  /** CodeMirror indent unit: "\t" or a run of spaces. */
  indentUnit: string | null;
};

const MAX_PREFIX = 4000;
const MAX_SUFFIX = 2000;

export function trimContext(prefix: string, suffix: string) {
  const p =
    prefix.length > MAX_PREFIX
      ? prefix.slice(prefix.length - MAX_PREFIX)
      : prefix;
  const s = suffix.length > MAX_SUFFIX ? suffix.slice(0, MAX_SUFFIX) : suffix;
  return { prefix: p, suffix: s };
}

export const COMPLETION_SYSTEM_PROMPT = `You perform fill-in-the-middle code completion.

You receive PREFIX (code before the cursor) and SUFFIX (code after the cursor). Your output is inserted EXACTLY at the cursor position. PREFIX + your_output + SUFFIX must form valid, syntactically-correct code.

Complete the current coding intent with a useful insertion, not merely a tag name or one token. Use comments, function names, surrounding declarations, and markup structure as instructions for what code belongs here. A useful insertion can be a statement, function body, complete HTML section, CSS rule, or a small coherent block of up to 48 lines. Include the necessary closing delimiters unless they already exist in SUFFIX. Stop before unrelated work or assumptions about unknown APIs.

Hard rules:
1. NEVER repeat any text already present in PREFIX or SUFFIX.
2. NEVER write code that belongs after SUFFIX.
3. Indentation is critical: use EXACTLY the file's indent unit (given as "Indent:" metadata) for every new line. Never substitute tabs for spaces or a different space width. Continuation lines must align with the surrounding PREFIX lines.
4. Match quoting and naming conventions exactly.
5. Output empty string when there is no meaningful completion. Do not invent unavailable APIs, dependencies, or project facts.
6. Output format: raw insertion text only. No markdown fences. No commentary. No "Here is".

Examples:

PREFIX: "#[te"
SUFFIX: "]"
OUTPUT: "st"

PREFIX: "fn binary_search"
SUFFIX: ""
OUTPUT: "<T: Ord>(arr: &[T], target: &T) -> Option<usize> {"

PREFIX: "for (let i = 0; i < arr.length; i"
SUFFIX: ") {\\n"
OUTPUT: "++"

PREFIX: "const sum = (a, b) => "
SUFFIX: ";"
OUTPUT: "a + b"

PREFIX: "function fetchUser(id: string) {\\n  "
SUFFIX: "\\n}"
OUTPUT: "return fetch(\`/api/users/\${id}\`).then(r => r.json());"

PREFIX: "<!-- Accessible email signup form -->\\n<section>"
SUFFIX: "</section>"
OUTPUT: "\\n  <form>\\n    <label for='email'>Email</label>\\n    <input id='email' name='email' type='email' autocomplete='email' required>\\n    <button type='submit'>Subscribe</button>\\n  </form>\\n"

PREFIX: "def clamp(value, minimum, maximum):\\n    "
SUFFIX: ""
OUTPUT: "return max(minimum, min(value, maximum))"`;

export function buildUserPrompt(req: CompletionRequest): string {
  const { prefix, suffix } = trimContext(req.prefix, req.suffix);
  const meta: string[] = [];
  if (req.filename) meta.push(`File: ${req.filename}`);
  if (req.language) meta.push(`Language: ${req.language}`);
  if (req.indentUnit) {
    meta.push(
      req.indentUnit === "\t"
        ? "Indent: tabs"
        : `Indent: ${req.indentUnit.length} spaces`,
    );
  }
  const metaBlock = meta.length ? `${meta.join("\n")}\n\n` : "";

  return `${metaBlock}PREFIX:
<<<
${prefix}
>>>

SUFFIX:
<<<
${suffix}
>>>

Output the text to insert at the cursor.`;
}
