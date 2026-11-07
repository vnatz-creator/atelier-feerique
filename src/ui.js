import * as THREE from 'three';
import { canvasTex, rr, hex, mix, FONT, M, solidMat } from './util.js';
import { CATEGORIES, byCat, buildPreview } from './catalog.js';
import { SKINS, HAIRS, EYES } from './doll.js';
import { sparkTex } from './fx.js';
import { sfx } from './audio.js';

/* ---------- Shared geometry ---------- */
const geoCache = new Map();
function roundedGeo(w, h, r, depth = 0.014, bevel = 0.004) {
  const k = [w, h, r, depth, bevel].join();
  let g = geoCache.get(k); if (g) return g;
  const s = new THREE.Shape(), x = -w / 2 + bevel, y = -h / 2 + bevel, ww = w - bevel * 2, hh = h - bevel * 2, rad = Math.max(0.001, Math.min(r - bevel, ww / 2, hh / 2));
  s.moveTo(x + rad, y); s.lineTo(x + ww - rad, y); s.quadraticCurveTo(x + ww, y, x + ww, y + rad); s.lineTo(x + ww, y + hh - rad); s.quadraticCurveTo(x + ww, y + hh, x + ww - rad, y + hh);
  s.lineTo(x + rad, y + hh); s.quadraticCurveTo(x, y + hh, x, y + hh - rad); s.lineTo(x, y + rad); s.quadraticCurveTo(x, y, x + rad, y);
  g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 10 });
  g.translate(0, 0, -depth / 2);
  geoCache.set(k, g); return g;
}

/* ---------- Text labels ---------- */
export class Label {
  constructor(w, h, opts = {}, ppm = 2400) {
    this.w = w; this.h = h;
    this.W = Math.min(1024, Math.round(w * ppm)); this.H = Math.max(16, Math.round(this.W * (h / w)));
    this.canvas = document.createElement('canvas'); this.canvas.width = this.W; this.canvas.height = this.H;
    this.tex = new THREE.CanvasTexture(this.canvas); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 8;
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, depthWrite: false, toneMapped: false }));
    this.set(opts);
  }
  set({ text = '', icon = '', color = '#ffffff', stroke = 'rgba(130,30,95,0.55)', fs = 0, bg = null, iconScale = 1 } = {}) {
    const g = this.canvas.getContext('2d'), W = this.W, H = this.H;
    g.clearRect(0, 0, W, H);
    if (bg) { g.fillStyle = bg; rr(g, 0, 0, W, H, H * 0.32); g.fill(); }
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    const lines = String(text).split('\n');
    const hasIcon = !!icon;
    const iconPx = hasIcon ? Math.min(H * (lines[0] ? 0.52 : 0.8), W * 0.7) * iconScale : 0;
    let size = fs ? fs * 0.001 * (this.W / this.w) : 0; // fs = text height in millimetres
    if (!size) size = Math.min(H * (hasIcon ? 0.24 : 0.5) / Math.max(1, lines.length * 0.85), H * 0.5);
    g.font = `700 ${size}px ${FONT}`;
    const widest = Math.max(...lines.map((l) => g.measureText(l).width), 1);
    if (widest > W * 0.94) size *= (W * 0.94) / widest;
    g.font = `700 ${size}px ${FONT}`;
    const totalH = (hasIcon ? iconPx * 1.0 : 0) + (text ? lines.length * size * 1.1 : 0);
    let y = (H - totalH) / 2;
    if (hasIcon) { g.font = `${iconPx * 0.85}px ${FONT}, "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji"`; g.fillStyle = '#fff'; g.fillText(icon, W / 2, y + iconPx * 0.5); y += iconPx; }
    if (text) {
      g.font = `700 ${size}px ${FONT}`; g.lineWidth = size * 0.2; g.strokeStyle = stroke; g.fillStyle = color;
      lines.forEach((l, i) => { const yy = y + size * 0.55 + i * size * 1.1; if (stroke) g.strokeText(l, W / 2, yy); g.fillText(l, W / 2, yy); });
    }
    this.tex.needsUpdate = true;
  }
}

