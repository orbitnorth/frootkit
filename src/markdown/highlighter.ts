/**
 * Lightweight, zero-dependency Syntax Highlighter for @froot/fullstack.
 * High-performance lexical tokenizer producing semantic HTML with Tokyo Night / GitHub Dark color tokens.
 */

const ESCAPE_REGEX = /[&<>"']/g;
const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(str: string): string {
  return str.replace(ESCAPE_REGEX, (match) => ESCAPE_MAP[match] || match);
}

const JS_KEYWORDS = new Set([
  'import', 'export', 'from', 'as', 'default', 'const', 'let', 'var',
  'function', 'return', 'async', 'await', 'if', 'else', 'switch', 'case',
  'break', 'continue', 'for', 'while', 'do', 'try', 'catch', 'finally',
  'throw', 'new', 'typeof', 'instanceof', 'in', 'of', 'void', 'this',
  'super', 'class', 'extends', 'implements', 'interface', 'type', 'enum',
  'namespace', 'declare', 'abstract', 'public', 'private', 'protected',
  'readonly', 'static', 'override', 'satisfies', 'keyof', 'infer',
]);

const JS_BOOLEANS = new Set(['true', 'false', 'null', 'undefined', 'NaN', 'Infinity']);

const JS_TYPES = new Set([
  'string', 'number', 'boolean', 'any', 'unknown', 'never', 'object',
  'symbol', 'bigint', 'void', 'Record', 'Array', 'Promise', 'Set', 'Map',
  'Function', 'Partial', 'Required', 'Readonly', 'Pick', 'Omit', 'Exclude',
  'Extract', 'NonNullable', 'Parameters', 'ReturnType',
]);

const JS_CLASSES = new Set([
  'Froot', 'AppRouter', 'Request', 'Response', 'Headers', 'ReadableStream',
  'WritableStream', 'TransformStream', 'URL', 'URLSearchParams', 'WebSocket',
  'D1Database', 'KVNamespace', 'ExecutionContext', 'Error', 'TypeError',
  'Math', 'JSON', 'Date', 'RegExp', 'Buffer', 'process', 'console',
]);

const BASH_COMMANDS = new Set([
  'npm', 'pnpm', 'npx', 'yarn', 'bun', 'deno', 'node', 'tsx', 'tsc',
  'git', 'cd', 'mkdir', 'rm', 'cp', 'mv', 'curl', 'wget', 'cat', 'echo',
  'tailwindcss', 'create-frootjs', 'frootjs',
]);

export function highlightCode(code: string, lang: string = ''): string {
  const normalizedLang = (lang || '').toLowerCase().trim();

  if (normalizedLang === 'json') {
    return highlightJson(code);
  }

  if (normalizedLang === 'bash' || normalizedLang === 'sh' || normalizedLang === 'shell' || normalizedLang === 'terminal') {
    return highlightBash(code);
  }

  if (normalizedLang === 'css') {
    return highlightCss(code);
  }

  // Default to JavaScript / TypeScript / TSX
  return highlightJs(code);
}

function highlightJs(code: string): string {
  // Regex pattern matching tokens in priority order:
  // 1: Block comment
  // 2: Line comment
  // 3: Template literal
  // 4: Double quote string
  // 5: Single quote string
  // 6: Number
  // 7: Identifier
  // 8: Punctuation / Operator
  const tokenRegex =
    /(\/\*[\s\S]*?\*\/)|(\/\/.*)|(`(?:\\`|[\s\S])*?`)|("(?:\\"|[^"\n])*?")|('(?:\\'|[^'\n])*?')|(\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|([a-zA-Z_$][a-zA-Z0-9_$]*)|([^\s\w$]+)/g;

  let result = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(code)) !== null) {
    // Append any intervening whitespace
    if (match.index > lastIndex) {
      result += escapeHtml(code.slice(lastIndex, match.index));
    }
    lastIndex = tokenRegex.lastIndex;

    const [
      full,
      blockComment,
      lineComment,
      templateStr,
      doubleStr,
      singleStr,
      number,
      ident,
      punct,
    ] = match;

    if (blockComment || lineComment) {
      result += `<span class="token-comment">${escapeHtml(full)}</span>`;
    } else if (templateStr || doubleStr || singleStr) {
      result += `<span class="token-string">${escapeHtml(full)}</span>`;
    } else if (number) {
      result += `<span class="token-number">${escapeHtml(number)}</span>`;
    } else if (ident) {
      if (JS_KEYWORDS.has(ident)) {
        result += `<span class="token-keyword">${escapeHtml(ident)}</span>`;
      } else if (JS_BOOLEANS.has(ident)) {
        result += `<span class="token-boolean">${escapeHtml(ident)}</span>`;
      } else if (JS_TYPES.has(ident)) {
        result += `<span class="token-type">${escapeHtml(ident)}</span>`;
      } else if (JS_CLASSES.has(ident)) {
        result += `<span class="token-class">${escapeHtml(ident)}</span>`;
      } else {
        // Peek ahead to see if it's a function call (followed by '(')
        const nextChar = code.slice(lastIndex).match(/^\s*\(/);
        if (nextChar) {
          result += `<span class="token-fn">${escapeHtml(ident)}</span>`;
        } else {
          result += `<span class="token-ident">${escapeHtml(ident)}</span>`;
        }
      }
    } else if (punct) {
      result += `<span class="token-punct">${escapeHtml(punct)}</span>`;
    } else {
      result += escapeHtml(full);
    }
  }

  if (lastIndex < code.length) {
    result += escapeHtml(code.slice(lastIndex));
  }

  return result;
}

function highlightJson(code: string): string {
  // 1: String
  // 2: Number
  // 3: Boolean / Null
  // 4: Colon / Braces
  const regex = /("(?:\\"|[^"\n])*?")|(\b-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|(\b(?:true|false|null)\b)|([{}[\],:])|([^\s\w"{}[\],:]+)/g;

  let result = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      result += escapeHtml(code.slice(lastIndex, match.index));
    }
    lastIndex = regex.lastIndex;

    const [full, str, num, bool, punct] = match;

    if (str) {
      // Check if followed by colon -> property key
      const isKey = code.slice(lastIndex).match(/^\s*:/);
      if (isKey) {
        result += `<span class="token-property">${escapeHtml(str)}</span>`;
      } else {
        result += `<span class="token-string">${escapeHtml(str)}</span>`;
      }
    } else if (num) {
      result += `<span class="token-number">${escapeHtml(num)}</span>`;
    } else if (bool) {
      result += `<span class="token-boolean">${escapeHtml(bool)}</span>`;
    } else if (punct) {
      result += `<span class="token-punct">${escapeHtml(punct)}</span>`;
    } else {
      result += escapeHtml(full);
    }
  }

  if (lastIndex < code.length) {
    result += escapeHtml(code.slice(lastIndex));
  }

  return result;
}

function highlightBash(code: string): string {
  // 1: Comment
  // 2: Prompt ($ or >)
  // 3: String
  // 4: Flag (-i, --minify)
  // 5: Word
  // 6: Other
  const regex = /(#.*)|(^\s*[$>]\s*)|("(?:\\"|[^"\n])*?")|('(?:\\'|[^'\n])*?')|(-{1,2}[a-zA-Z0-9_-]+)|([a-zA-Z0-9_./-]+)|([^\s\w$#>-]+)/gm;

  let result = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      result += escapeHtml(code.slice(lastIndex, match.index));
    }
    lastIndex = regex.lastIndex;

    const [full, comment, prompt, doubleStr, singleStr, flag, word, other] = match;

    if (comment) {
      result += `<span class="token-comment">${escapeHtml(comment)}</span>`;
    } else if (prompt) {
      result += `<span class="token-prompt select-none text-emerald-400 font-bold">${escapeHtml(prompt)}</span>`;
    } else if (doubleStr || singleStr) {
      result += `<span class="token-string">${escapeHtml(full)}</span>`;
    } else if (flag) {
      result += `<span class="token-flag text-cyan-400">${escapeHtml(flag)}</span>`;
    } else if (word) {
      if (BASH_COMMANDS.has(word)) {
        result += `<span class="token-keyword font-semibold text-purple-400">${escapeHtml(word)}</span>`;
      } else {
        result += `<span class="token-ident">${escapeHtml(word)}</span>`;
      }
    } else if (other) {
      result += `<span class="token-punct">${escapeHtml(other)}</span>`;
    } else {
      result += escapeHtml(full);
    }
  }

  if (lastIndex < code.length) {
    result += escapeHtml(code.slice(lastIndex));
  }

  return result;
}

function highlightCss(code: string): string {
  // 1: Comment
  // 2: String
  // 3: At-rule (@import, @theme)
  // 4: Hex color (#10b981)
  // 5: CSS variable (--color-brand)
  // 6: Word / property
  // 7: Punctuation
  const regex = /(\/\*[\s\S]*?\*\/)|("(?:\\"|[^"\n])*?")|('(?:\\'|[^'\n])*?')|(@[a-zA-Z0-9_-]+)|(#[0-9a-fA-F]{3,8})|(--[a-zA-Z0-9_-]+)|([a-zA-Z_-][a-zA-Z0-9_-]*)|([^\s\w$@#-]+)/g;

  let result = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      result += escapeHtml(code.slice(lastIndex, match.index));
    }
    lastIndex = regex.lastIndex;

    const [full, comment, dStr, sStr, atRule, hexColor, cssVar, word, punct] = match;

    if (comment) {
      result += `<span class="token-comment">${escapeHtml(comment)}</span>`;
    } else if (dStr || sStr) {
      result += `<span class="token-string">${escapeHtml(full)}</span>`;
    } else if (atRule) {
      result += `<span class="token-keyword font-bold text-purple-400">${escapeHtml(atRule)}</span>`;
    } else if (hexColor) {
      result += `<span class="token-color text-emerald-400 font-semibold">${escapeHtml(hexColor)}</span>`;
    } else if (cssVar) {
      result += `<span class="token-variable text-cyan-300">${escapeHtml(cssVar)}</span>`;
    } else if (word) {
      result += `<span class="token-property text-slate-300">${escapeHtml(word)}</span>`;
    } else if (punct) {
      result += `<span class="token-punct">${escapeHtml(punct)}</span>`;
    } else {
      result += escapeHtml(full);
    }
  }

  if (lastIndex < code.length) {
    result += escapeHtml(code.slice(lastIndex));
  }

  return result;
}

