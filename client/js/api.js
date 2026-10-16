"use strict";

const API_BASE =
  window.location.hostname === "" || window.location.protocol === "file:"
    ? "http://localhost:3000"
    : "";

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`);
  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error || `HTTP ${res.status}`);
  }

  return json;
}

async function apiRequest(path, method, body, token = null) {
  const upperMethod = method.toUpperCase();
  const headers = {};
  const options = { method: upperMethod, headers };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (
    body !== undefined &&
    body !== null &&
    upperMethod !== "GET" &&
    upperMethod !== "HEAD"
  ) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${path}`, options);
  const json = await res.json();

  if (!res.ok) {
    throw new Error(
      json.error ||
        (json.errors && json.errors.join(" ")) ||
        `HTTP ${res.status}`,
    );
  }

  return json;
}

function apiPost(path, body, token) {
  return apiRequest(path, "POST", body, token);
}

function apiPut(path, body, token) {
  return apiRequest(path, "PUT", body, token);
}

function apiPatch(path, body, token) {
  return apiRequest(path, "PATCH", body, token);
}

window.API_BASE = API_BASE;
window.apiGet = apiGet;
window.apiRequest = apiRequest;
window.apiPost = apiPost;
window.apiPut = apiPut;
window.apiPatch = apiPatch;
