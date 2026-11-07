import * as THREE from 'three';

/* ---------- Canvas helpers ---------- */
export function canvasTex(w, h, draw, { repeat, aniso = 8, srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
export function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
export const hex = (n) => '#' + new THREE.Color(n).getHexString();
export function mix(a, b, t) { return '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString(); }
export const FONT = '"Fredoka","Baloo 2","Trebuchet MS","Segoe UI",system-ui,sans-serif';

/* ---------- Pattern textures for fabrics ---------- */
const texCache = new Map();
function heartPath(g, x, y, s) {
  g.beginPath();
  g.moveTo(x, y + s * 0.35);
  g.bezierCurveTo(x - s, y - s * 0.2, x - s * 0.5, y - s * 0.9, x, y - s * 0.4);
  g.bezierCurveTo(x + s * 0.5, y - s * 0.9, x + s, y - s * 0.2, x, y + s * 0.35);
  g.closePath();
}
function starPath(g, x, y, R, r, n = 5, rot = -Math.PI / 2) {
  g.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i * Math.PI) / n, rad = i % 2 ? r : R;
    g[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  g.closePath();
}
function glint(g, x, y, s) {
  g.beginPath();
  g.moveTo(x, y - s); g.quadraticCurveTo(x, y, x + s, y); g.quadraticCurveTo(x, y, x, y + s);
  g.quadraticCurveTo(x, y, x - s, y); g.quadraticCurveTo(x, y, x, y - s);
  g.fill();
}
export function patternTexture(pattern, color) {
  const key = pattern + color;
  if (texCache.has(key)) return texCache.get(key);
  const base = hex(color), light = mix(color, 0xffffff, 0.7), dark = mix(color, 0x5a2a6a, 0.22);
  const S = 256;
  const t = canvasTex(S, S, (g) => {
    g.fillStyle = base; g.fillRect(0, 0, S, S);
    // subtle woven noise
    g.globalAlpha = 0.05; g.fillStyle = '#000';
    for (let i = 0; i < S; i += 2) g.fillRect(0, i, S, 1);
    g.globalAlpha = 1;
    switch (pattern) {
      case 'dots':
        g.fillStyle = '#ffffff';
        for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { g.beginPath(); g.arc(32 + c * 64 + (r % 2) * 32, 32 + r * 64, 11, 0, 7); g.fill(); }
        break;
      case 'stars':
        g.fillStyle = '#fff6c9';
        for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) { starPath(g, 42 + c * 85 + (r % 2) * 40, 42 + r * 85, 18, 8); g.fill(); }
        break;
      case 'hearts':
        g.fillStyle = light;
        for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) { heartPath(g, 42 + c * 85 + (r % 2) * 40, 50 + r * 85, 22); g.fill(); }
        break;
      case 'stripes':
        g.fillStyle = '#ffffff'; g.globalAlpha = 0.85;
        for (let i = 0; i < 4; i++) g.fillRect(0, i * 64 + 8, S, 24);
        g.globalAlpha = 1;
        break;
      case 'check':
        g.fillStyle = 'rgba(255,255,255,0.55)';
        for (let i = 0; i < 4; i++) g.fillRect(0, i * 64, S, 32);
        g.fillStyle = 'rgba(255,255,255,0.4)';
        for (let i = 0; i < 4; i++) g.fillRect(i * 64, 0, 32, S);
        break;
      case 'flowers':
        for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) {
          const x = 64 + c * 128 + (r % 2) * 40, y = 64 + r * 128;
          g.fillStyle = '#ffffff';
          for (let p = 0; p < 5; p++) { const a = (p / 5) * 6.283; g.beginPath(); g.arc(x + Math.cos(a) * 16, y + Math.sin(a) * 16, 12, 0, 7); g.fill(); }
          g.fillStyle = '#ffd34d'; g.beginPath(); g.arc(x, y, 8, 0, 7); g.fill();
        }
        break;
      case 'scales':
        g.strokeStyle = light; g.lineWidth = 3;
        for (let r = 0; r < 9; r++) for (let c = -1; c < 6; c++) { g.beginPath(); g.arc(c * 52 + (r % 2) * 26, r * 28, 30, 0, Math.PI); g.stroke(); }
        break;
      case 'sparkle': {
        const gr = g.createLinearGradient(0, 0, 0, S);
        gr.addColorStop(0, mix(color, 0xffffff, 0.35)); gr.addColorStop(1, mix(color, 0xffffff, 0.0));
        g.fillStyle = gr; g.fillRect(0, 0, S, S);
        let s = 7;
        const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
        g.fillStyle = '#ffffff';
        for (let i = 0; i < 70; i++) { g.globalAlpha = 0.35 + rnd() * 0.65; g.beginPath(); g.arc(rnd() * S, rnd() * S, 1 + rnd() * 2, 0, 7); g.fill(); }
        for (let i = 0; i < 8; i++) { g.globalAlpha = 0.9; glint(g, rnd() * S, rnd() * S, 7 + rnd() * 6); }
        g.globalAlpha = 1;
        break;
      }
      case 'rainbow': {
        const cols = ['#ff8fa8', '#ffc58f', '#fff08f', '#a8f0a0', '#8fd0ff', '#c9a0ff'];
        cols.forEach((c, i) => { g.fillStyle = c; g.fillRect(0, (i * S) / 6, S, S / 6 + 1); });
        break;
      }
      default:
        g.fillStyle = dark; g.globalAlpha = 0.07;
        for (let i = 0; i < S; i += 4) g.fillRect(i, 0, 1, S);
        g.globalAlpha = 1;
    }
  }, { repeat: pattern === 'sparkle' || pattern === 'rainbow' ? [2, 1] : [3, 2] });
  texCache.set(key, t);
  return t;
}

