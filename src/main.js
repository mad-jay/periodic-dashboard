import './style.css';

import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------
const $ = (id) => document.getElementById(id);

// ---------------------------------------------------------------------------
// Google configuration (from .env / Vite env)
// ---------------------------------------------------------------------------
const SHEET_ID = import.meta.env.VITE_GOOGLE_SHEET_ID || '';
const API_KEY  = import.meta.env.VITE_GOOGLE_API_KEY || '';
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const RANGE = 'Data Template!A1:F201';

// ---------------------------------------------------------------------------
// Application state
// ---------------------------------------------------------------------------
let people = [];
let objects = [];
let scene;
let camera;
let renderer;
let controls;
let activeLayout = 'table';
let animationId;
let tokenClient;
let accessToken = null;

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
const money = (n) => '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 });

const wealthClass = (n) => {
  const value = Number(n);
  if (value < 100000) return 'red';
  if (value > 200000) return 'green';
  return 'orange';
};

const escapeHTML = (s) => {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return String(s ?? '').replace(/[&<>"']/g, (c) => map[c]);
};

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------
async function loadData() {
  try {
    const res = await fetch('/data.json');
    people = await res.json();
    $('data-status').innerHTML = '<i></i> SAMPLE DATA LOADED';
    $('loading').style.display = 'none';
    updateStats();
    buildScene();
  } catch (e) {
    $('data-status').textContent = 'Data unavailable';
  }
}

function updateStats() {
  $('people-count').textContent = people.length;
  $('countries-count').textContent = new Set(people.map((p) => p.Country)).size;
  $('wealth-total').textContent = money(
    people.reduce((s, p) => s + Number(p['Net Worth']), 0)
  );
}

// ---------------------------------------------------------------------------
// Card creation
// ---------------------------------------------------------------------------
function makeCard(p, index) {
  const cls = wealthClass(p['Net Worth']);
  const el = document.createElement('div');
  el.className = `person-card ${cls}-card`;
  el.innerHTML =
    `<span class="country">${escapeHTML(p.Country)}</span>` +
    `<span class="age">${escapeHTML(p.Age)}</span>` +
    `<img class="photo" src="${escapeHTML(p.Photo)}" alt="" loading="lazy" onerror="this.style.opacity=0">` +
    `<div class="name">${escapeHTML(p.Name)}</div>` +
    `<div class="interest">${escapeHTML(p.Interest)}</div>`;
  el.addEventListener('click', () => showDetail(p));
  return el;
}

// ---------------------------------------------------------------------------
// Three.js scene setup
// ---------------------------------------------------------------------------
function buildScene() {
  const wrap = $('scene');

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    40,
    wrap.clientWidth / wrap.clientHeight,
    1,
    10000
  );
  camera.position.set(0, 0, 1800);

  renderer = new CSS3DRenderer();
  renderer.setSize(wrap.clientWidth, wrap.clientHeight);
  wrap.replaceChildren(renderer.domElement);

  controls = new TrackballControls(camera, renderer.domElement);
  controls.rotateSpeed = 2.0;
  controls.minDistance = 500;
  controls.maxDistance = 5000;

  objects = people.map((p, i) => {
    const obj = new CSS3DObject(makeCard(p, i));
    obj.position.set(
      (Math.random() - 0.5) * 4000,
      (Math.random() - 0.5) * 3000,
      (Math.random() - 0.5) * 3000
    );
    scene.add(obj);
    return obj;
  });

  layout('table', false);
  window.addEventListener('resize', onResize);
  animate();
}

// ---------------------------------------------------------------------------
// Layout target positions
// ---------------------------------------------------------------------------
function targetPositions(type) {
  const n = objects.length;
  const targets = [];

  if (type === 'table') {
    const cols = 20;
    const rows = 10;
    const gapX = 132;
    const gapY = 158;
    for (let i = 0; i < n; i++) {
      const x = i % cols;
      const y = Math.floor(i / cols);
      targets.push(
        new THREE.Vector3(
          (x - (cols - 1) / 2) * gapX,
          ((rows - 1) / 2 - y) * gapY,
          0
        )
      );
    }
  } else if (type === 'sphere') {
    const radius = 760;
    for (let i = 0; i < n; i++) {
      const phi = Math.acos(-1 + 2 * (i + 0.5) / n);
      const theta = Math.sqrt(n * Math.PI) * phi;
      targets.push(
        new THREE.Vector3(
          radius * Math.cos(theta) * Math.sin(phi),
          radius * Math.cos(phi),
          radius * Math.sin(theta) * Math.sin(phi)
        )
      );
    }
  } else if (type === 'helix') {
    const radius = 520;
    const turns = 5;
    const height = 1800;
    for (let i = 0; i < n; i++) {
      const strand = i % 2;
      const j = Math.floor(i / 2);
      const t = j / Math.ceil(n / 2);
      const angle = t * Math.PI * 2 * turns + strand * Math.PI;
      targets.push(
        new THREE.Vector3(
          Math.cos(angle) * radius,
          height / 2 - t * height,
          Math.sin(angle) * radius
        )
      );
    }
  } else {
    // Grid: required 5 x 4 x 10 volume (200 records).
    const xCount = 5;
    const yCount = 4;
    const zCount = 10;
    const gap = 170;
    for (let i = 0; i < n; i++) {
      const x = i % xCount;
      const y = Math.floor(i / xCount) % yCount;
      const z = Math.floor(i / (xCount * yCount));
      targets.push(
        new THREE.Vector3(
          (x - (xCount - 1) / 2) * gap,
          ((yCount - 1) / 2 - y) * gap,
          (z - (zCount - 1) / 2) * gap
        )
      );
    }
  }

  return targets;
}

// ---------------------------------------------------------------------------
// Apply a layout
// ---------------------------------------------------------------------------
function layout(type, animate = true) {
  activeLayout = type;

  document.querySelectorAll('.view-btn').forEach((b) =>
    b.classList.toggle('active', b.dataset.layout === type)
  );

  $('view-name').textContent = type.toUpperCase() + ' VIEW';

  const targets = targetPositions(type);
  objects.forEach((obj, i) => {
    const p = targets[i];
    obj.userData.target = p;
    if (!animate) {
      obj.position.copy(p);
      obj.rotation.set(0, 0, 0);
    }
  });

  if (!animate) {
    camera.position.set(0, 0, type === 'table' ? 2500 : 1900);
    controls.reset();
    controls.update();
  }
}

// ---------------------------------------------------------------------------
// Animation loop
// ---------------------------------------------------------------------------
function animate() {
  animationId = requestAnimationFrame(animate);
  objects.forEach((o) => {
    if (o.userData.target) {
      o.position.lerp(o.userData.target, 0.09);
      o.rotation.x = THREE.MathUtils.lerp(o.rotation.x, 0, 0.08);
      o.rotation.y = THREE.MathUtils.lerp(o.rotation.y, 0, 0.08);
    }
  });
  controls.update();
  renderer.render(scene, camera);
}

// ---------------------------------------------------------------------------
// Resize handler
// ---------------------------------------------------------------------------
function onResize() {
  const w = $('scene').clientWidth;
  const h = $('scene').clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  controls.handleResize();
}

// ---------------------------------------------------------------------------
// Detail panel
// ---------------------------------------------------------------------------
function showDetail(p) {
  $('detail-content').innerHTML =
    `<img src="${escapeHTML(p.Photo)}" alt="">` +
    `<h2>${escapeHTML(p.Name)}</h2>` +
    `<p>${escapeHTML(p.Country)} · ${escapeHTML(p.Age)} years old</p>` +
    `<p>Interest: <strong>${escapeHTML(p.Interest)}</strong></p>` +
    `<p>Net worth: <strong>${money(p['Net Worth'])}</strong></p>`;
  $('detail').classList.remove('hidden');
}

$('close-detail').addEventListener('click', () =>
  $('detail').classList.add('hidden')
);

document.querySelectorAll('.view-btn').forEach((b) =>
  b.addEventListener('click', () => layout(b.dataset.layout))
);

$('reset-view').addEventListener('click', () => layout(activeLayout, false));

$('search').addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  objects.forEach((o, i) => {
    const p = people[i];
    const match = [p.Name, p.Country, p.Interest]
      .join(' ')
      .toLowerCase()
      .includes(q);
    o.element.style.opacity = match ? '1' : '0.08';
    o.element.style.pointerEvents = match ? 'auto' : 'none';
  });
});

