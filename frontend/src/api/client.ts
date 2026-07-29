const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export interface ApiErrorShape {
  message: string;
  errors?: { field: string; message: string }[];
}

export class ApiError extends Error {
  status: number;
  fields?: { field: string; message: string }[];
  constructor(status: number, body: ApiErrorShape) {
    super(body.message || "Request failed");
    this.status = status;
    this.fields = body.errors;
  }
}

function token() {
  return localStorage.getItem("token");
}

export async function api<T = any>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });

  const json = await res.json().catch(() => ({ message: res.statusText }));

  if (!res.ok) {
    if (res.status === 401 && localStorage.getItem("token")) {
      localStorage.clear();
      window.location.href = "/login";
    }
    throw new ApiError(res.status, json);
  }
  return json;
}
