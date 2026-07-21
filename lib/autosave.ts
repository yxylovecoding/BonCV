export async function waitForPendingSave(
  hasPendingChanges: () => boolean,
  options: { timeoutMs?: number; pollMs?: number } = {},
) {
  const timeoutMs = options.timeoutMs ?? 8_000;
  const pollMs = options.pollMs ?? 50;
  const deadline = Date.now() + timeoutMs;

  while (hasPendingChanges()) {
    if (Date.now() >= deadline) throw new Error('自动保存尚未完成，请检查保存状态后重试。');
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
}
