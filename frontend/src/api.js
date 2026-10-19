import { labelFor } from "./fields.js";

const BASE = import.meta.env.VITE_API_URL || "/api";

export class ApiError extends Error {
  constructor(message, fieldErrors = {}) {
    super(message);
    this.fieldErrors = fieldErrors;
  }
}

const flatten = (v) => {
  if (Array.isArray(v)) return v.map(flatten).join(" ");
  if (v && typeof v === "object") return Object.entries(v).map(([k, x]) => `${k}: ${flatten(x)}`).join(" ");
  return String(v);
};

function buildError(status, data) {
  if (data?.error) return new ApiError(data.error);
  if (data?.detail) return new ApiError(String(data.detail));
  if (data && typeof data === "object") {
    const fieldErrors = {};
    const parts = [];
    for (const [key, value] of Object.entries(data)) {
      const msg = flatten(value);
      fieldErrors[key] = msg;
      parts.push(`${labelFor(key)}: ${msg}`);
    }
    return new ApiError(`Please fix: ${parts.join(" | ")}`, fieldErrors);
  }
  return new ApiError(`Unexpected server error (HTTP ${status}). Check the Django terminal window for details.`);
}

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, options);
  } catch {
    throw new ApiError("Cannot reach the backend. Start Django with: python manage.py runserver (in the backend folder).");
  }
  const raw = await res.text();
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    /* non-JSON response (e.g. Django error page) */
  }
  if (!res.ok) throw buildError(res.status, data);
  return data;
}

const json = (method, body) => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const api = {
  health: () => request("/health/"),
  samples: () => request("/samples/"),
  extract: (text, source) => request("/extract/", json("POST", { text, source })),
  transcribe: (blob, filename) => {
    const form = new FormData();
    form.append("audio", blob, filename);
    return request("/transcribe/", { method: "POST", body: form });
  },
  listRecords: (search = "") => request(`/records/?search=${encodeURIComponent(search)}`),
  createRecord: (data) => request("/records/", json("POST", data)),
  updateRecord: (id, data) => request(`/records/${id}/`, json("PUT", data)),
  deleteRecord: (id) => request(`/records/${id}/`, { method: "DELETE" }),
};
