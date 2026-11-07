import * as THREE from 'three';
import { canvasTex, M, sph, lathe, smooth, TORSO, shell, LEG_X, disposeTree, solidMat, hex, mix } from './util.js';

export const HEAD_Y = 0.47;
export const HEAD_SCALE = [1, 0.96, 0.98];
/** Where each mount point lives relative to the doll root (used by previews too). */
export const MOUNTS = {
  root: { pos: [0, 0, 0] },
  head: { pos: [0, HEAD_Y, 0] },
  headShape: { pos: [0, HEAD_Y, 0], scale: HEAD_SCALE },
  armL: { pos: [-0.062, 0.322, 0], rotZ: -0.28 },
  armR: { pos: [0.062, 0.322, 0], rotZ: 0.28 },
};
const CONFLICTS = { dress: ['top', 'bottom'], top: ['dress'], bottom: ['dress'] };

export const SKINS = [0xfde3d5, 0xf6cdb8, 0xe9b794, 0xc98e65, 0x946041, 0x62402e];
export const HAIRS = [0x3a2420, 0x80532f, 0xf1cf74, 0xd0602a, 0x2a2233, 0xff8fc1, 0xa77bff, 0x62c0ff, 0xf2f0fa];
export const EYES = [0x6b3f2a, 0x3f9dff, 0x35b374, 0x9b6bff, 0xd98a2b, 0xff6fae];

const FW = 1024, FH = 784;
function drawFace(g, { model, eye, brow, blink }) {
  g.clearRect(0, 0, FW, FH);
  const girl = model !== 'garcon', princess = model === 'princesse';
  // blush
  for (const sx of [-1, 1]) {
    const x = 512 + sx * 300, y = 540;
    const gr = g.createRadialGradient(x, y, 0, x, y, 100);
    gr.addColorStop(0, girl ? 'rgba(255,110,150,0.6)' : 'rgba(255,130,140,0.4)'); gr.addColorStop(1, 'rgba(255,110,150,0)');
    g.fillStyle = gr; g.fillRect(x - 110, y - 110, 220, 220);
  }
  // brows
  g.strokeStyle = hex(mix(brow, 0x000000, 0.1)); g.lineCap = 'round'; g.lineWidth = girl ? 11 : 17;
  for (const sx of [-1, 1]) {
    const x = 512 + sx * 195;
    g.beginPath(); g.moveTo(x - 70, 300 + (sx > 0 ? 0 : 0)); g.quadraticCurveTo(x, 262, x + 70, 305); g.stroke();
  }
  // eyes
  for (const sx of [-1, 1]) {
    const ex = 512 + sx * 195, ey = 440;
    if (!blink) {
      g.save(); g.beginPath(); g.ellipse(ex, ey, 82, 104, 0, 0, 7); g.clip();
      const ir = g.createRadialGradient(ex, ey + 30, 5, ex, ey, 108);
      ir.addColorStop(0, hex(mix(eye, 0xffffff, 0.55))); ir.addColorStop(0.55, hex(eye)); ir.addColorStop(1, hex(mix(eye, 0x120818, 0.65)));
      g.fillStyle = ir; g.fillRect(ex - 90, ey - 110, 180, 220);
      const sh = g.createLinearGradient(0, ey - 104, 0, ey);
      sh.addColorStop(0, 'rgba(15,5,25,0.85)'); sh.addColorStop(1, 'rgba(15,5,25,0)');
      g.fillStyle = sh; g.fillRect(ex - 90, ey - 110, 180, 120);
      g.fillStyle = '#1b0f26'; g.beginPath(); g.ellipse(ex, ey + 6, 38, 52, 0, 0, 7); g.fill();
      // rim light
      g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 7; g.beginPath(); g.ellipse(ex, ey, 66, 88, 0, 0.35, 2.8); g.stroke();
      g.restore();
      g.fillStyle = '#fff';
      if (princess) { // star-shaped glint
        g.save(); g.translate(ex - 24, ey - 38); g.beginPath();
        for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 9 : 24; g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); }
        g.closePath(); g.fill(); g.restore();
      } else { g.beginPath(); g.arc(ex - 24, ey - 38, 23, 0, 7); g.fill(); }
      g.beginPath(); g.arc(ex + 28, ey + 36, 11, 0, 7); g.fill();
      g.beginPath(); g.arc(ex + 4, ey + 62, 5, 0, 7); g.fill();
      // upper lid line
      g.strokeStyle = '#24122e'; g.lineWidth = girl ? 15 : 10;
      g.beginPath(); g.ellipse(ex, ey, 84, 106, 0, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
      if (girl) { // lash flick on outer corner
        g.lineWidth = 11;
        const ox = ex + sx * 82, oy = ey - 38;
        g.beginPath(); g.moveTo(ox, oy); g.quadraticCurveTo(ox + sx * 26, oy - 8, ox + sx * 38, oy - 34); g.stroke();
        if (princess) { g.lineWidth = 7; g.beginPath(); g.moveTo(ox - sx * 4, oy + 22); g.quadraticCurveTo(ox + sx * 24, oy + 16, ox + sx * 34, oy - 4); g.stroke(); }
      }
    } else {
      g.strokeStyle = '#24122e'; g.lineWidth = 14; g.lineCap = 'round';
      g.beginPath(); g.moveTo(ex - 72, ey + 4); g.quadraticCurveTo(ex, ey + 56, ex + 72, ey + 4); g.stroke();
      if (girl) { g.lineWidth = 9; g.beginPath(); g.moveTo(ex + sx * 70, ey + 8); g.quadraticCurveTo(ex + sx * 92, ey + 4, ex + sx * 104, ey - 18); g.stroke(); }
    }
  }
  // nose
  g.strokeStyle = 'rgba(190,90,100,0.55)'; g.lineWidth = 6;
  g.beginPath(); g.moveTo(498, 548); g.quadraticCurveTo(512, 560, 526, 548); g.stroke();
  // happy open mouth
  g.beginPath(); g.moveTo(452, 598); g.quadraticCurveTo(512, 612, 572, 598); g.quadraticCurveTo(560, 668, 512, 670); g.quadraticCurveTo(464, 668, 452, 598); g.closePath();
  g.fillStyle = '#c93e5c'; g.fill();
  g.save(); g.clip(); g.fillStyle = '#ff8aa0'; g.beginPath(); g.ellipse(512, 672, 40, 26, 0, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.fillRect(440, 590, 150, 15); g.restore();
  g.strokeStyle = '#a82f4b'; g.lineWidth = 7; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(452, 598); g.quadraticCurveTo(512, 612, 572, 598); g.stroke();
}