/* ---------- Materials (memoised, shared) ---------- */
const mats = new Map();
const memo = (k, f) => { let v = mats.get(k); if (!v) { v = f(); mats.set(k, v); } return v; };

export const fabricMat = (color, pattern = 'plain') => memo('f' + color + pattern, () => {
  const shiny = pattern === 'sparkle';
  return new THREE.MeshPhysicalMaterial({
    color: 0xffffff, map: patternTexture(pattern, color), roughness: shiny ? 0.38 : 0.62,
    sheen: 1, sheenRoughness: 0.4, sheenColor: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.55),
    clearcoat: shiny ? 0.35 : 0, clearcoatRoughness: 0.3, side: THREE.DoubleSide,
  });
});
export const solidMat = (color, { rough = 0.45, metal = 0, coat = 0, side = THREE.FrontSide, emissive = 0, ei = 0 } = {}) =>
  memo(`s${color}${rough}${metal}${coat}${side}${emissive}${ei}`, () => new THREE.MeshPhysicalMaterial({
    color, roughness: rough, metalness: metal, clearcoat: coat, clearcoatRoughness: 0.25, side, emissive, emissiveIntensity: ei,
  }));
export const goldMat = () => solidMat(0xffc94d, { rough: 0.22, metal: 1 });
export const silverMat = () => solidMat(0xe9eef7, { rough: 0.2, metal: 1 });
export const roseGoldMat = () => solidMat(0xf5a58f, { rough: 0.25, metal: 1 });
export const gemMat = (color) => memo('g' + color, () => new THREE.MeshPhysicalMaterial({
  color, roughness: 0.06, metalness: 0.1, clearcoat: 1, emissive: color, emissiveIntensity: 0.35, flatShading: true, envMapIntensity: 2.2,
}));
export const pearlMat = () => memo('pearl', () => new THREE.MeshPhysicalMaterial({
  color: 0xfff6f2, roughness: 0.18, clearcoat: 1, sheen: 1, sheenColor: new THREE.Color(0xffc9e8), iridescence: 0.6,
}));
export const glassMat = (color, opacity = 0.4) => memo(`gl${color}${opacity}`, () => new THREE.MeshPhysicalMaterial({
  color, roughness: 0.04, transparent: true, opacity, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.5,
}));
export const tulleMat = (color, opacity = 0.6) => memo(`tu${color}${opacity}`, () => new THREE.MeshPhysicalMaterial({
  color, roughness: 0.8, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false,
  sheen: 1, sheenColor: new THREE.Color(0xffffff), map: patternTexture('sparkle', color),
}));
export const furMat = (color) => memo('fur' + color, () => new THREE.MeshStandardMaterial({ color, roughness: 1 }));

