const SECRET_KEYS = /(authorization|api[-_]?key|secret|token|dynamic_cvv|cvv|pan)/i;
const BEARER = /Bearer\s+[A-Za-z0-9._~+/=-]+/gi;
const KEY_PREFIX = /\b(?:sk|pk)_(?:test|live)_[A-Za-z0-9_-]+\b/g;
const PAN_LIKE = /\b(?:\d[ -]*?){13,19}\b/g;

export function redact(value: unknown): unknown {
  if (typeof value === "string") return value.replace(BEARER, "Bearer [REDACTED]").replace(KEY_PREFIX, "[REDACTED_KEY]").replace(PAN_LIKE, "[REDACTED_PAN]");
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, SECRET_KEYS.test(key) ? "[REDACTED]" : redact(item)]));
  }
  return value;
}
