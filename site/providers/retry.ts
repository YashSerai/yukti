const retryableStatuses = new Set([502, 503, 504]);

export async function fetchWithSingleRetry(
  fetcher: typeof fetch,
  input: string | URL | Request,
  makeInit: () => RequestInit,
): Promise<Response> {
  const first = await fetcher(input, makeInit());
  if (!retryableStatuses.has(first.status)) return first;
  return fetcher(input, makeInit());
}
