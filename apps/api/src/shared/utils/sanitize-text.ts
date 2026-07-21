/**
 * Lightweight text sanitization for user-generated content in realtime channels.
 * Strips HTML/script tags — no external dependency.
 * If rich-text rendering is needed later, swap for a proper HTML sanitizer.
 */
const HTML_TAG_RE = /<[^>]*>/g;
const SCRIPT_PROTOCOL_RE = /javascript\s*:/gi;
const DANGEROUS_ATTRS_RE = /on\w+\s*=\s*(?:'[^']*'|"[^"]*"|\S+)/gi;

export function sanitizeText(input: string): string {
  return input
    .replace(HTML_TAG_RE, "")
    .replace(SCRIPT_PROTOCOL_RE, "")
    .replace(DANGEROUS_ATTRS_RE, "")
    .trim();
}

export function sanitizeAttachmentName(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, "_").trim();
}
