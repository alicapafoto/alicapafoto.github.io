export async function fetchWithTimeout(url, init = {}, timeoutMs = 12_000, label = "Upstream request") {
  const signal = init.signal || AbortSignal.timeout(timeoutMs);
  try {
    return await fetch(url, { ...init, signal });
  } catch (error) {
    if (signal.aborted) throw new Error(`${label} timed out`);
    throw error;
  }
}
