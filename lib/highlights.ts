export function highlightsFromTextarea(value: string) {
  // Keep the trailing empty item while the textarea has focus. Without it, a
  // controlled textarea immediately removes a newly entered line break.
  return value.split('\n');
}

export function compactHighlights(highlights: string[]) {
  return highlights.filter(Boolean);
}
