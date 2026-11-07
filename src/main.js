import * as THREE from 'three';
import { canvasTex, M, solidMat, goldMat, lathe, smooth } from './util.js';
import { Room, makeEnvironment } from './room.js';
import { Doll } from './doll.js';
import { ITEMS, BY_ID } from './catalog.js';
import { Hands, Interaction } from './hands.js';
import { Kit, Button, Toast, Wardrobe, Gallery, makePanel } from './ui.js';
import { Sparkles, ambientSparkles } from './fx.js';
import { sfx, music } from './audio.js';
import { PRESETS, DEFAULT_LOOK, store, randomName } from './store.js';

const $ = (s) => document.querySelector(s);
const canvas = $('#c');

/* ---------- Renderer ---------- */
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.9;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.xr.enabled = true; renderer.xr.setReferenceSpaceType('local-floor');
renderer.xr.setFramebufferScaleFactor(1.2); renderer.xr.setFoveation(0.3);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffd3e6);
scene.environment = makeEnvironment(renderer); scene.environmentIntensity = 0.55;
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.05, 40);
const DESK_POS = new THREE.Vector3(0, 1.45, 0.75), DESK_LOOK = new THREE.Vector3(0, 1.15, -0.8);
camera.position.copy(DESK_POS); camera.lookAt(DESK_LOOK);
scene.add(camera);

/* ---------- World ---------- */
const room = new Room(scene, renderer);
const sparkles = new Sparkles(scene);
const ambient = ambientSparkles(scene);
const interaction = new Interaction();
const kit = new Kit(scene, interaction);
const hands = new Hands(renderer, scene, camera, canvas);

const ws = new THREE.Group(); scene.add(ws); // workspace: follows the player (position / height / heading)

// Table
const table = new THREE.Group(); table.position.set(0, 0, -0.8); ws.add(table);
const topTex = canvasTex(512, 512, (g) => {
  const gr = g.createRadialGradient(256, 256, 20, 256, 256, 256); gr.addColorStop(0, '#fff7fb'); gr.addColorStop(0.6, '#ffd0e6'); gr.addColorStop(1, '#ff9ccf'); g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  g.fillStyle = 'rgba(255,255,255,0.8)'; for (let i = 0; i < 26; i++) { const a = i * 0.8, r = 40 + (i * 37) % 190; g.beginPath(); g.arc(256 + Math.cos(a) * r, 256 + Math.sin(a) * r, 3 + (i % 3) * 2, 0, 7); g.fill(); }
});
const top = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.035, 64), [solidMat(0xffc94d, { rough: 0.2, metal: 1 }), new THREE.MeshPhysicalMaterial({ map: topTex, roughness: 0.25, clearcoat: 1 }), solidMat(0xffc94d, { rough: 0.2, metal: 1 })]);
top.position.y = 0.8325; top.receiveShadow = true; top.castShadow = true; table.add(top);
const trimRing = M(new THREE.TorusGeometry(0.34, 0.012, 12, 64), goldMat(), { cast: false }); trimRing.rotation.x = Math.PI / 2; trimRing.position.y = 0.85; table.add(trimRing);
const stem = M(new THREE.CylinderGeometry(0.05, 0.07, 2.4, 24), solidMat(0xffffff, { rough: 0.3, coat: 0.6 })); stem.position.y = -0.4; table.add(stem);
const baseRing = M(lathe(smooth([[0.34, 0.0], [0.3, 0.03], [0.14, 0.09], [0.07, 0.18]], 10), 48), solidMat(0xffffff, { rough: 0.3, coat: 0.6, side: THREE.DoubleSide })); table.add(baseRing);
const baseGold = M(new THREE.TorusGeometry(0.33, 0.012, 8, 48), goldMat(), { cast: false }); baseGold.rotation.x = Math.PI / 2; baseGold.position.y = 0.012; table.add(baseGold);
for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.78; const leg = M(new THREE.TorusGeometry(0.04, 0.008, 6, 12), goldMat(), { cast: false }); leg.position.set(Math.cos(a) * 0.3, 0.0, Math.sin(a) * 0.3); leg.rotation.x = Math.PI / 2; table.add(leg); }

// Doll
const doll = new Doll(); doll.position.set(0, 0.85, -0.8); ws.add(doll);
const dollAnchor = new THREE.Object3D(); dollAnchor.position.set(0, 0.3, 0); doll.add(dollAnchor);

// Toast
const toast = new Toast(ws, new THREE.Vector3(0, 1.72, -0.8));

