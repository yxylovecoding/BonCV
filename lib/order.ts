export function reorderById(ids: string[], activeId: string, overId: string) {
  const from = ids.indexOf(activeId);
  const to = ids.indexOf(overId);
  if (from < 0 || to < 0 || from === to) return ids;
  const reordered = [...ids];
  const [active] = reordered.splice(from, 1);
  reordered.splice(to, 0, active);
  return reordered;
}

export function completeOrder(availableIds: string[], configuredOrder: string[]) {
  const available = new Set(availableIds);
  const ordered = configuredOrder.filter((id, index) => available.has(id) && configuredOrder.indexOf(id) === index);
  const included = new Set(ordered);
  return [...ordered, ...availableIds.filter((id) => !included.has(id))];
}
