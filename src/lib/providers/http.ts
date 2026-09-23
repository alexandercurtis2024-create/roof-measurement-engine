const UA = "RoofMeasurementEngine/0.1 (Maryland contractor measurement; public GIS client)";

export async function fetchJson<T = unknown>(
  url: string,
  init: RequestInit = {},
  timeoutMs = 20000,
): Promise<{ ok: boolean; status: number; data: T | null; error?: string; raw?: string }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...init,
      signal: ctrl.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": UA,
        ...(init.headers ?? {}),
      },
    });
    const text = await res.text();
    if (!res.ok) {
      return { ok: false, status: res.status, data: null, error: `HTTP ${res.status}`, raw: text.slice(0, 400) };
    }
    try {
      return { ok: true, status: res.status, data: JSON.parse(text) as T };
    } catch {
      return { ok: false, status: res.status, data: null, error: "Invalid JSON", raw: text.slice(0, 400) };
    }
  } catch (err) {
    return { ok: false, status: 0, data: null, error: err instanceof Error ? err.message : "fetch failed" };
  } finally {
    clearTimeout(t);
  }
}

export function qs(params: Record<string, string | number | undefined>) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") u.set(k, String(v));
  }
  return u.toString();
}