/* ---------- Wardrobe, controls, gallery ---------- */
const getCtx = () => doll.ctx();
function dollChest(out = new THREE.Vector3()) { return dollAnchor.getWorldPosition(out); }
const CAT_COLORS = { robes: 0xff7eb6 };

const wardrobe = new Wardrobe({
  kit, doll, dollAnchor, getCtx, scene, ws, sparkles,
  onDress(item) {
    doll.equip(item); doll.bounce(); sfx.equip();
    sparkles.burst(dollChest(), 0xffd1ec, 70, 0.6); sparkles.burst(dollChest().add(new THREE.Vector3(0, 0.15, 0)), 0xfff0a8, 30, 0.4);
    wardrobe.refreshWorn();
  },
  onUndress() { sfx.remove(); sparkles.burst(dollChest(), 0xd9c7ff, 20, 0.3); wardrobe.refreshWorn(); },
  onSwatch(key, c) {
    if (key === 'skin') doll.setSkin(c); else if (key === 'eyes') doll.setEyes(c); else if (key === 'model') doll.setModel(c);
    else if (key === 'hairColor') { doll.setHairColor(c); wardrobe.rebuildTinted(); }
    sparkles.burst(dollChest().add(new THREE.Vector3(0, 0.17, 0)), 0xffd1ec, 25, 0.35); doll.bounce();
  },
});
const WD_R = { pos: [0.56, 1.2, -0.5], ry: -0.78, sc: 1 };
const WD_P = { pos: [0.5, 1.1, -0.5], ry: -0.3, sc: 0.85 }; // tablet portrait layout
const WD_L = { pos: [0, 0.5, -0.42], ry: 0, rx: -0.6, sc: 0.9 }; // phone layout: wardrobe below the doll
ws.add(wardrobe.group);
let wdRight = true, portrait = false, phone = false;
function placeWardrobe() {
  const s = wdRight ? 1 : -1, L = phone ? WD_L : portrait ? WD_P : WD_R;
  wardrobe.group.position.set(L.pos[0] * s, L.pos[1], L.pos[2]); wardrobe.group.rotation.set(L.rx || 0, L.ry * s, 0); wardrobe.group.scale.setScalar(L.sc);
}
function flipWardrobe() { wdRight = !wdRight; placeWardrobe(); }
placeWardrobe();

/* ---------- Phone / tablet support (demo mode) ---------- */
const isTouch = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
const isMobile = isTouch && Math.min(screen.width, screen.height) < 1100;
if (isMobile) {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = false; room.key.castShadow = false; // lighter rendering on phones
  document.body.classList.add('mobile');
}
function applyLayout() {
  if (renderer.xr.isPresenting) return;
  const aspect = window.innerWidth / window.innerHeight; portrait = aspect < 1.25; phone = aspect < 0.8;
  camera.aspect = aspect; const t = Math.tan((36 * Math.PI) / 180);
  gallery.layout(phone);
  if (phone) {
    camera.fov = 72;
    if (mode === 'dress') { const d = Math.max(1.5, 0.55 / (aspect * t)); camera.position.set(0, 1.75, -0.6 + d); camera.lookAt(0, 0.98, -0.55); }
    else { const d = Math.max(1.2, 0.52 / (aspect * t)); camera.position.set(0, 1.2, -0.72 + d); camera.lookAt(0, 1.2, -0.72); }
  } else if (portrait) {
    camera.fov = 72;
    const d = Math.max(1.35, Math.min(2.6, 0.82 / (aspect * t)));
    camera.position.set(0, 1.3, -0.6 + d); camera.lookAt(0, 1.15, -0.75);
  } else { camera.fov = 62; camera.position.copy(DESK_POS); camera.lookAt(DESK_LOOK); }
  camera.updateProjectionMatrix(); placeWardrobe();
}

// Doll turntable by pinching the doll
let rotGrab = null, yawTarget = 0;
interaction.add({
  obj: dollAnchor, radius: 0.28, grab: true, priority: 0.5, enabled: () => mode === 'dress',
  onGrab(h) { rotGrab = { x0: h.pinchPos.clone(), yaw0: yawTarget }; sfx.pick(); },
  onHold(h) {
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion); right.y = 0; right.normalize();
    yawTarget = rotGrab.yaw0 + h.pinchPos.clone().sub(rotGrab.x0).dot(right) * 10; doll.sway = 0;
  },
  onRelease() { rotGrab = null; },
});