/* ---------- Geometry helpers ---------- */
export const V2 = (pts) => pts.map(([r, y]) => new THREE.Vector2(r, y));
export function smooth(pts, n = 24) {
  const c = new THREE.SplineCurve(V2(pts));
  return c.getPoints(n).map((p) => [Math.max(0, p.x), p.y]);
}
export const lathe = (pts, seg = 40, ps = 0, pl = Math.PI * 2) => new THREE.LatheGeometry(V2(pts), seg, ps, pl);
export function M(geo, mat, { cast = true, receive = false } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = cast; m.receiveShadow = receive;
  return m;
}
export function sph(r, mat, sx = 1, sy = 1, sz = 1, seg = 20) {
  const m = M(new THREE.SphereGeometry(r, seg, Math.max(8, seg * 0.75 | 0)), mat);
  m.scale.set(sx, sy, sz);
  return m;
}
export function warp(geo, fn) {
  const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); fn(v); p.setXYZ(i, v.x, v.y, v.z); }
  geo.computeVertexNormals();
  return geo;
}
export function chain(curvePts, r0, r1, mat, n = 10) {
  const g = new THREE.Group();
  const c = new THREE.CatmullRomCurve3(curvePts.map((p) => new THREE.Vector3(...p)));
  for (let i = 0; i <= n; i++) {
    const t = i / n, s = sph(r0 + (r1 - r0) * t, mat, 1, 1.1, 1, 14);
    s.position.copy(c.getPoint(t)); g.add(s);
  }
  return g;
}
export function shapeGeo(shape, depth = 0.006, bevel = 0.0015) {
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 14 });
}
export function heartShape(s = 1) {
  const sh = new THREE.Shape();
  sh.moveTo(0, -0.9 * s);
  sh.bezierCurveTo(-1.3 * s, 0.0, -1.1 * s, 0.95 * s, -0.5 * s, 0.9 * s);
  sh.bezierCurveTo(-0.2 * s, 0.88 * s, 0, 0.6 * s, 0, 0.45 * s);
  sh.bezierCurveTo(0, 0.6 * s, 0.2 * s, 0.88 * s, 0.5 * s, 0.9 * s);
  sh.bezierCurveTo(1.1 * s, 0.95 * s, 1.3 * s, 0.0, 0, -0.9 * s);
  return sh;
}
export function polarShape(fn, s = 1, n = 64, clockwise = false) {
  const sh = new THREE.Shape();
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2 * (clockwise ? -1 : 1);
    const [x, y] = fn(a);
    i ? sh.lineTo(x * s, y * s) : sh.moveTo(x * s, y * s);
  }
  return sh;
}
export function starPoly(R, r, n = 5) {
  const sh = new THREE.Shape();
  for (let i = 0; i < n * 2; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / n, rad = i % 2 ? r : R;
    const x = Math.cos(a) * rad, y = Math.sin(a) * rad;
    i ? sh.lineTo(x, y) : sh.moveTo(x, y);
  }
  sh.closePath();
  return sh;
}
export function bow(color, s = 1, pattern = 'sparkle') {
  const g = new THREE.Group(), m = fabricMat(color, pattern);
  for (const sx of [-1, 1]) {
    const l = sph(0.016 * s, m, 1.35, 0.85, 0.5, 16);
    l.position.x = sx * 0.017 * s; l.rotation.z = sx * 0.25; g.add(l);
    const t = sph(0.006 * s, m, 0.8, 2.6, 0.7, 10);
    t.position.set(sx * 0.008 * s, -0.016 * s, 0); t.rotation.z = sx * 0.4; g.add(t);
  }
  g.add(sph(0.009 * s, m, 1, 1, 0.9, 14));
  return g;
}
export function disposeTree(o) {
  o.traverse((c) => { if (c.geometry) c.geometry.dispose(); });
}

/* ---------- Torso profile shared by body and clothing ---------- */
export const TORSO = [[0.0, 0.205], [0.040, 0.206], [0.056, 0.225], [0.058, 0.24], [0.052, 0.27], [0.050, 0.295], [0.054, 0.318], [0.048, 0.336], [0.026, 0.345], [0.0, 0.347]];
export function torsoR(y) {
  for (let i = 0; i < TORSO.length - 1; i++) {
    const [r0, y0] = TORSO[i], [r1, y1] = TORSO[i + 1];
    if (y >= y0 && y <= y1) return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0);
  }
  return TORSO[TORSO.length - 1][0];
}
export function shell(y0, y1, off = 0.004, n = 10) {
  const p = [];
  for (let i = 0; i <= n; i++) { const y = y0 + ((y1 - y0) * i) / n; p.push([torsoR(y) + off, y]); }
  return p;
}
export const LEG_X = 0.03;
export const legR = (t) => 0.025 - 0.0075 * t; // t 0 hip -> 1 ankle