/* ---------- Kit: shared UI services ---------- */
export class Kit {
  constructor(scene, interaction) { this.scene = scene; this.interaction = interaction; this.anims = []; this.buttons = []; }
  update(dt, t) { for (const b of this.buttons) b.update(dt, t); }
}

export class Button {
  constructor(kit, { w = 0.1, h = 0.08, color = 0xff7eb6, icon = '', text = '', fs = 0, onPress, radius, r, depth = 0.014, iconScale = 1, toggle = false } = {}) {
    this.kit = kit; this.group = new THREE.Group(); this.w = w; this.h = h; this.color = color; this.onPress = onPress;
    this.press = 0; this.s = 1; this.active = false; this.disabled = false;
    this.mat = new THREE.MeshPhysicalMaterial({ color, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.12, emissive: color, emissiveIntensity: 0.1, sheen: 0.5, sheenColor: new THREE.Color(0xffffff) });
    this.body = new THREE.Mesh(roundedGeo(w, h, r ?? Math.min(w, h) * 0.32, depth), this.mat);
    this.group.add(this.body);
    this.label = new Label(w * 0.94, h * 0.94, { icon, text, fs, iconScale, stroke: hex(mix(color, 0x5a1050, 0.55)) + 'cc' });
    this.label.mesh.position.z = depth / 2 + 0.006; this.group.add(this.label.mesh);
    this.target = kit.interaction.add({
      obj: this.group, radius: radius || Math.max(w, h) * 0.62, priority: 2, enabled: () => !this.disabled,
      onPress: () => { this.press = 1; sfx.click(); this.onPress && this.onPress(this); },
    });
    kit.buttons.push(this);
  }
  setActive(a) { this.active = a; }
  set(o) { this.label.set({ ...o, stroke: hex(mix(this.color, 0x5a1050, 0.55)) + 'cc' }); }
  update(dt) {
    const hov = this.target.hovered;
    this.press = Math.max(0, this.press - dt * 4);
    const ts = (hov ? 1.1 : 1) * (this.active ? 1.05 : 1) * (1 - this.press * 0.12);
    this.s += (ts - this.s) * Math.min(1, dt * 16);
    this.group.scale.setScalar(this.s);
    this.body.position.z = -this.press * 0.006;
    this.mat.emissiveIntensity += ((hov ? 0.35 : this.active ? 0.28 : 0.08) - this.mat.emissiveIntensity) * Math.min(1, dt * 12);
    this.label.mesh.material.opacity = this.disabled ? 0.35 : 1;
  }
  destroy() { this.kit.interaction.remove(this.target); const i = this.kit.buttons.indexOf(this); if (i >= 0) this.kit.buttons.splice(i, 1); }
}

/* ---------- Glass panel ---------- */
export function makePanel(w, h, { r = 0.05, tint = 0xffd9ec, border = 0xff9ccf, opacity = 0.82 } = {}) {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(roundedGeo(w + 0.024, h + 0.024, r + 0.012, 0.012, 0.004), new THREE.MeshPhysicalMaterial({ color: border, roughness: 0.25, metalness: 0.3, clearcoat: 1, emissive: border, emissiveIntensity: 0.12 }));
  frame.position.z = -0.012; g.add(frame);
  const glass = new THREE.Mesh(roundedGeo(w, h, r, 0.008, 0.003), new THREE.MeshPhysicalMaterial({ color: tint, roughness: 0.5, clearcoat: 0.15, envMapIntensity: 0.35, transparent: true, opacity: Math.max(opacity, 0.9), emissive: tint, emissiveIntensity: 0.12, depthWrite: true }));
  glass.position.z = -0.002; g.add(glass);
  return g;
}