// ---------------------------------------------------------------------------
// Google Sheets (live data)
// ---------------------------------------------------------------------------
async function readGoogleSheet() {
  if (!SHEET_ID || !API_KEY || !accessToken) {
    throw new Error('Google Sheets is not configured or signed in.');
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(RANGE)}?key=${API_KEY}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok) {
    throw new Error('Could not read the Google Sheet. Check sharing and API settings.');
  }

  const values = (await res.json()).values || [];
  const headers = values.shift().map((x) => x.trim());

  return values
    .map((row) => Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ''])))
    .map((p) => ({
      ...p,
      'Net Worth': Number(String(p['Net Worth']).replace(/[$,]/g, ''))
    }));
}

// ---------------------------------------------------------------------------
// Google OAuth
// ---------------------------------------------------------------------------
function initGoogleAuth() {
  if (!CLIENT_ID) {
    $('google-login').title = 'Add VITE_GOOGLE_CLIENT_ID in .env';
    return;
  }

  const wait = setInterval(() => {
    if (window.google?.accounts?.oauth2) {
      clearInterval(wait);

      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
        callback: async (response) => {
          if (response.error) {
            toast('Google sign-in failed.');
            return;
          }

          accessToken = response.access_token;

          try {
            people = await readGoogleSheet();
            updateStats();
            buildScene();

            $('data-status').innerHTML = '<i></i> CONNECTED TO GOOGLE SHEETS';
            $('google-login').classList.add('hidden');
            $('sign-out').classList.remove('hidden');
            toast('Live Google Sheet data loaded.');
          } catch (err) {
            toast(err.message);
          }
        }
      });
    }
  }, 200);
}

$('google-login').addEventListener('click', () => {
  if (!tokenClient) {
    toast('Configure Google OAuth Client ID first.');
    return;
  }
  tokenClient.requestAccessToken({ prompt: 'consent' });
});

$('sign-out').addEventListener('click', () => {
  if (accessToken) {
    google.accounts.oauth2.revoke(accessToken, () => {});
  }

  accessToken = null;
  $('sign-out').classList.add('hidden');
  $('google-login').classList.remove('hidden');

  toast('Signed out. Reloading...');

  setTimeout(() => {
    window.location.reload();
  }, 1000);
});

// ---------------------------------------------------------------------------
// Toast notification
// ---------------------------------------------------------------------------
function toast(msg) {
  $('toast').textContent = msg;
  $('toast').classList.add('show');
  setTimeout(() => $('toast').classList.remove('show'), 3200);
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
loadData();
initGoogleAuth();