// Control bar
const bar = new THREE.Group(); bar.position.set(0, 0.92, -0.27); bar.rotation.x = -1.0; ws.add(bar);
const barPanel = makePanel(0.78, 0.115, { r: 0.05, opacity: 0.85 }); bar.add(barPanel);
const BTN = [
  ['↺', '', 'Tourner', 0x9b6bff, () => { yawTarget -= 0.9; }],
  ['↻', '', 'Tourner', 0x9b6bff, () => { yawTarget += 0.9; }],
  ['🎲', '', 'Surprise', 0xffb02e, () => surprise()],
  ['🧹', '', 'Enlever', 0x4cc9c0, () => { doll.clearAll(['hair']); doll.bounce(); sfx.remove(); wardrobe.refreshWorn(); sparkles.burst(dollChest(), 0xd9c7ff, 30, 0.4); }],
  ['💾', '', 'Garder', 0xff4fa0, () => saveCreation()],
  ['🏠', '', 'Accueil', 0x6fb4ff, () => { sfx.back(); setMode('home'); }],
  ['🔊', '', 'Son', 0x7bd68a, null],
  ['↔', '', 'Côté', 0xc58bff, () => flipWardrobe()],
];
const barButtons = BTN.map(([icon, , text, color, fn], i) => {
  const b = new Button(kit, { w: 0.08, h: 0.085, color, icon, text, fs: 16, iconScale: 1.2, radius: 0.055, onPress: fn });
  b.group.position.set((i - 3.5) * 0.093, 0, 0.012); bar.add(b.group); return b;
});
const soundBtn = barButtons[6];
soundBtn.onPress = () => { sfx.setMuted(!sfx.muted); soundBtn.set({ icon: sfx.muted ? '🔇' : '🔊', text: 'Son', fs: 16, iconScale: 1.2 }); };

const gallery = new Gallery({
  kit, parent: ws,
  onOpen(entry) { loadLook(entry.look); setMode('dress'); toast.show(entry.name, 3, '✨'); },
  onDelete(entry) { store.remove(entry.id); sfx.remove(); refreshGallery(); },
  onNew() { loadLook(DEFAULT_LOOK); setMode('dress'); toast.show('Habille ta poupée ! Pince et glisse 🤏', 6, '👗'); },
});

/* ---------- Look helpers ---------- */
function loadLook(look) {
  doll.fromLook(look, BY_ID);
  if (!doll.worn.hair) doll.equip(BY_ID['hair_long.0'], true);
  yawTarget = 0; doll.yaw = 0; doll.sway = 1;
  wardrobe.refresh && wardrobe.cat !== 'perso' ? wardrobe.refresh() : wardrobe.refreshPerso();
}
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
function surprise() {
  const by = (slot) => ITEMS.filter((i) => i.slot === slot);
  doll.clearAll([]);
  doll.setHairColor(pick([0x3a2420, 0x80532f, 0xf1cf74, 0xd0602a, 0x2a2233, 0xff8fc1, 0xa77bff, 0x62c0ff]));
  const set = (slot, p = 1) => { if (Math.random() < p) { const it = pick(by(slot)); doll.equip(it, false); } };
  set('hair');
  if (Math.random() < 0.55) set('dress'); else { set('top'); set('bottom'); }
  set('shoes', 0.95); set('hat', 0.7); set('glasses', 0.4); set('necklace', 0.55); set('earrings', 0.4); set('bracelet', 0.4); set('handR', 0.45); set('handL', 0.35); set('back', 0.4); set('hairAcc', 0.3);
  wardrobe.refresh(); doll.bounce(); sfx.save();
  sparkles.burst(dollChest(), 0xffd1ec, 120, 0.9); sparkles.burst(dollChest().add(new THREE.Vector3(0, 0.2, 0)), 0xfff0a8, 60, 0.6);
}

