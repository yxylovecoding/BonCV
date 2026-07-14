export function normalizeHeadlineItems(items: string[]) {
  return items
    .flatMap((item) => item.split(/\s*(?:\r?\n|[·•])\s*/u))
    .map((item) => item.trim())
    .filter(Boolean);
}