export class Doll extends THREE.Group {
  constructor() {
    super();
    this.state = { model: 'fille', skin: SKINS[1], hairColor: HAIRS[1], eyes: EYES[1] };
    this.worn = {};
    this.tweens = [];
    this.yaw = 0; this.sway = 1; this.blinkT = 2;
    this.rig = new THREE.Group(); this.add(this.rig);
    this.skinMat = new THREE.MeshPhysicalMaterial({ color: this.state.skin, roughness: 0.5, sheen: 0.6, sheenColor: new THREE.Color(0xffb0b0), sheenRoughness: 0.5, clearcoat: 0.08 });
    const skin = this.skinMat;

    // torso, neck
    this.torso = new THREE.Group(); this.rig.add(this.torso);
    this.torso.add(M(lathe(TORSO, 48), skin));
    const neck = M(new THREE.CylinderGeometry(0.02, 0.022, 0.06, 20), skin); neck.position.y = 0.355; this.torso.add(neck);
    // legs & feet
    for (const sx of [-1, 1]) {
      const leg = M(lathe([[0.0, 0.04], [0.0175, 0.045], [0.0185, 0.1], [0.022, 0.16], [0.0255, 0.215], [0.0, 0.22]], 24), skin);
      leg.position.x = sx * LEG_X; this.rig.add(leg);
      const foot = sph(0.022, skin, 1, 0.75, 1.9); foot.position.set(sx * LEG_X, 0.02, 0.012); this.rig.add(foot);
    }
    // arms
    this.arms = {};
    for (const [name, sx] of [['armL', -1], ['armR', 1]]) {
      const g = new THREE.Group(); const mt = MOUNTS[name];
      g.position.set(...mt.pos); g.rotation.z = mt.rotZ;
      g.add(M(lathe([[0.0125, -0.17], [0.0135, -0.15], [0.0155, -0.08], [0.017, 0]], 20), skin));
      g.add(sph(0.018, skin));
      const hand = sph(0.0195, skin, 1, 1.1, 0.85); hand.position.y = -0.165; g.add(hand);
      this.rig.add(g); this.arms[name] = g;
    }
    // base underwear (hidden when clothes are worn)
    const under = solidMat(0xfff3f8, { rough: 0.7, side: THREE.DoubleSide });
    this.baseTop = M(lathe(shell(0.212, 0.318, 0.0025, 8), 40), under);
    this.baseBottom = new THREE.Group();
    this.baseBottom.add(M(lathe(shell(0.205, 0.25, 0.0025, 4), 40), under));
    for (const sx of [-1, 1]) { const s = M(new THREE.CylinderGeometry(0.0275, 0.0275, 0.04, 20, 1, true), under); s.position.set(sx * LEG_X, 0.205, 0); this.baseBottom.add(s); }
    this.rig.add(this.baseTop, this.baseBottom);

    // head
    this.head = new THREE.Group(); this.head.position.set(...MOUNTS.head.pos); this.rig.add(this.head);
    this.headShape = new THREE.Group(); this.headShape.scale.set(...HEAD_SCALE); this.head.add(this.headShape);
    this.headShape.add(M(new THREE.SphereGeometry(0.105, 64, 48), skin));
    for (const sx of [-1, 1]) { const e = sph(0.015, skin, 0.5, 1, 1); e.position.set(sx * 0.103, -0.004, 0); this.headShape.add(e); }
    this.faceOpen = new THREE.CanvasTexture(document.createElement('canvas'));
    this.faceShut = new THREE.CanvasTexture(document.createElement('canvas'));
    for (const t of [this.faceOpen, this.faceShut]) { t.image.width = FW; t.image.height = FH; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; }
    this.faceMat = new THREE.MeshStandardMaterial({ map: this.faceOpen, transparent: true, roughness: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const L = 1.7, TL = 1.3;
    this.face = new THREE.Mesh(new THREE.SphereGeometry(0.1058, 64, 48, Math.PI / 2 - L / 2, L, 0.9, TL), this.faceMat);
    this.headShape.add(this.face);
    this.redrawFace();

    // table glow ring (drop zone hint)
    this.glow = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.27, 64), new THREE.MeshBasicMaterial({ color: 0xffb0e0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    this.glow.rotation.x = -Math.PI / 2; this.glow.position.y = 0.004; this.add(this.glow);
    this.rig.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    this.mounts = { root: this.rig, head: this.head, headShape: this.headShape, armL: this.arms.armL, armR: this.arms.armR };
    this.updateBase();
  }

  redrawFace() {
    const s = this.state, brow = s.hairColor;
    drawFace(this.faceOpen.image.getContext('2d'), { model: s.model, eye: s.eyes, brow, blink: false });
    drawFace(this.faceShut.image.getContext('2d'), { model: s.model, eye: s.eyes, brow, blink: true });
    this.faceOpen.needsUpdate = this.faceShut.needsUpdate = true;
  }
  setSkin(c) { this.state.skin = c; this.skinMat.color.set(c); }
  setEyes(c) { this.state.eyes = c; this.redrawFace(); }
  setModel(m) { this.state.model = m; this.redrawFace(); }
  setHairColor(c, ctx) {
    this.state.hairColor = c; this.redrawFace();
    // rebuild anything tinted with the hair colour
    for (const slot of Object.keys(this.worn)) { const w = this.worn[slot]; if (w.item.hairTint) this.equip(w.item, true); }
  }
  updateBase() { const w = this.worn; this.baseTop.visible = !(w.top || w.dress); this.baseBottom.visible = !(w.bottom || w.dress); }

  ctx() { return { hairColor: this.state.hairColor }; }

  /** Equip an item; returns slots that were replaced/removed. */
  equip(item, silent = false) {
    const removed = [];
    const slot = item.slot;
    if (this.worn[slot]) { this._strip(slot); removed.push(slot); }
    for (const c of CONFLICTS[slot] || []) if (this.worn[c]) { this._strip(c); removed.push(c); }
    const parts = item.build(this.ctx());
    const placed = [];
    for (const p of parts) {
      const holder = new THREE.Group(); holder.add(p.obj);
      (this.mounts[p.parent] || this.rig).add(holder);
      p.obj.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      placed.push(holder);
      if (!silent) this.pop(holder);
    }
    this.worn[slot] = { item, placed };
    this.updateBase();
    return removed;
  }
  _strip(slot) {
    const w = this.worn[slot]; if (!w) return;
    for (const h of w.placed) { h.parent && h.parent.remove(h); disposeTree(h); }
    delete this.worn[slot];
  }
  unequip(slot) { if (this.worn[slot]) { this._strip(slot); this.updateBase(); return true; } return false; }
  clearAll(keep = ['hair']) { for (const s of Object.keys(this.worn)) if (!keep.includes(s)) this._strip(s); this.updateBase(); }
  isWorn(id) { return Object.values(this.worn).some((w) => w.item.id === id); }

  pop(obj) {
    obj.scale.setScalar(0.01);
    this.tweens.push({ t: 0, dur: 0.5, fn: (k) => { const e = 1 + Math.sin(k * Math.PI * 1.5) * 0.14 * (1 - k); obj.scale.setScalar(Math.max(0.01, Math.min(1.0, k * 3) * e)); } });
  }
  bounce() { this.tweens.push({ t: 0, dur: 0.5, fn: (k) => { this.rig.position.y = Math.sin(k * Math.PI) * 0.025 * (1 - k); } }); }

  toLook() {
    const items = {}; for (const [s, w] of Object.entries(this.worn)) items[s] = w.item.id;
    return { ...this.state, items };
  }
  fromLook(look, byId) {
    this.clearAll([]);
    this.state = { model: look.model || 'fille', skin: look.skin, hairColor: look.hairColor, eyes: look.eyes };
    this.skinMat.color.set(this.state.skin); this.redrawFace();
    for (const id of Object.values(look.items || {})) { const it = byId[id]; if (it) this.equip(it, true); }
    this.updateBase();
  }

  update(t, dt) {
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const tw = this.tweens[i]; tw.t += dt; const k = Math.min(1, tw.t / tw.dur); tw.fn(k);
      if (k >= 1) this.tweens.splice(i, 1);
    }
    this.rig.rotation.y = this.yaw + Math.sin(t * 0.45) * 0.12 * this.sway;
    this.torso.scale.set(1 + Math.sin(t * 1.8) * 0.004, 1 + Math.sin(t * 1.8) * 0.006, 1);
    this.head.rotation.z = Math.sin(t * 0.7) * 0.035; this.head.rotation.y = Math.sin(t * 0.5 + 1) * 0.07; this.head.rotation.x = Math.sin(t * 0.9) * 0.015;
    this.arms.armL.rotation.z = MOUNTS.armL.rotZ - Math.sin(t * 1.1) * 0.03;
    this.arms.armR.rotation.z = MOUNTS.armR.rotZ + Math.sin(t * 1.1 + 1) * 0.03;
    this.blinkT -= dt;
    if (this.blinkT < 0) { this.faceMat.map = this.faceShut; if (this.blinkT < -0.13) { this.faceMat.map = this.faceOpen; this.blinkT = 2 + Math.random() * 3; } }
    this.glow.material.opacity += ((this.glowTarget || 0) * (0.55 + Math.sin(t * 6) * 0.2) - this.glow.material.opacity) * Math.min(1, dt * 10);
  }
  setGlow(v) { this.glowTarget = v ? 1 : 0; }
}
