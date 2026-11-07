import * as THREE from 'three';
import { canvasTex } from './util.js';

export const BACKGROUNDS = [
  { id: 'room', name: 'Chambre', icon: '🏠' },
  { id: 'garden', name: 'Jardin', icon: '🌳' },
  { id: 'night', name: 'Étoiles', icon: '🌙' },
  { id: 'beach', name: 'Plage', icon: '🏖️' },
  { id: 'castle', name: 'Château', icon: '🏰' },
];

const W = 2048, H = 1024, HZ = H * 0.56; // equirectangular canvas + horizon line
const rng = (seed) => { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); };
const grad = (g, y0, y1, stops) => { const gr = g.createLinearGradient(0, y0, 0, y1); stops.forEach(([o, c]) => gr.addColorStop(o, c)); g.fillStyle = gr; };
function cloud(g, x, y, s, a = 0.9) {
  g.fillStyle = `rgba(255,255,255,${a})`;
  for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(x + (i - 2.5) * 34 * s, y + Math.sin(i * 1.9) * 9 * s, 54 * s, 28 * s, 0, 0, 7); g.fill(); }
}
function hills(g, base, amp, color, f, ph, bottom = H) {
  g.fillStyle = color; g.beginPath(); g.moveTo(0, bottom);
  for (let x = 0; x <= W; x += 8) g.lineTo(x, base + Math.sin((x / W) * Math.PI * 2 * f + ph) * amp + Math.sin((x / W) * Math.PI * 2 * f * 2.3 + ph * 2) * amp * 0.4);
  g.lineTo(W, bottom); g.closePath(); g.fill();
}
function star(g, x, y, R, color) { g.fillStyle = color; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? R * 0.45 : R; g[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r, y + Math.sin(a) * r); } g.closePath(); g.fill(); }
function glow(g, x, y, r, c0, c1 = 'rgba(255,255,255,0)') { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, c0); gr.addColorStop(1, c1); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }

const PAINT = {
  garden(g) {
    const r = rng(3);
    grad(g, 0, HZ, [[0, '#62b9ff'], [0.6, '#bfe6ff'], [1, '#fff4d6']]); g.fillRect(0, 0, W, HZ + 2);
    glow(g, W * 0.2, H * 0.3, 240, 'rgba(255,246,200,1)', 'rgba(255,246,200,0)');
    g.fillStyle = '#fffbe0'; g.beginPath(); g.arc(W * 0.2, H * 0.3, 44, 0, 7); g.fill();
    for (let i = 0; i < 16; i++) cloud(g, r() * W, H * 0.08 + r() * H * 0.3, 0.8 + r() * 1.4, 0.85);
    hills(g, HZ - 30, 26, '#c6edb0', 3, 0.5); hills(g, HZ + 6, 30, '#9fdc92', 4, 2.2); hills(g, HZ + 50, 20, '#7ccf7e', 5, 4);
    for (let i = 0; i < 14; i++) { const x = r() * W, y = HZ + 10 + r() * 20, s = 0.8 + r() * 0.8; g.fillStyle = '#9a6b4b'; g.fillRect(x - 4 * s, y - 30 * s, 8 * s, 34 * s); g.fillStyle = ['#8fe0a0', '#ffb3d1', '#ffd98f'][i % 3]; g.beginPath(); g.arc(x, y - 52 * s, 32 * s, 0, 7); g.arc(x - 20 * s, y - 38 * s, 22 * s, 0, 7); g.arc(x + 20 * s, y - 38 * s, 22 * s, 0, 7); g.fill(); }
    grad(g, HZ + 60, H, [[0, '#7ccf7e'], [1, '#4fb86a']]); g.fillRect(0, HZ + 60, W, H);
    for (let i = 0; i < 700; i++) { const y = HZ + 70 + Math.pow(r(), 0.8) * (H - HZ - 70), s = 2 + ((y - HZ) / (H - HZ)) * 9; g.fillStyle = ['#ffffff', '#ff8fc1', '#ffe27a', '#c9a0ff'][i % 4]; g.beginPath(); g.arc(r() * W, y, s, 0, 7); g.fill(); g.fillStyle = '#ffd34d'; g.beginPath(); g.arc(r() * W, y, s * 0.35, 0, 7); }
    for (let i = 0; i < 12; i++) { const x = r() * W, y = HZ - 130 + r() * 90; g.fillStyle = ['#ffb3d1', '#ffd98f', '#b9a0ff'][i % 3]; g.beginPath(); g.ellipse(x - 8, y, 9, 6, -0.6, 0, 7); g.ellipse(x + 8, y, 9, 6, 0.6, 0, 7); g.fill(); }
  },
  night(g) {
    const r = rng(9);
    grad(g, 0, HZ, [[0, '#120a3c'], [0.5, '#4c2a9c'], [0.85, '#c06ad0'], [1, '#ffb0d6']]); g.fillRect(0, 0, W, HZ + 2);
    for (let i = 0; i < 4; i++) { g.strokeStyle = ['rgba(120,255,220,0.18)', 'rgba(255,140,220,0.2)'][i % 2]; g.lineWidth = 46 - i * 8; g.beginPath(); for (let x = 0; x <= W; x += 16) { const y = H * 0.22 + i * 30 + Math.sin(x / 190 + i) * 44; g[x ? 'lineTo' : 'moveTo'](x, y); } g.stroke(); }
    for (let i = 0; i < 1100; i++) { const y = Math.pow(r(), 1.5) * HZ; g.fillStyle = `rgba(255,255,255,${0.35 + r() * 0.65})`; g.beginPath(); g.arc(r() * W, y, 0.8 + r() * 2.2, 0, 7); g.fill(); }
    for (let i = 0; i < 26; i++) star(g, r() * W, r() * HZ * 0.8, 8 + r() * 12, ['#fff3b0', '#ffd1ec', '#d8c8ff'][i % 3]);
    glow(g, W * 0.35, H * 0.22, 190, 'rgba(255,245,200,0.8)', 'rgba(255,245,200,0)');
    g.fillStyle = '#fff6d0'; g.beginPath(); g.arc(W * 0.35, H * 0.22, 74, 0, 7); g.fill(); g.fillStyle = '#6a3ab8'; g.beginPath(); g.arc(W * 0.35 + 34, H * 0.22 - 14, 66, 0, 7); g.fill();
    hills(g, HZ - 10, 34, '#4a2a86', 3, 1); hills(g, HZ + 30, 28, '#34195f', 4, 3);
    grad(g, HZ + 40, H, [[0, '#34195f'], [1, '#1d0c3d']]); g.fillRect(0, HZ + 40, W, H);
    for (let i = 0; i < 90; i++) { const y = HZ + 50 + r() * (H - HZ - 60); glow(g, r() * W, y, 8 + (y - HZ) / 30, 'rgba(255,240,140,0.95)', 'rgba(255,240,140,0)'); }
  },
  beach(g) {
    const r = rng(5);
    grad(g, 0, HZ, [[0, '#8e7cf0'], [0.45, '#ff9fd0'], [0.8, '#ffcf9f'], [1, '#fff0c0']]); g.fillRect(0, 0, W, HZ + 2);
    glow(g, W * 0.62, HZ, 330, 'rgba(255,250,210,1)', 'rgba(255,200,160,0)');
    g.fillStyle = '#fffbe4'; g.beginPath(); g.arc(W * 0.62, HZ, 80, Math.PI, 0); g.fill();
    for (let i = 0; i < 12; i++) cloud(g, r() * W, H * 0.12 + r() * H * 0.28, 0.8 + r() * 1.4, 0.55);
    grad(g, HZ, HZ + 150, [[0, '#ffc0a8'], [0.4, '#8fe0e8'], [1, '#3ec6d8']]); g.fillRect(0, HZ, W, 150);
    for (let i = 0; i < 300; i++) { const y = HZ + 4 + Math.pow(r(), 1.3) * 140; g.strokeStyle = `rgba(255,255,255,${0.2 + r() * 0.4})`; g.lineWidth = 1.5 + ((y - HZ) / 140) * 3; const x = r() * W; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 20 + r() * 40, y); g.stroke(); }
    glow(g, W * 0.62, HZ + 40, 160, 'rgba(255,240,200,0.55)', 'rgba(255,240,200,0)');
    grad(g, HZ + 150, H, [[0, '#fff0cf'], [1, '#ffd9a0']]); g.fillRect(0, HZ + 150, W, H);
    g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); for (let x = 0; x <= W; x += 10) g[x ? 'lineTo' : 'moveTo'](x, HZ + 150 + Math.sin(x / 60) * 7); g.lineTo(W, HZ + 130); g.lineTo(0, HZ + 130); g.fill();
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(190,140,90,${r() * 0.15})`; g.fillRect(r() * W, HZ + 170 + r() * (H - HZ - 170), 3, 3); }
    for (let i = 0; i < 9; i++) { const x = r() * W, y = HZ + 220 + r() * 200; g.fillStyle = ['#ff9ccf', '#fff', '#ffd27a'][i % 3]; g.beginPath(); g.arc(x, y, 14 + r() * 10, Math.PI, 0); g.fill(); }
    g.strokeStyle = '#fff'; g.lineWidth = 4; for (let i = 0; i < 6; i++) { const x = r() * W, y = H * 0.2 + r() * H * 0.2; g.beginPath(); g.moveTo(x - 18, y); g.quadraticCurveTo(x - 9, y - 14, x, y); g.quadraticCurveTo(x + 9, y - 14, x + 18, y); g.stroke(); }
  },
  castle(g) {
    const r = rng(13);
    grad(g, 0, HZ, [[0, '#b9a0ff'], [0.5, '#ffc2e2'], [1, '#fff1e0']]); g.fillRect(0, 0, W, HZ + 2);
    const cx = W * 0.5, cy = HZ + 40;
    ['#ff8fa8', '#ffc58f', '#fff08f', '#a8f0a0', '#8fd0ff', '#c9a0ff'].forEach((c, i) => { g.strokeStyle = c; g.globalAlpha = 0.75; g.lineWidth = 22; g.beginPath(); g.arc(cx - 330, cy, 520 - i * 21, Math.PI * 1.04, Math.PI * 1.96); g.stroke(); }); g.globalAlpha = 1;
    for (let i = 0; i < 18; i++) cloud(g, r() * W, H * 0.1 + r() * H * 0.36, 0.8 + r() * 1.6, 0.9);
    hills(g, HZ - 8, 22, '#d9f5d0', 2, 0.4);
    // castle
    const tower = (x, w, h, roof) => { g.fillStyle = '#fff4fa'; g.fillRect(x - w / 2, HZ - h, w, h + 20); g.fillStyle = '#ffd0e6'; g.fillRect(x - w / 2, HZ - h, w * 0.3, h + 20); g.fillStyle = roof; g.beginPath(); g.moveTo(x - w * 0.62, HZ - h); g.lineTo(x, HZ - h - w * 1.1); g.lineTo(x + w * 0.62, HZ - h); g.fill(); g.fillStyle = '#ffd34d'; g.beginPath(); g.arc(x, HZ - h - w * 1.1 - 6, 7, 0, 7); g.fill(); g.fillStyle = '#9b6bff'; g.fillRect(x - 5, HZ - h * 0.6, 10, 26); };
    const X = W * 0.7; g.fillStyle = '#fff4fa'; g.fillRect(X - 110, HZ - 130, 220, 150); g.fillStyle = '#ffc9e0'; for (let i = 0; i < 6; i++) g.fillRect(X - 110 + i * 38, HZ - 150, 24, 22);
    tower(X - 140, 64, 220, '#ff7eb6'); tower(X + 140, 64, 220, '#ff7eb6'); tower(X, 80, 290, '#9b6bff'); tower(X - 70, 50, 170, '#ffb347'); tower(X + 70, 50, 170, '#ffb347');
    g.fillStyle = '#b07bd8'; g.beginPath(); g.moveTo(X - 28, HZ + 20); g.lineTo(X - 28, HZ - 40); g.arc(X, HZ - 40, 28, Math.PI, 0); g.lineTo(X + 28, HZ + 20); g.fill();
    hills(g, HZ + 22, 22, '#a8e8b8', 3, 2);
    grad(g, HZ + 44, H, [[0, '#a8e8b8'], [1, '#6fd0a0']]); g.fillRect(0, HZ + 44, W, H);
    for (let i = 0; i < 12; i++) { const x = r() * W, y = H * 0.12 + r() * H * 0.34; g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y + 26); g.lineTo(x, y + 90); g.stroke(); g.fillStyle = ['#ff7eb6', '#ffd966', '#8fd3ff', '#c9a0ff'][i % 4]; g.beginPath(); g.ellipse(x, y, 20, 26, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.ellipse(x - 6, y - 8, 5, 8, 0, 0, 7); g.fill(); }
    for (let i = 0; i < 300; i++) { const y = HZ + 60 + Math.pow(r(), 0.8) * (H - HZ - 60), s = 2 + ((y - HZ) / (H - HZ)) * 7; g.fillStyle = ['#fff', '#ff8fc1', '#ffe27a'][i % 3]; g.beginPath(); g.arc(r() * W, y, s, 0, 7); g.fill(); }
    for (let i = 0; i < 20; i++) star(g, r() * W, r() * HZ * 0.7, 8 + r() * 10, 'rgba(255,255,255,0.9)');
  },
};

const cache = new Map();
export function backgroundTexture(id) {
  if (cache.has(id)) return cache.get(id);
  const BASE = { garden: '#4fb86a', night: '#1d0c3d', beach: '#ffd9a0', castle: '#6fd0a0' };
  const t = canvasTex(W, H, (g) => { g.fillStyle = BASE[id]; g.fillRect(0, 0, W, H); PAINT[id](g); }, { aniso: 4 });
  cache.set(id, t); return t;
}

/** Big inside-out sphere that replaces the room behind the doll. */
export class Backdrop {
  constructor(parent) {
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(30, 48, 32), new THREE.MeshBasicMaterial({ side: THREE.BackSide, toneMapped: false }));
    this.mesh.scale.x = -1; this.mesh.visible = false; this.mesh.rotation.y = -Math.PI / 2; parent.add(this.mesh); this.id = 'room';
  }
  set(id) {
    this.id = id;
    if (id === 'room') { this.mesh.visible = false; return; }
    this.mesh.material.map = backgroundTexture(id); this.mesh.material.needsUpdate = true; this.mesh.visible = true;
  }
}