/* ---------- Thumbnails ---------- */
const thumbScene = new THREE.Scene();
thumbScene.background = canvasTex(8, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffe8f4'); gr.addColorStop(0.6, '#ffc2de'); gr.addColorStop(1, '#e4c6ff'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
thumbScene.environment = scene.environment; thumbScene.environmentIntensity = 0.75;
thumbScene.add(new THREE.HemisphereLight(0xfff0f8, 0xffc4dd, 0.9));
const tKey = new THREE.DirectionalLight(0xfff1e2, 1.8); tKey.position.set(-1, 2.5, 2.2); thumbScene.add(tKey);
const stage = new THREE.Mesh(new THREE.CircleGeometry(0.34, 48), new THREE.MeshStandardMaterial({ color: 0xfff6fb, roughness: 0.4 })); stage.rotation.x = -Math.PI / 2; stage.position.y = -0.001; thumbScene.add(stage);
const tCam = new THREE.PerspectiveCamera(28, 0.8, 0.1, 10); tCam.position.set(0, 0.36, 1.78); tCam.lookAt(0, 0.31, 0);
const TW = 384, TH = 480;
const rt = new THREE.WebGLRenderTarget(TW * 2, TH * 2, { samples: 4 }); rt.texture.colorSpace = THREE.SRGBColorSpace;
const buf = new Uint8Array(TW * 2 * TH * 2 * 4);
const cvBig = document.createElement('canvas'); cvBig.width = TW * 2; cvBig.height = TH * 2;
const cvOut = document.createElement('canvas'); cvOut.width = TW; cvOut.height = TH;
function captureThumb() {
  const parent = doll.parent, pos = doll.position.clone(), yaw = doll.rig.rotation.y;
  doll.tweens.splice(0).forEach((tw) => tw.fn(1)); // finish pop-in animations so every item is full size
  const wasVisible = doll.visible; doll.visible = true;
  thumbScene.add(doll); doll.position.set(0, 0, 0); doll.rig.rotation.y = 0; doll.rig.position.y = 0; doll.head.rotation.set(0, 0, 0); doll.glow.visible = false;
  const wasXR = renderer.xr.enabled; renderer.xr.enabled = false;
  const sm = renderer.shadowMap.enabled; renderer.shadowMap.enabled = false;
  const prev = renderer.getRenderTarget(); renderer.setRenderTarget(rt); renderer.render(thumbScene, tCam);
  renderer.readRenderTargetPixels(rt, 0, 0, TW * 2, TH * 2, buf); renderer.setRenderTarget(prev);
  renderer.shadowMap.enabled = sm; renderer.xr.enabled = wasXR;
  parent.add(doll); doll.visible = wasVisible; doll.position.copy(pos); doll.rig.rotation.y = yaw; doll.glow.visible = true;
  const g = cvBig.getContext('2d'), img = g.createImageData(TW * 2, TH * 2), row = TW * 2 * 4;
  for (let y = 0; y < TH * 2; y++) img.data.set(buf.subarray((TH * 2 - 1 - y) * row, (TH * 2 - y) * row), y * row);
  g.putImageData(img, 0, 0);
  const o = cvOut.getContext('2d'); o.imageSmoothingQuality = 'high'; o.drawImage(cvBig, 0, 0, TW, TH);
  return cvOut.toDataURL('image/jpeg', 0.86);
}
function lookThumb(look) { const keep = doll.toLook(); doll.fromLook(look, BY_ID); const d = captureThumb(); doll.fromLook(keep, BY_ID); return d; }

/* ---------- Save / gallery ---------- */
let presetEntries = [];
function allEntries() { return [...store.list(), ...presetEntries]; }
function refreshGallery() { gallery.setItems(allEntries()); renderHtmlGallery(); }
function saveCreation() {
  const look = doll.toLook();
  const entry = { id: 'c' + Date.now(), name: randomName(), look, thumb: captureThumb(), created: Date.now() };
  const ok = store.add(entry);
  sfx.save(); sparkles.burst(dollChest().add(new THREE.Vector3(0, 0.15, 0)), 0xfff0a8, 140, 0.9);
  toast.show(ok ? `${entry.name} est dans ta galerie !` : 'Oups, impossible de sauvegarder', 4, ok ? '💖' : '⚠️');
  refreshGallery();
}

/* ---------- Modes ---------- */
let mode = 'home';
function setMode(m) {
  mode = m;
  const dress = m === 'dress';
  doll.visible = table.visible = bar.visible = wardrobe.group.visible = dress;
  gallery.group.visible = !dress;
  if (!dress) { wardrobe.flying.length = 0; refreshGallery(); }
  if (typeof applyLayout === 'function' && !renderer.xr.isPresenting) applyLayout();
}

/* ---------- HTML overlay (landing page) ---------- */
const overlay = $('#overlay');
function renderHtmlGallery() {
  const box = $('#gal'); if (!box) return;
  box.innerHTML = '';
  allEntries().slice(0, 12).forEach((e) => {
    const d = document.createElement('button'); d.className = 'card';
    d.innerHTML = `<img alt="" src="${e.thumb}"><span>${e.preset ? '💖 ' : ''}${e.name}</span>`;
    d.onclick = () => startDesktop(e);
    box.appendChild(d);
  });
}
function startDesktop(entry) {
  sfx.unlock(); music.start(); overlay.classList.add('hidden'); $('#menu').classList.remove('hidden'); $('#badge').classList.remove('hidden'); applyLayout();
  if (entry) { loadLook(entry.look); setMode('dress'); toast.show(entry.name, 3, '✨'); } else setMode('home');
}
$('#btn-desktop').onclick = () => startDesktop();
$('#menu').onclick = () => { overlay.classList.remove('hidden'); $('#menu').classList.add('hidden'); $('#badge').classList.add('hidden'); };
if (isMobile) $('#btn-desktop').textContent = '👆 Essayer la démo';

const vrBtn = $('#btn-vr');
async function setupVR() {
  if (!navigator.xr) { vrBtn.disabled = true; $('#vr-note').textContent = 'WebXR indisponible dans ce navigateur : ouvre cette page dans le navigateur de ton Meta Quest.'; return; }
  let ok = false; try { ok = await navigator.xr.isSessionSupported('immersive-vr'); } catch (e) { }
  if (!ok) { vrBtn.disabled = true; $('#vr-note').textContent = 'Casque VR non détecté. Ouvre cette page dans le navigateur Meta Quest pour jouer en réalité virtuelle.'; return; }
  vrBtn.onclick = async () => {
    sfx.unlock();
    try {
      const session = await navigator.xr.requestSession('immersive-vr', { requiredFeatures: ['local-floor'], optionalFeatures: ['hand-tracking', 'bounded-floor'] });
      await renderer.xr.setSession(session);
    } catch (e) { $('#vr-note').textContent = 'Impossible de lancer la VR : ' + e.message; }
  };
}
renderer.xr.addEventListener('sessionstart', () => { overlay.classList.add('hidden'); $('#menu').classList.add('hidden'); music.start(); needRecenter = 3; setMode('home'); toast.show('Montre tes mains et pince 🤏', 6, '✨'); });
renderer.xr.addEventListener('sessionend', () => { overlay.classList.remove('hidden'); ws.position.set(0, 0, 0); ws.rotation.y = 0; applyLayout(); });

let needRecenter = 0;
function recenter() {
  const p = new THREE.Vector3(), d = new THREE.Vector3();
  camera.getWorldPosition(p); camera.getWorldDirection(d);
  if (p.y < 0.3) return false;
  ws.position.set(p.x, Math.max(-0.75, Math.min(0.2, p.y - 1.5)), p.z);
  ws.rotation.y = Math.atan2(-d.x, -d.z);
  return true;
}

/* ---------- Loop ---------- */
window.addEventListener('resize', () => { renderer.setSize(window.innerWidth, window.innerHeight); applyLayout(); });
applyLayout();
const clock = new THREE.Clock(); let T = 0;
function frame() {
  const dt = Math.min(0.05, clock.getDelta()); T += dt;
  const xr = renderer.xr.isPresenting;
  if (xr && needRecenter > 0 && --needRecenter === 0) { if (!recenter()) needRecenter = 30; }
  baseRing.parent.position.y = 0; baseRing.position.y = -ws.position.y;
  baseGold.position.y = -ws.position.y + 0.012;
  hands.update(dt, interaction.targets, xr);
  interaction.update(hands, dt);
  kit.update(dt, T); wardrobe.update(dt, T); gallery.update(dt, T);
  doll.yaw += (yawTarget - doll.yaw) * Math.min(1, dt * 8);
  if (!rotGrab) doll.sway += (1 - doll.sway) * Math.min(1, dt * 0.4);
  doll.update(T, dt);
  room.update(T); sparkles.update(dt); ambient.update(T); toast.update(dt, camera);
  renderer.render(scene, camera);
}

/* ---------- Boot ---------- */
async function boot() {
  try { await Promise.race([document.fonts.load('700 40px Fredoka'), new Promise((r) => setTimeout(r, 1500))]); } catch (e) { }
  doll.fromLook(DEFAULT_LOOK, BY_ID);
  presetEntries = PRESETS.map((p) => ({ ...p, preset: true, thumb: lookThumb(p.look) }));
  doll.fromLook(DEFAULT_LOOK, BY_ID); wardrobe.refresh();
  setMode('home');
  renderHtmlGallery();
  await setupVR();
  $('#loading').classList.add('hidden');
  renderer.setAnimationLoop(frame);
  window.__app = { captureThumb, cvOut, tCam, ITEMS, scene, doll, camera, renderer, hands, interaction, wardrobe, gallery, setMode, loadLook, surprise, saveCreation, ws, startDesktop, THREE };
}
boot().catch((e) => { console.error(e); const l = $('#loading'); if (l) l.textContent = 'Erreur : ' + e.message; });
