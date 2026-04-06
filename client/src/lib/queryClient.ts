import { QueryClient } from "@tanstack/react-query";

// Use relative URLs everywhere — frontend and backend are on the same origin.
// Exception: Perplexity Computer preview (sites.pplx.app) uses a port proxy.
const IS_PPLX_PREVIEW = typeof window !== "undefined" &&
  window.location.hostname.includes("pplx.app");

const API_BASE = IS_PPLX_PREVIEW ? "__PORT_5000__" : "";

export async function apiRequest(
  method: string,
  path: string,
  body?: unknown
): Promise<Response> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || res.statusText);
  }
  return res;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const [path] = queryKey as string[];
        const url = `${API_BASE}${path}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json();
      },
      staleTime: 5000,
      retry: false,
    },
  },
});
