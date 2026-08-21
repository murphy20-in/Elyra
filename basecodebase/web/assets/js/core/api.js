/**
 * Elyra API client.
 *
 * Thin wrapper over fetch that mirrors the FastAPI contract in
 * `basecodebase/api` (mounted at /api/v1). It owns three things the
 * rest of the app should never do by hand:
 *
 *   1. Token storage and the Authorization header.
 *   2. Transparent refresh on a 401, retrying the original request once.
 *   3. Unwrapping FastAPI's `{ detail: { detail, error_code } }` errors
 *      into a single Error carrying a `code` the UI can branch on.
 */

const BASE_URL = window.ELYRA_API_URL || "http://localhost:8000";
const PREFIX = "/api/v1";

/* ------------------------------------------------------------------
   Token store
   Kept in sessionStorage: an access token surviving a browser restart
   is a liability on a shared device, and shared devices are the norm
   for exactly the users this product is built for.
   ------------------------------------------------------------------ */
const ACCESS_KEY = "elyra.access";
const REFRESH_KEY = "elyra.refresh";

export const tokens = {
  get access() {
    return safeRead(ACCESS_KEY);
  },
  get refresh() {
    return safeRead(REFRESH_KEY);
  },
  set({ access_token, refresh_token }) {
    safeWrite(ACCESS_KEY, access_token);
    safeWrite(REFRESH_KEY, refresh_token);
  },
  clear() {
    safeRemove(ACCESS_KEY);
    safeRemove(REFRESH_KEY);
  },
};

// Private browsing and locked-down browsers throw on storage access
function safeRead(key) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeWrite(key, value) {
  try {
    if (value) sessionStorage.setItem(key, value);
  } catch {
    /* non-fatal: the session simply won't survive a reload */
  }
}

function safeRemove(key) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* non-fatal */
  }
}

export const isAuthenticated = () => Boolean(tokens.access);

/* ------------------------------------------------------------------
   Error shape
   ------------------------------------------------------------------ */
export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

async function toApiError(response) {
  let payload;
  try {
    payload = await response.json();
  } catch {
    return new ApiError(response.statusText || "Request failed", response.status, "UNKNOWN");
  }

  // FastAPI nests our structured errors one level under `detail`
  const detail = payload?.detail;

  if (typeof detail === "string") {
    return new ApiError(detail, response.status, "ERROR");
  }

  if (detail && typeof detail === "object") {
    return new ApiError(
      detail.detail || "Request failed",
      response.status,
      detail.error_code || "ERROR"
    );
  }

  // Pydantic validation errors arrive as a list
  if (Array.isArray(payload?.detail)) {
    const first = payload.detail[0];
    return new ApiError(first?.msg || "Invalid input", response.status, "VALIDATION_ERROR");
  }

  return new ApiError("Request failed", response.status, "UNKNOWN");
}

/* ------------------------------------------------------------------
   Core request
   ------------------------------------------------------------------ */
let refreshInFlight = null;

async function request(path, { method = "GET", body, auth = true, retry = true } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth && tokens.access) headers.Authorization = `Bearer ${tokens.access}`;

  let response;
  try {
    response = await fetch(`${BASE_URL}${PREFIX}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Can't reach Elyra right now. Check your connection.", 0, "NETWORK");
  }

  // Expired access token: refresh once, then replay the original call
  if (response.status === 401 && auth && retry && tokens.refresh) {
    const refreshed = await refreshTokens();
    if (refreshed) return request(path, { method, body, auth, retry: false });
  }

  if (!response.ok) throw await toApiError(response);

  if (response.status === 204) return null;
  return response.json();
}

/**
 * Concurrent 401s must not fire concurrent refreshes — the second one
 * would present an already-rotated refresh token and fail. Share one
 * in-flight promise across all callers.
 */
function refreshTokens() {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = request("/auth/refresh", {
    method: "POST",
    body: { refresh_token: tokens.refresh },
    auth: false,
    retry: false,
  })
    .then((data) => {
      tokens.set(data);
      return true;
    })
    .catch(() => {
      tokens.clear();
      return false;
    })
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
}

/* ------------------------------------------------------------------
   Endpoints
   ------------------------------------------------------------------ */
export const api = {
  health: () => request("/health", { auth: false }),

  auth: {
    register: (payload) =>
      request("/auth/register", { method: "POST", body: payload, auth: false }),

    login: (email, password) =>
      request("/auth/login", { method: "POST", body: { email, password }, auth: false }),

    logout: async () => {
      try {
        await request("/auth/logout", { method: "POST" });
      } finally {
        // Clear locally even if the server call fails — the user asked to leave
        tokens.clear();
      }
    },

    me: () => request("/auth/me"),

    forgotPassword: (email) =>
      request("/auth/forgot-password", { method: "POST", body: { email }, auth: false }),
  },

  profiles: {
    me: () => request("/profiles/me"),
  },

  matches: {
    list: () => request("/matches"),
  },
};

export default api;