/* ---------- Toast ---------- */
export class Toast {
  constructor(parent, pos) {
    this.label = new Label(0.7, 0.1, {}, 1800); this.group = new THREE.Group(); this.group.add(this.label.mesh); this.group.position.copy(pos); parent.add(this.group);
    this.t = 0; this.group.visible = false;
  }
  show(text, dur = 3, icon = '') { this.label.set({ text: (icon ? icon + ' ' : '') + text, bg: 'rgba(255,92,170,0.88)', stroke: 'rgba(120,20,80,0.6)', fs: 46 }); this.t = dur; this.group.visible = true; this.group.scale.setScalar(0.01); }
  update(dt, cam) {
    if (this.t <= 0) { this.group.visible = false; return; }
    this.t -= dt;
    const k = Math.min(1, (3 - this.t) * 6 + 0.2, this.t * 3);
    this.group.scale.setScalar(Math.max(0.01, Math.min(1, k)));
    if (cam) { const p = new THREE.Vector3(); cam.getWorldPosition(p); p.y = this.group.getWorldPosition(new THREE.Vector3()).y; this.group.lookAt(p); }
  }
}

/* ---------- Wardrobe ---------- */
const bgTex = canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(255,238,246,0.9)'); gr.addColorStop(0.7, 'rgba(236,170,208,0.75)'); gr.addColorStop(1, 'rgba(226,150,200,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
const checkTex = canvasTex(64, 64, (g) => { g.fillStyle = '#34c77b'; g.beginPath(); g.arc(32, 32, 28, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 8; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(18, 33); g.lineTo(28, 43); g.lineTo(46, 22); g.stroke(); });

export class Wardrobe {
  constructor({ kit, doll, dollAnchor, getCtx, onDress, onUndress, onSwatch, scene, ws, sparkles }) {
    this.kit = kit; this.doll = doll; this.dollAnchor = dollAnchor; this.getCtx = getCtx; this.cb = { onDress, onUndress, onSwatch };
    this.scene = scene; this.ws = ws; this.fx = sparkles;
    this.group = new THREE.Group(); this.cat = 'robes'; this.page = 0; this.flying = []; this.t = 0;
    const W = 0.62, H = 0.8; this.W = W; this.H = H;
    this.group.add(makePanel(W, H));
    // tabs
    this.tabs = CATEGORIES.map((c, i) => {
      const row = (i / 5) | 0, col = i % 5;
      const b = new Button(kit, { w: 0.108, h: 0.088, color: 0xff7eb6, icon: c.icon, text: c.label, fs: 15, iconScale: 0.95, radius: 0.058, onPress: () => this.setCategory(c.id) });
      b.group.position.set(-0.224 + col * 0.112, H / 2 - 0.062 - row * 0.1, 0.012); b.label.set({ icon: c.icon, text: c.label, fs: 16, iconScale: 1.15, stroke: 'rgba(130,30,95,0.7)' });
      this.group.add(b.group); return b;
    });
    this.title = new Label(0.5, 0.05, {}, 2000); this.title.mesh.position.set(0, H / 2 - 0.235, 0.008); this.group.add(this.title.mesh);
    // item grid
    this.grid = new THREE.Group(); this.group.add(this.grid);
    this.slots = [];
    for (let i = 0; i < 6; i++) this.slots.push(this._makeSlot(i));
    this.prev = new Button(kit, { w: 0.1, h: 0.062, color: 0x9b6bff, text: '‹', fs: 60, radius: 0.06, onPress: () => this.turn(-1) });
    this.next = new Button(kit, { w: 0.1, h: 0.062, color: 0x9b6bff, text: '›', fs: 60, radius: 0.06, onPress: () => this.turn(1) });
    this.prev.group.position.set(-0.2, -H / 2 + 0.05, 0.012); this.next.group.position.set(0.2, -H / 2 + 0.05, 0.012);
    this.pageLabel = new Label(0.2, 0.05, {}, 2000); this.pageLabel.mesh.position.set(0, -H / 2 + 0.05, 0.008);
    this.grid.add(this.prev.group, this.next.group, this.pageLabel.mesh);
    this._makePerso();
    this.setCategory('robes');
  }

  _makeSlot(i) {
    const col = i % 3, row = (i / 3) | 0, g = new THREE.Group();
    g.position.set((col - 1) * 0.185, 0.02 - row * 0.2, 0.05);
    const glass = new THREE.Mesh(new THREE.SphereGeometry(0.078, 32, 22), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.03, clearcoat: 1, transparent: true, opacity: 0.16, depthWrite: false, envMapIntensity: 1.6 }));
    const back = new THREE.Mesh(new THREE.CircleGeometry(0.074, 32), new THREE.MeshBasicMaterial({ map: bgTex, transparent: true, depthWrite: false, toneMapped: false })); back.position.z = -0.045;
    const holder = new THREE.Group();
    const label = new Label(0.19, 0.056, {}, 2200); label.mesh.position.set(0, -0.108, 0.03);
    const check = new THREE.Sprite(new THREE.SpriteMaterial({ map: checkTex, depthTest: false })); check.scale.setScalar(0.03); check.position.set(0.06, 0.06, 0.07); check.renderOrder = 10; check.visible = false;
    g.add(back, holder, glass, label.mesh, check); this.grid.add(g);
    const slot = { g, holder, label, check, glass, item: null, model: null, hov: 0 };
    slot.target = this.kit.interaction.add({
      obj: g, radius: 0.09, grab: true, priority: 3, enabled: () => !!slot.item,
      onGrab: (h) => this._grab(slot, h),
      onHold: (h, dt) => this._hold(slot, h, dt),
      onRelease: (h) => this._release(slot, h),
    });
    return slot;
  }

  _makePerso() {
    const g = new THREE.Group(), H = this.H; this.perso = g; this.group.add(g);
    this.swatches = [];
    const rows = [
      { key: 'skin', label: 'Peau', list: SKINS, y: 0.06, d: 0.056 },
      { key: 'hairColor', label: 'Cheveux', list: HAIRS, y: -0.055, d: 0.05 },
      { key: 'eyes', label: 'Yeux', list: EYES, y: -0.17, d: 0.056 },
    ];
    for (const r of rows) {
      const lab = new Label(0.3, 0.036, { text: r.label, fs: 26, color: '#d6338a', stroke: 'rgba(255,255,255,0.9)' }, 1600); lab.mesh.position.set(0, r.y + 0.048, 0.01); g.add(lab.mesh);
      r.list.forEach((c, i) => {
        const x = (i - (r.list.length - 1) / 2) * (r.d + 0.006);
        const m = new THREE.Mesh(new THREE.CylinderGeometry(r.d / 2 - 0.002, r.d / 2 - 0.002, 0.014, 28), new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.2, clearcoat: 1 }));
        m.rotation.x = Math.PI / 2;
        const ring = new THREE.Mesh(new THREE.TorusGeometry(r.d / 2 + 0.003, 0.0035, 8, 32), solidMat(0xffc94d, { rough: 0.2, metal: 1 })); ring.visible = false;
        const sw = new THREE.Group(); sw.add(m, ring); sw.position.set(x, r.y, 0.03); g.add(sw);
        const t = this.kit.interaction.add({ obj: sw, radius: r.d * 0.7, priority: 2, onPress: () => { sfx.click(); this.cb.onSwatch(r.key, c); this.refreshPerso(); } });
        this.swatches.push({ key: r.key, c, ring, sw, t });
      });
    }
    this.models = [['fille', '🎀', 'Fille'], ['princesse', '👑', 'Princesse'], ['garcon', '⚽', 'Garçon']].map(([id, icon, name], i) => {
      const b = new Button(this.kit, { w: 0.17, h: 0.09, color: 0x9b6bff, icon, text: name, fs: 20, radius: 0.08, onPress: () => { this.cb.onSwatch('model', id); this.refreshPerso(); } });
      b.id = id; b.group.position.set((i - 1) * 0.185, -0.31, 0.02); g.add(b.group); return b;
    });
    const lab = new Label(0.3, 0.036, { text: 'Style', fs: 26, color: '#d6338a', stroke: 'rgba(255,255,255,0.9)' }, 1600); lab.mesh.position.set(0, -0.242, 0.01); g.add(lab.mesh);
  }
  refreshPerso() {
    const s = this.doll.state;
    for (const w of this.swatches) w.ring.visible = s[w.key] === w.c;
    for (const m of this.models) m.setActive(s.model === m.id);
  }

  setCategory(id) {
    this.cat = id; this.page = 0; sfx.pick();
    const c = CATEGORIES.find((x) => x.id === id);
    this.tabs.forEach((b, i) => b.setActive(CATEGORIES[i].id === id));
    this.title.set({ text: c.icon + '  ' + c.label, fs: 38, color: '#d6338a', stroke: 'rgba(255,255,255,0.95)' });
    const isPerso = id === 'perso';
    this.grid.visible = !isPerso; this.perso.visible = isPerso;
    if (isPerso) this.refreshPerso(); else this.refresh();
  }
  turn(d) { const n = Math.max(1, Math.ceil(this.list.length / 6)); this.page = (this.page + d + n) % n; this.refresh(); }
  refresh() {
    this.list = byCat(this.cat);
    const n = Math.max(1, Math.ceil(this.list.length / 6));
    this.pageLabel.set({ text: `${this.page + 1} / ${n}`, fs: 30, color: '#d6338a', stroke: 'rgba(255,255,255,0.95)' });
    const ctx = this.getCtx();
    this.slots.forEach((s, i) => {
      const item = this.list[this.page * 6 + i];
      if (s.model) { s.holder.remove(s.model); s.model = null; }
      s.item = item || null; s.g.visible = !!item;
      if (!item) return;
      s.model = buildPreview(item, ctx, 0.108); s.holder.add(s.model);
      const v = item.name.slice(item.design.length).trim();
      s.label.set({ text: v ? `${item.design}\n${v}` : item.design, fs: 19, color: '#ffffff', stroke: 'rgba(200,40,130,0.9)' });
    });
    this.refreshWorn();
  }
  refreshWorn() { for (const s of this.slots) s.check.visible = !!(s.item && this.doll.isWorn(s.item.id)); }
  rebuildTinted() { // hair colour changed
    if (this.cat === 'perso') return;
    if (this.list && this.list.some((i) => i.hairTint)) this.refresh();
  }

  _grab(slot, h) {
    sfx.pick();
    const ctx = this.getCtx();
    const model = buildPreview(slot.item, ctx, 0.15);
    this.scene.add(model);
    model.position.copy(h.pinchPos); model.scale.setScalar(0.01);
    slot.held = { model, s: 0.01, start: performance.now(), startPos: h.pinchPos.clone(), travel: 0 };
    slot.holder.visible = false;
  }
  _hold(slot, h, dt) {
    const k = slot.held; if (!k) return;
    k.s += (1 - k.s) * Math.min(1, dt * 14); k.model.scale.setScalar(k.s);
    k.model.position.lerp(h.pinchPos, Math.min(1, dt * 30));
    k.model.rotation.y += dt * 1.5;
    k.travel = Math.max(k.travel, h.pinchPos.distanceTo(k.startPos));
    const near = this._nearDoll(k.model.position);
    this.doll.setGlow(near);
    if (Math.random() < 0.5) this.fx.trail(k.model.position, 0xffd1ec);
  }
  _nearDoll(p) { const c = new THREE.Vector3(); this.dollAnchor.getWorldPosition(c); return p.distanceTo(c) < 0.34; }
  _release(slot, h) {
    const k = slot.held; if (!k) return; slot.held = null; this.doll.setGlow(false);
    const near = this._nearDoll(k.model.position), tap = performance.now() - k.start < 500 && k.travel < 0.05;
    const item = slot.item;
    if (near || tap) {
      if (tap && !near && this.doll.isWorn(item.id)) { this.doll.unequip(item.slot); this.cb.onUndress(item); }
      else if (!(tap && !near && item.slot === 'hair' && this.doll.isWorn(item.id))) this.cb.onDress(item);
      this.refreshWorn();
      this.flying.push({ model: k.model, from: k.model.position.clone(), to: null, t: 0, dur: 0.25, die: true, slot });
    } else this.flying.push({ model: k.model, from: k.model.position.clone(), slot, t: 0, dur: 0.3 });
  }
  update(dt, t) {
    this.t = t;
    for (const s of this.slots) {
      if (!s.g.visible) continue;
      const hov = s.target.hovered; s.hov += ((hov || s.held ? 1 : 0) - s.hov) * Math.min(1, dt * 12);
      s.g.scale.setScalar(1 + s.hov * 0.1);
      s.holder.rotation.y = t * 0.6 + s.g.position.x * 10; s.holder.position.y = Math.sin(t * 1.5 + s.g.position.x * 20) * 0.003;
      s.glass.material.opacity = 0.16 + s.hov * 0.14;
    }
    for (let i = this.flying.length - 1; i >= 0; i--) {
      const f = this.flying[i]; f.t += dt; const k = Math.min(1, f.t / f.dur), e = 1 - Math.pow(1 - k, 3);
      if (f.die) { f.model.scale.setScalar(Math.max(0.01, 1 - e)); const c = new THREE.Vector3(); this.dollAnchor.getWorldPosition(c); f.model.position.lerpVectors(f.from, c, e); }
      else { const to = new THREE.Vector3(); f.slot.g.getWorldPosition(to); f.model.position.lerpVectors(f.from, to, e); f.model.scale.setScalar(Math.max(0.01, 1 - e * 0.9)); }
      if (k >= 1) { this.scene.remove(f.model); f.model.traverse((o) => o.geometry && o.geometry.dispose()); f.slot.holder.visible = true; this.flying.splice(i, 1); }
    }
  }
}

