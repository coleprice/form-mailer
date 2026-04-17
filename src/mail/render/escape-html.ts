const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};

export interface SafeHtml {
  readonly __html: string;
}

function isSafeHtml(value: unknown): value is SafeHtml {
  return typeof value === "object" && value !== null && "__html" in value;
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (match) => ESCAPE_MAP[match] ?? match);
}

export function rawHtml(value: string): SafeHtml {
  return { __html: value };
}

export function html(strings: TemplateStringsArray, ...values: unknown[]): string {
  return strings.reduce((output, segment, index) => {
    const nextValue = values[index];
    if (nextValue === undefined) {
      return output + segment;
    }

    if (isSafeHtml(nextValue)) {
      return output + segment + nextValue.__html;
    }

    return output + segment + escapeHtml(String(nextValue));
  }, "");
}

export function withLineBreaks(value: string): SafeHtml {
  return rawHtml(escapeHtml(value).replace(/\r?\n/g, "<br>"));
}

export function sanitizeDisplayText(value: string): string {
  return escapeHtml(value).replace(/&lt;br&gt;/g, "<br>");
}

