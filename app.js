
const API_URL = "https://script.google.com/macros/s/AKfycbyN6mvDEeRKzmA-dlp7M4ADqvzEwWHDgLhuPC1NtzvBVvwoXj5WIA7-neaxqecvfzBwSQ/exec";
const DATA_JSON = "./data.json";
const EXPECTED_PW = "louise";

const gallery = document.getElementById("gallery");
const statusEl = document.getElementById("status");
const passwordInput = document.getElementById("passwordInput");
const unlockBtn = document.getElementById("unlockBtn");
const authStatus = document.getElementById("authStatus");
const modeChip = document.getElementById("modeChip");

let isWriteEnabled = false;
let currentPassword = "";

function setStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.style.color = isError ? "crimson" : "inherit";
}

function fetchApiUrl(url) {
  return `${url}${url.includes("?") ? "&" : "?"}_ts=${Date.now()}`;
}

async function fetchLocalJson(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Erreur chargement ${path} (HTTP ${res.status})`);
  return res.json();
}

async function fetchApi(url) {
  const res = await fetch(fetchApiUrl(url), {
    method: "GET",
    cache: "no-store"
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(`API HTTP ${res.status}`);
  }

  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("API réponse non JSON");
  }

  return json;
}

async function apiReadState() {
  const json = await fetchApi(`${API_URL}?action=read`);
  if (!json.ok) throw new Error(json.error || "Erreur read");
  return json.data || {};
}

async function apiWriteSelection({ id, selected }) {
  const url =
    `${API_URL}?action=write` +
    `&id=${encodeURIComponent(id)}` +
    `&selected=${selected ? "true" : "false"}` +
    `&password=${encodeURIComponent(currentPassword)}`;

  const json = await fetchApi(url);
  if (!json.ok) throw new Error(json.error || "Erreur write");

  return true;
}

unlockBtn.addEventListener("click", () => {
  const pw = (passwordInput.value || "").trim();

  if (!pw) {
    authStatus.textContent = "Entre un mot de passe";
    return;
  }

  if (pw.toLowerCase() !== EXPECTED_PW) {
    authStatus.textContent = "Mot de passe incorrect";
    return;
  }

  currentPassword = pw;
  isWriteEnabled = true;

  authStatus.textContent = "Écriture activée";
  if (modeChip) modeChip.textContent = "Écriture";

  refreshReadonlyState();
});

function refreshReadonlyState() {
  document.querySelectorAll(".book-card").forEach(card => {
    card.classList.toggle("is-readonly", !isWriteEnabled);
  });
}

function createCard(item, state) {
  const selected = !!state[item.id]?.selected;

  const card = document.createElement("article");
  card.className = "book-card";
  if (!isWriteEnabled) card.classList.add("is-readonly");
  if (selected) card.classList.add("is-selected");

  const imageWrap = document.createElement("div");
  imageWrap.className = "book-card__image-wrap";

  const img = document.createElement("img");
  img.className = "book-card__image";
  img.src = item.image;
  img.alt = item.title;

  const check = document.createElement("div");
  check.className = "book-card__check";
  check.textContent = "★";

  imageWrap.appendChild(img);
  imageWrap.appendChild(check);

  const body = document.createElement("div");
  body.className = "book-card__body";

  const title = document.createElement("div");
  title.className = "book-card__title";
  title.textContent = item.title;

  body.appendChild(title);

  card.appendChild(imageWrap);
  card.appendChild(body);

  card.addEventListener("click", async () => {
    if (!isWriteEnabled) return;

    const willSelect = !card.classList.contains("is-selected");

    try {
      setStatus("Sauvegarde…");
      await apiWriteSelection({ id: item.id, selected: willSelect });
      card.classList.toggle("is-selected", willSelect);
      setStatus("Enregistré ✅");
    } catch (err) {
      setStatus("Erreur : " + err.message, true);
    }
  });

  return card;
}

function renderGallery(items, state) {
  gallery.innerHTML = "";
  const fragment = document.createDocumentFragment();

  for (const item of items) {
    fragment.appendChild(createCard(item, state));
  }

  gallery.appendChild(fragment);
}

async function init() {
  try {
    setStatus("Chargement…");
    if (modeChip) modeChip.textContent = "Lecture";

    const items = await fetchLocalJson(DATA_JSON);
    if (!Array.isArray(items)) throw new Error("data.json invalide");

    const state = await apiReadState();

    renderGallery(items, state);
    setStatus("Prêt.");
  } catch (err) {
    setStatus("Erreur : " + err.message, true);
  }
}

init();