/* ---------- Gallery (home) ---------- */
const texLoader = new THREE.TextureLoader();
export class Gallery {
  constructor({ kit, parent, onOpen, onDelete, onNew, onMode, onResume }) {
    this.kit = kit; this.onOpen = onOpen; this.onDelete = onDelete; this.page = 0; this.items = []; this.perPage = 8; this.narrow = false; this.mode = 'creations';
    this.group = new THREE.Group(); parent.add(this.group);
    const R = 0.72; this.R = R;
    // soft curved backdrop
    const back = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.07, R + 0.07, 1.02, 64, 1, true, Math.PI - 0.95, 1.9), new THREE.MeshPhysicalMaterial({ color: 0xffe3f1, transparent: true, opacity: 0.55, side: THREE.BackSide, roughness: 0.3, clearcoat: 1, emissive: 0xffc4e0, emissiveIntensity: 0.25, depthWrite: false }));
    back.position.y = 1.18; back.rotation.y = Math.PI; this.group.add(back);
    // title
    this.title = new Label(0.95, 0.2, { text: '✨ Atelier Féerique ✨', fs: 110, color: '#ffffff', stroke: 'rgba(214,51,138,0.95)' }, 1400);
    this.title.mesh.position.set(0, 1.84, -R + 0.01); this.group.add(this.title.mesh);
    this.sub = new Label(0.7, 0.07, { text: 'Mes créations · pince 🤏 pour choisir', fs: 40, color: '#ffffff', stroke: 'rgba(214,51,138,0.85)' }, 1600);
    this.sub.mesh.position.set(0, 1.71, -R + 0.01); this.group.add(this.sub.mesh);
    this.frames = [];
    for (let i = 0; i < 8; i++) this.frames.push(this._frame(i));
    this.prev = new Button(kit, { w: 0.09, h: 0.09, color: 0x9b6bff, text: '‹', fs: 70, radius: 0.06, onPress: () => this.turn(-1) });
    this.next = new Button(kit, { w: 0.09, h: 0.09, color: 0x9b6bff, text: '›', fs: 70, radius: 0.06, onPress: () => this.turn(1) });
    const place = (b, a, y) => { b.group.position.set(Math.sin(a) * R, y, -Math.cos(a) * R); b.group.rotation.y = -a; this.group.add(b.group); };
    place(this.prev, -0.93, 1.18); place(this.next, 0.93, 1.18);
    this.newBtn = new Button(kit, { w: 0.5, h: 0.13, color: 0xff3d97, icon: '', text: '✨ Nouvelle création', fs: 40, radius: 0.15, onPress: onNew });
    place(this.newBtn, 0, 0.64);
    // switch between creations and photos
    this.toggle = new Button(kit, { w: 0.32, h: 0.1, color: 0x9b6bff, text: '📷 Mes photos', fs: 30, radius: 0.12, onPress: () => {
      this.mode = this.mode === 'photos' ? 'creations' : 'photos'; this.page = 0; this.closeBig(); this.updateTexts(); onMode && onMode(this.mode);
    } });
    place(this.toggle, 0.75, 0.64);
    this.resume = new Button(kit, { w: 0.32, h: 0.1, color: 0x4cc9c0, text: '▶ Reprendre', fs: 30, radius: 0.12, onPress: onResume });
    place(this.resume, -0.75, 0.64);
    // enlarged photo viewer
    this.big = new THREE.Group(); this.big.position.set(0, 1.18, -0.5); this.big.visible = false; this.group.add(this.big);
    const bf = new THREE.Mesh(roundedGeo(0.56, 0.7, 0.04, 0.02, 0.006), new THREE.MeshPhysicalMaterial({ color: 0xffc94d, metalness: 1, roughness: 0.22 }));
    this.bigPic = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.625), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })); this.bigPic.position.set(0, 0, 0.03);
    const bl = new Label(0.4, 0.05, { text: 'Touche pour fermer', fs: 22, color: '#fff', stroke: 'rgba(214,51,138,0.9)' }, 1600); bl.mesh.position.set(0, -0.315, 0.035);
    this.big.add(bf, this.bigPic, bl.mesh);
    this.bigTarget = kit.interaction.add({ obj: this.big, radius: 0.3, priority: 6, enabled: () => this.big.visible, onPress: () => { sfx.back(); this.closeBig(); } });
  }
  updateTexts() {
    const p = this.mode === 'photos';
    this.sub.set({ text: p ? 'Mes photos · touche pour agrandir' : 'Mes créations · pince 🤏 pour choisir', fs: 40, color: '#ffffff', stroke: 'rgba(214,51,138,0.85)' });
    this.toggle.set({ text: p ? '💖 Mes créations' : '📷 Mes photos', fs: 30 });
    this.newBtn.group.visible = this.resume.group.visible = !p;
  }
  showBig(entry) {
    sfx.pick(); const tex = texLoader.load(entry.thumb); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    this.bigPic.material.map = tex; this.bigPic.material.needsUpdate = true; this.big.visible = true;
  }
  closeBig() { this.big.visible = false; }
  _frame(i) {
    const col = i % 4, row = (i / 4) | 0, a = (col - 1.5) * 0.36, y = 1.4 - row * 0.4, R = this.R;
    const g = new THREE.Group(); g.position.set(Math.sin(a) * R, y, -Math.cos(a) * R); g.rotation.y = -a;
    const fw = 0.22, fh = 0.3;
    const fr = new THREE.Mesh(roundedGeo(fw + 0.02, fh + 0.02, 0.035, 0.016, 0.005), new THREE.MeshPhysicalMaterial({ color: 0xffc94d, metalness: 1, roughness: 0.22, clearcoat: 0.6 }));
    const inner = new THREE.Mesh(roundedGeo(fw - 0.008, fh - 0.008, 0.03, 0.01, 0.002), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.4 })); inner.position.z = 0.014;
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(fw - 0.02, (fw - 0.02) * 1.25), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })); pic.position.set(0, 0.018, 0.026);
    const name = new Label(fw - 0.02, 0.036, {}, 2400); name.mesh.position.set(0, -fh / 2 + 0.03, 0.027);
    const badge = new Label(0.04, 0.04, { text: '💖', fs: 30 }, 1500); badge.mesh.position.set(-fw / 2 + 0.025, fh / 2 - 0.025, 0.032);
    g.add(fr, inner, pic, name.mesh, badge.mesh); this.group.add(g);
    const del = new Button(this.kit, { w: 0.045, h: 0.045, color: 0xff6b8b, text: '✕', fs: 40, radius: 0.04, depth: 0.01, onPress: () => this.onDelete(f.entry) });
    del.group.position.set(fw / 2 - 0.012, fh / 2 - 0.012, 0.04); g.add(del.group);
    const f = { g, pic, name, badge, del, entry: null, s: 1 };
    f.target = this.kit.interaction.add({ obj: g, radius: 0.13, priority: 1, enabled: () => !!f.entry, onPress: () => { if (f.entry.photo) this.showBig(f.entry); else { sfx.equip(); this.onOpen(f.entry); } } });
    return f;
  }
  /** Phone portrait: 2 columns x 3 rows instead of 4 x 2. */
  layout(narrow) {
    if (this.narrow === narrow) return; this.narrow = narrow;
    this.perPage = narrow ? 6 : 8; const cols = narrow ? 2 : 4, R = this.R;
    this.frames.forEach((f, i) => {
      const col = i % cols, row = (i / cols) | 0, a = (col - (cols - 1) / 2) * 0.36;
      f.g.position.set(Math.sin(a) * R, (narrow ? 1.45 : 1.4) - row * 0.4, -Math.cos(a) * R); f.g.rotation.y = -a;
    });
    const place = (b, a, y) => { b.group.position.set(Math.sin(a) * R, y, -Math.cos(a) * R); b.group.rotation.y = -a; };
    place(this.prev, narrow ? -0.62 : -0.93, narrow ? 1.05 : 1.18); place(this.next, narrow ? 0.62 : 0.93, narrow ? 1.05 : 1.18); place(this.newBtn, 0, narrow ? 0.4 : 0.64); place(this.toggle, narrow ? 0 : 0.75, narrow ? 0.22 : 0.64); place(this.resume, narrow ? 0 : -0.75, narrow ? 0.04 : 0.64);
    this.refresh();
  }
  setItems(items) { this.items = items; this.page = Math.min(this.page, Math.max(0, Math.ceil(items.length / this.perPage) - 1)); this.refresh(); }
  turn(d) { const n = Math.max(1, Math.ceil(this.items.length / this.perPage)); this.page = (this.page + d + n) % n; this.refresh(); }
  refresh() {
    this.frames.forEach((f, i) => {
      const e = i < this.perPage ? this.items[this.page * this.perPage + i] : undefined; f.entry = e || null; f.g.visible = !!e;
      if (!e) return;
      f.name.set({ text: e.name, fs: 24, color: '#d6338a', stroke: 'rgba(255,255,255,0.95)' });
      f.badge.mesh.visible = !!e.preset; f.del.group.visible = !e.preset; f.del.disabled = !!e.preset;
      if (f.pic.material.map) f.pic.material.map = null;
      const tex = texLoader.load(e.thumb, (t) => { t.colorSpace = THREE.SRGBColorSpace; f.pic.material.needsUpdate = true; });
      tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; f.pic.material.map = tex; f.pic.material.needsUpdate = true;
    });
    const many = this.items.length > this.perPage; this.prev.group.visible = this.next.group.visible = many;
  }
  update(dt, t) { for (const f of this.frames) { if (!f.g.visible) continue; f.s += ((f.target.hovered ? 1.08 : 1) - f.s) * Math.min(1, dt * 12); f.g.scale.setScalar(f.s); f.g.position.y += 0; } }
}
