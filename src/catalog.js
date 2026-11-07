import * as THREE from 'three';
import {
  M, sph, lathe, smooth, warp, chain, shapeGeo, heartShape, starPoly, bow, fabricMat, solidMat, goldMat, silverMat, roseGoldMat,
  gemMat, pearlMat, glassMat, tulleMat, furMat, shell, torsoR, LEG_X, legR, canvasTex, patternTexture,
} from './util.js';
import { MOUNTS } from './doll.js';

/* ============ Registry ============ */
export const CATEGORIES = [
  { id: 'perso', icon: '👸', label: 'Poupée' },
  { id: 'robes', icon: '👗', label: 'Robes', slots: ['dress'] },
  { id: 'hauts', icon: '👚', label: 'Hauts', slots: ['top'] },
  { id: 'bas', icon: '🩳', label: 'Bas', slots: ['bottom'] },
  { id: 'chaussures', icon: '👟', label: 'Chaussures', slots: ['shoes'] },
  { id: 'coiffures', icon: '💇', label: 'Cheveux', slots: ['hair', 'hairAcc'] },
  { id: 'chapeaux', icon: '👑', label: 'Chapeaux', slots: ['hat'] },
  { id: 'lunettes', icon: '👓', label: 'Lunettes', slots: ['glasses'] },
  { id: 'bijoux', icon: '💎', label: 'Bijoux', slots: ['necklace', 'earrings', 'bracelet'] },
  { id: 'access', icon: '🪄', label: 'Magie', slots: ['handR', 'handL', 'back'] },
];
export const ITEMS = [];
export const BY_ID = {};
export const byCat = (id) => ITEMS.filter((i) => i.cat === id);

const v = (n, c, p = 'plain', x) => ({ n, c, p, x });
const C = {
  rose: 0xff7eb6, fuchsia: 0xe8428a, lilas: 0xb9a0ff, ciel: 0x8fd3ff, menthe: 0x8fe8c8, jaune: 0xffd966, corail: 0xff9a8a, blanc: 0xfff7fb,
  or: 0xf5c451, turquoise: 0x3ed6d0, violet: 0x9b6bff, rouge: 0xff4d6d, noir: 0x5a4670, creme: 0xffeedd, pastel: 0xffc9e0, marine: 0x5b7bd6, vert: 0x6fd08c,
};
function def(cat, slot, key, name, vars, fn, opt = {}) {
  vars.forEach((va, i) => {
    const id = `${key}.${i}`;
    const it = { id, key, cat, slot, name: `${name} ${va.n}`.trim(), design: name, hairTint: !!opt.hairTint, build: (ctx) => fn(va, ctx || {}) };
    ITEMS.push(it); BY_ID[id] = it;
  });
}
const P = (parent, obj) => ({ parent, obj });
const grp = (...c) => { const g = new THREE.Group(); c.forEach((x) => x && g.add(x)); return g; };
const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };
const gem = (c, r = 0.008) => { const m = M(new THREE.IcosahedronGeometry(r, 0), gemMat(c)); return m; };
const metalOf = (x) => (x === 'silver' ? silverMat() : x === 'rose' ? roseGoldMat() : goldMat());

/* ============ HAIR ============ */
const HR = 0.1097;
const hairTex = canvasTex(256, 256, (g) => {
  g.fillStyle = '#e8e8e8'; g.fillRect(0, 0, 256, 256);
  let s = 3; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 260; i++) { const x = rnd() * 256, a = 0.08 + rnd() * 0.2; g.fillStyle = rnd() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(90,70,90,${a})`; g.fillRect(x, 0, 1 + rnd() * 2, 256); }
}, { repeat: [3, 1] });
const hairMats = new Map();
const hairMat = (c) => { let m = hairMats.get(c); if (!m) { m = new THREE.MeshPhysicalMaterial({ color: c, map: hairTex, roughness: 0.38, clearcoat: 0.5, clearcoatRoughness: 0.3, sheen: 0.8, sheenColor: new THREE.Color(c).lerp(new THREE.Color(0xffffff), 0.5), side: THREE.DoubleSide }); hairMats.set(c, m); } return m; };

function cutFace(geo, extraCut) {
  const idx = geo.index.array, p = geo.attributes.position, out = [];
  for (let i = 0; i < idx.length; i += 3) {
    const a = idx[i], b = idx[i + 1], c = idx[i + 2];
    const x = (p.getX(a) + p.getX(b) + p.getX(c)) / 3, y = (p.getY(a) + p.getY(b) + p.getY(c)) / 3, z = (p.getZ(a) + p.getZ(b) + p.getZ(c)) / 3;
    const face = z > 0.012 && y < 0.058 && Math.abs(x) < 0.08;
    const ear = extraCut && Math.abs(x) > 0.088 && Math.abs(z) < 0.03 && y < 0.01 && y > -0.045;
    if (!face && !ear) out.push(a, b, c);
  }
  geo.setIndex(out);
  return geo;
}
function cap(m, thetaLen = 2.0, ear = false) {
  const g = new THREE.SphereGeometry(HR, 72, 56, 0, Math.PI * 2, 0, thetaLen);
  return M(cutFace(g, ear), m);
}
function bangs(m, kind = 'straight') {
  const g = new THREE.Group();
  if (kind === 'none') return g;
  const n = 7;
  for (let i = 0; i < n; i++) {
    const t = (i - (n - 1) / 2) / ((n - 1) / 2);
    const ang = t * 0.62, x = Math.sin(ang) * HR * 0.9;
    let y = 0.052 - Math.abs(t) * 0.01, h = 0.04 - Math.abs(t) * 0.01;
    let rz = -t * 0.35;
    if (kind === 'side') { y -= (t + 1) * 0.008; rz = -0.5 + t * 0.15; h += (t + 1) * 0.008; }
    const z = Math.sqrt(Math.max(0, HR * HR - x * x - y * y));
    const s = sph(0.02, m, 1.05, h / 0.02, 0.62, 14);
    s.position.set(x, y, z - 0.003); s.rotation.z = rz; s.rotation.y = ang * 0.9; s.rotation.x = -0.18;
    g.add(s);
  }
  return g;
}
function curtain(m, prof, ps, pl, waviness = 0.02, waves = 7) {
  const geo = lathe(smooth(prof, 22), 64, ps, pl);
  warp(geo, (p) => { const a = Math.atan2(p.x, p.z), k = 1 + Math.sin(a * waves + p.y * 25) * waviness; p.x *= k; p.z *= k; });
  return M(geo, m);
}
function sideLocks(m, y = -0.1, len = 0.11) {
  const g = new THREE.Group();
  for (const sx of [-1, 1]) { const l = M(new THREE.CapsuleGeometry(0.016, len, 6, 14), m); l.position.set(sx * 0.1, y, 0.03); l.rotation.z = sx * 0.06; g.add(l); }
  return g;
}
const tie = (c = 0xff7eb6, r = 0.011) => M(new THREE.TorusGeometry(r, 0.0045, 8, 16), solidMat(c, { rough: 0.35, coat: 0.6 }));

const HAIR_STYLES = {
  long: (m) => grp(cap(m, 2.0), curtain(m, [[0.1, -0.01], [0.112, -0.07], [0.106, -0.13], [0.099, -0.19], [0.094, -0.235], [0.06, -0.255], [0.0, -0.26]], 0.38 * Math.PI, 1.24 * Math.PI), sideLocks(m), bangs(m)),
  ondule: (m) => grp(cap(m, 2.0), curtain(m, [[0.1, -0.01], [0.114, -0.07], [0.108, -0.13], [0.102, -0.19], [0.098, -0.225], [0.07, -0.245], [0.0, -0.25]], 0.36 * Math.PI, 1.28 * Math.PI, 0.05, 9), sideLocks(m, -0.1, 0.1), bangs(m, 'side')),
  carre: (m) => grp(cap(m, 2.0), curtain(m, [[0.105, 0.0], [0.116, -0.04], [0.118, -0.08], [0.11, -0.103], [0.09, -0.108]], 0.3 * Math.PI, 1.4 * Math.PI, 0.008, 5), bangs(m)),
  queue: (m) => {
    const g = grp(cap(m, 2.0, true), bangs(m, 'side'));
    const tail = chain([[0, 0.07, -0.105], [0, 0.04, -0.17], [0.0, -0.03, -0.185], [0.01, -0.1, -0.16]], 0.03, 0.012, m, 12);
    g.add(tail, at(tie(0xff7eb6, 0.026), 0, 0.058, -0.112)); g.children[g.children.length - 1].rotation.x = 0.9;
    return g;
  },
  couettes: (m) => {
    const g = grp(cap(m, 2.0, true), bangs(m));
    for (const sx of [-1, 1]) {
      g.add(chain([[sx * 0.09, 0.05, -0.02], [sx * 0.15, 0.0, -0.02], [sx * 0.16, -0.08, 0.0], [sx * 0.15, -0.15, 0.01]], 0.03, 0.014, m, 12));
      const t = at(tie(0xff7eb6, 0.026), sx * 0.1, 0.045, -0.02); t.rotation.y = Math.PI / 2; t.rotation.z = sx * 0.5; g.add(t);
    }
    return g;
  },
  chignons: (m) => {
    const g = grp(cap(m, 2.0, true), bangs(m));
    for (const sx of [-1, 1]) { g.add(at(sph(0.048, m, 1, 0.95, 1, 28), sx * 0.062, 0.108, -0.012)); g.add(at(tie(0xffffff, 0.03), sx * 0.054, 0.083, -0.01)); g.children[g.children.length - 1].rotation.x = Math.PI / 2; }
    return g;
  },
  tresses: (m) => {
    const g = grp(cap(m, 2.0, true), bangs(m, 'side'));
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 9; i++) {
        const b = sph(0.018 - i * 0.0009, m, 1.2, 0.85, 1, 12); b.position.set(sx * (0.1 + i * 0.002), -0.02 - i * 0.021, 0.015); b.rotation.z = (i % 2 ? 1 : -1) * 0.5 * sx; g.add(b);
      }
      g.add(at(tie(0xff7eb6, 0.014), sx * 0.108, -0.215, 0.015));
      g.add(at(bow(0xff5fa8, 0.9), sx * 0.108, -0.222, 0.025));
    }
    return g;
  },
  court: (m) => {
    const g = grp(cap(m, 1.92, true), bangs(m, 'side'));
    for (let i = 0; i < 9; i++) { const a = (i / 9) * 6.283, t = sph(0.024, m, 0.7, 1.4, 0.7, 12); t.position.set(Math.sin(a) * 0.06, 0.098 + Math.cos(i * 2) * 0.006, Math.cos(a) * 0.06); t.rotation.set(Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5); g.add(t); }
    return g;
  },
  boucles: (m) => {
    const g = new THREE.Group(); g.add(cap(m, 1.9, false));
    const n = 70, ico = new THREE.InstancedMesh(new THREE.SphereGeometry(0.026, 14, 10), m, n); let k = 0; const d = new THREE.Object3D();
    for (let i = 0; i < n * 3 && k < n; i++) {
      const y = 1 - (i / (n * 3)) * 1.55, r = Math.sqrt(1 - y * y), th = i * 2.399;
      const x = Math.cos(th) * r, z = Math.sin(th) * r, py = y;
      if (z > 0.15 && py < 0.5) continue; // keep face open
      d.position.set(x * 0.112, py * 0.108, z * 0.112); d.scale.setScalar(0.8 + ((i * 7) % 5) * 0.08); d.updateMatrix(); ico.setMatrixAt(k++, d.matrix);
    }
    ico.count = k; ico.castShadow = true; g.add(ico, bangs(m, 'side'));
    return g;
  },
};
const HAIR_NAMES = { long: 'Longs lisses', ondule: 'Ondulés', carre: 'Carré', queue: 'Queue de cheval', couettes: 'Couettes', chignons: 'Chignons', tresses: 'Tresses', court: 'Courts', boucles: 'Bouclés' };
for (const k of Object.keys(HAIR_STYLES)) def('coiffures', 'hair', 'hair_' + k, HAIR_NAMES[k], [v('', 0)], (va, ctx) => [P('headShape', HAIR_STYLES[k](hairMat(ctx.hairColor || 0x80532f)))], { hairTint: true });

// hair accessories
def('coiffures', 'hairAcc', 'noeud', 'Nœud', [v('rose', C.rose, 'sparkle'), v('rouge', C.rouge, 'dots'), v('lilas', C.lilas, 'stars'), v('bleu', C.ciel, 'hearts'), v('doré', C.or, 'sparkle')],
  (va) => [P('headShape', at(bow(va.c, 2.1, va.p), 0.075, 0.092, 0.025))]);
def('coiffures', 'hairAcc', 'noeuds2', 'Nœuds jumeaux', [v('rose', C.fuchsia, 'dots'), v('menthe', C.menthe, 'stars'), v('jaune', C.jaune, 'hearts')],
  (va) => [P('headShape', grp(at(bow(va.c, 1.6, va.p), 0.085, 0.062, 0.04), at(bow(va.c, 1.6, va.p), -0.085, 0.062, 0.04)))]);
def('coiffures', 'hairAcc', 'barrettes', 'Barrettes étoiles', [v('or', C.or, 'plain', 'gold'), v('argent', 0xdfe6f2, 'plain', 'silver'), v('rose', 0xf5a58f, 'plain', 'rose')], (va) => {
  const g = new THREE.Group();
  [[0.062, 0.068, 0.072, 0.3], [0.088, 0.036, 0.055, -0.2], [0.036, 0.086, 0.066, 0.1]].forEach(([x, y, z, r], i) => { const s = M(shapeGeo(starPoly(0.016, 0.007), 0.003, 0.001), metalOf(va.x)); s.position.set(x * 1.0, y, z); s.rotation.z = r; s.rotation.y = Math.atan2(x, z); s.rotation.x = -Math.atan2(y, Math.hypot(x, z)) * 0.8; g.add(s); });
  return [P('headShape', g)];
});
def('coiffures', 'hairAcc', 'fleurclip', 'Fleur de printemps', [v('rose', C.rose), v('jaune', C.jaune), v('lilas', C.lilas), v('blanche', C.blanc)], (va) => {
  const g = new THREE.Group(), m = solidMat(va.c, { rough: 0.5, coat: 0.3 });
  for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.283, p = sph(0.012, m, 1, 1, 0.5, 12); p.position.set(Math.cos(a) * 0.016, Math.sin(a) * 0.016, 0); g.add(p); }
  g.add(sph(0.01, solidMat(0xffd34d, { rough: 0.4 }), 1, 1, 0.8, 12)); g.position.set(-0.085, 0.045, 0.06); g.rotation.y = -0.6; return [P('headShape', g)];
});
def('coiffures', 'hairAcc', 'serretete', 'Serre-tête', [v('rose', C.rose, 'sparkle'), v('noir', C.noir, 'plain'), v('lilas', C.lilas, 'dots'), v('rouge', C.rouge, 'hearts')], (va) => {
  const band = M(new THREE.TorusGeometry(0.113, 0.0055, 10, 64, Math.PI), fabricMat(va.c, va.p));
  band.rotation.set(0, Math.PI / 2, 0); band.rotation.z = 0; band.rotation.x = 0;
  const g = new THREE.Group(); band.rotation.set(0, 0, 0); band.rotation.y = Math.PI / 2; const pivot = new THREE.Group(); pivot.add(band); pivot.rotation.x = -0.25; pivot.position.set(0, -0.005, 0.0);
  pivot.rotation.set(-0.25, 0, 0);
  // torus half arc lies in XY plane; rotate so it spans ear-to-ear over the top
  band.rotation.set(0, 0, 0);
  g.add(pivot, at(bow(va.c, 1.6, va.p), 0.07, 0.085, 0.04));
  return [P('headShape', g)];
});

/* ============ TOPS ============ */
function sleeves(mat, len, r0, r1, y0 = -0.012, cuff = null) {
  return ['armL', 'armR'].map((n) => {
    const g = new THREE.Group();
    g.add(M(lathe([[r1, y0 - len], [(r0 + r1) / 2, y0 - len / 2], [r0, y0]], 24), mat));
    if (cuff) { const t = M(new THREE.TorusGeometry(r1, 0.003, 8, 24), cuff); t.rotation.x = Math.PI / 2; t.position.y = y0 - len; g.add(t); }
    return P(n, g);
  });
}
const neckRing = (y, off, mat) => { const t = M(new THREE.TorusGeometry(torsoR(y) + off, 0.0034, 8, 40), mat); t.rotation.x = Math.PI / 2; t.position.y = y; return t; };
const TV1 = [v('Rose', C.rose), v('Étoilé', C.lilas, 'stars'), v('Rayé', C.menthe, 'stripes'), v('Cœurs', C.blanc, 'hearts'), v('à Pois', C.jaune, 'dots'), v('Fleuri', C.ciel, 'flowers')];
def('hauts', 'top', 'tee', 'T-shirt', TV1, (va) => {
  const m = fabricMat(va.c, va.p);
  return [P('root', grp(M(lathe(shell(0.211, 0.337, 0.0045, 10), 48), m), neckRing(0.336, 0.005, solidMat(0xffffff, { rough: 0.7 })))), ...sleeves(m, 0.05, 0.0225, 0.0235)];
});
def('hauts', 'top', 'pull', 'Pull douillet', [v('Rose', C.pastel, 'stripes'), v('Lilas', C.lilas), v('Menthe', C.menthe, 'hearts'), v('Jaune', C.jaune, 'stars'), v('Corail', C.corail, 'dots'), v('Bleu', C.ciel, 'stripes')], (va) => {
  const m = fabricMat(va.c, va.p), rib = fabricMat(va.c, 'plain');
  const hem = M(new THREE.TorusGeometry(torsoR(0.214) + 0.008, 0.005, 8, 40), rib); hem.rotation.x = Math.PI / 2; hem.position.y = 0.214;
  return [P('root', grp(M(lathe(shell(0.211, 0.337, 0.0075, 10), 48), m), hem, neckRing(0.336, 0.008, rib))), ...sleeves(m, 0.145, 0.0235, 0.0215, -0.01, rib)];
});
def('hauts', 'top', 'debardeur', 'Débardeur', [v('Rose', C.fuchsia), v('Blanc', C.blanc, 'hearts'), v('Ciel', C.ciel, 'stripes'), v('Menthe', C.menthe, 'stars'), v('Lilas', C.lilas, 'dots'), v('Jaune', C.jaune, 'flowers')], (va) => {
  const m = fabricMat(va.c, va.p), g = new THREE.Group();
  g.add(M(lathe(shell(0.212, 0.318, 0.0045, 8), 48), m));
  for (const sx of [-1, 1]) { const s = M(new THREE.CylinderGeometry(0.0045, 0.0045, 0.05, 8), m); s.position.set(sx * 0.038, 0.335, 0.012); s.rotation.set(0.1, 0, sx * 0.2); g.add(s); }
  return [P('root', g)];
});
def('hauts', 'top', 'blouse', 'Blouse à volants', [v('Blanche', C.blanc, 'dots'), v('Rose', C.pastel, 'flowers'), v('Ciel', C.ciel, 'plain'), v('Lilas', C.lilas, 'hearts'), v('Menthe', C.menthe, 'stripes'), v('Jaune', C.jaune, 'plain')], (va) => {
  const m = fabricMat(va.c, va.p), g = new THREE.Group();
  g.add(M(lathe(shell(0.211, 0.337, 0.0045, 10), 48), m));
  for (let i = 0; i < 3; i++) { const r = M(new THREE.TorusGeometry(0.048 + i * 0.006, 0.007 - i * 0.001, 10, 40), m); r.rotation.x = Math.PI / 2; r.position.y = 0.332 - i * 0.012; g.add(r); }
  const parts = [P('root', g)];
  for (const n of ['armL', 'armR']) { const a = new THREE.Group(); a.add(at(sph(0.027, m, 1, 0.9, 1, 20), 0, -0.022, 0)); const ruf = M(new THREE.TorusGeometry(0.019, 0.006, 8, 20), m); ruf.rotation.x = Math.PI / 2; ruf.position.y = -0.062; a.add(ruf); a.add(M(lathe([[0.0195, -0.062], [0.023, -0.03]], 16), m)); parts.push(P(n, a)); }
  return parts;
});
def('hauts', 'top', 'hoodie', 'Sweat à capuche', [v('Rose', C.rose, 'plain'), v('Lilas', C.lilas, 'stars'), v('Menthe', C.menthe, 'plain'), v('Corail', C.corail, 'hearts'), v('Ciel', C.ciel, 'plain'), v('Jaune', C.jaune, 'dots')], (va) => {
  const m = fabricMat(va.c, va.p), g = new THREE.Group(), rib = fabricMat(va.c, 'plain');
  g.add(M(lathe(shell(0.211, 0.337, 0.008, 10), 48), m));
  const hood = M(new THREE.SphereGeometry(0.05, 28, 20, 0, Math.PI * 2, 0, 1.5), m); hood.position.set(0, 0.335, -0.035); hood.rotation.x = -0.9; hood.scale.set(1.15, 1, 0.9); g.add(hood);
  const pocket = M(new THREE.BoxGeometry(0.06, 0.028, 0.012), m); pocket.position.set(0, 0.245, torsoR(0.245) + 0.011); g.add(pocket);
  for (const sx of [-1, 1]) { const c = M(new THREE.CylinderGeometry(0.0022, 0.0022, 0.05, 6), solidMat(0xffffff)); c.position.set(sx * 0.014, 0.3, torsoR(0.3) + 0.011); g.add(c); }
  return [P('root', g), ...sleeves(m, 0.145, 0.0235, 0.0215, -0.01, rib)];
});
def('hauts', 'top', 'bolero', 'Petite veste', [v('Rose', C.rose, 'sparkle'), v('Blanche', C.blanc, 'plain'), v('Rouge', C.rouge, 'plain'), v('Lilas', C.lilas, 'sparkle'), v('Jaune', C.jaune, 'plain'), v('Bleue', C.marine, 'plain')], (va) => {
  const m = fabricMat(va.c, va.p);
  const body = M(lathe(shell(0.255, 0.337, 0.0085, 8), 48, 0.35, Math.PI * 2 - 0.7), m);
  const trim = M(new THREE.TorusGeometry(torsoR(0.256) + 0.008, 0.004, 8, 40, Math.PI * 2 - 0.7), solidMat(0xffffff, { rough: 0.5 })); trim.rotation.set(Math.PI / 2, 0, 0.35 - Math.PI / 2 + Math.PI / 2); trim.position.y = 0.256;
  const base = M(lathe(shell(0.255, 0.337, 0.0045, 8), 48), fabricMat(0xffffff, 'plain'));
  return [P('root', grp(body, base)), ...sleeves(m, 0.09, 0.0235, 0.0225)];
});

/* ============ BOTTOMS ============ */
const waist = (mat) => M(lathe(shell(0.2, 0.275, 0.0045, 6), 40), mat);
const legTube = (mat, y0, y1, fl = 0, off = 0.004) => {
  // tube from y1 (top) down to y0
  const pts = []; for (let i = 0; i <= 6; i++) { const y = y0 + ((y1 - y0) * i) / 6; const t = Math.max(0, Math.min(1, (0.215 - y) / 0.17)); pts.push([legR(t) + off + (i === 0 ? fl : fl * (1 - i / 6)), y]); }
  return lathe(pts, 24);
};
def('bas', 'bottom', 'jupe', 'Jupe', [v('Rose', C.rose, 'plain'), v('Lilas', C.lilas, 'stars'), v('Menthe', C.menthe, 'dots'), v('Écossaise', C.rouge, 'check'), v('Ciel', C.ciel, 'flowers'), v('Jaune', C.jaune, 'hearts')], (va) => {
  const m = fabricMat(va.c, va.p);
  return [P('root', grp(M(lathe(smooth([[0.0545, 0.275], [0.058, 0.262], [0.082, 0.225], [0.112, 0.18], [0.128, 0.145]], 16), 56), m), M(lathe(shell(0.255, 0.278, 0.0055, 2), 40), fabricMat(va.c, 'plain'))))];
});
def('bas', 'bottom', 'tutu', 'Tutu', [v('Rose', C.rose, 'sparkle'), v('Lilas', C.lilas, 'sparkle'), v('Blanc', C.blanc, 'sparkle'), v('Ciel', C.ciel, 'sparkle'), v('Menthe', C.menthe, 'sparkle'), v('Jaune', C.jaune, 'sparkle')], (va) => {
  const g = new THREE.Group(); const tm = tulleMat(va.c, 0.72);
  for (let i = 0; i < 4; i++) {
    const hemR = 0.135 - i * 0.012, hemY = 0.185 + i * 0.014;
    const geo = lathe(smooth([[0.056, 0.268 - i * 0.002], [0.08 + i * 0.002, 0.245], [hemR * 0.85, hemY + 0.03], [hemR, hemY]], 12), 56);
    warp(geo, (p) => { if (p.y < 0.22) p.y += Math.sin(Math.atan2(p.x, p.z) * 16 + i) * 0.006; });
    const mm = M(geo, tm); mm.renderOrder = 2 + i; g.add(mm);
  }
  g.add(M(lathe(shell(0.255, 0.28, 0.0055, 2), 40), fabricMat(va.c, 'plain')));
  return [P('root', g)];
});
def('bas', 'bottom', 'plisse', 'Jupe plissée', [v('Écossaise', C.marine, 'check'), v('Rose', C.pastel, 'plain'), v('Rouge', C.rouge, 'check'), v('Menthe', C.menthe, 'plain'), v('Lilas', C.lilas, 'plain'), v('Noire', C.noir, 'stars')], (va) => {
  const geo = new THREE.CylinderGeometry(0.056, 0.105, 0.1, 72, 8, true);
  warp(geo, (p) => { const a = Math.atan2(p.x, p.z), k = 1 + Math.cos(a * 18) * 0.055 * ((0.05 - p.y) / 0.1); p.x *= k; p.z *= k; });
  const m = M(geo, fabricMat(va.c, va.p)); m.position.y = 0.2;
  return [P('root', grp(m, M(lathe(shell(0.25, 0.278, 0.0055, 2), 40), fabricMat(va.c, 'plain'))))];
});
def('bas', 'bottom', 'short', 'Short', [v('Jean', C.marine, 'plain'), v('Rose', C.rose, 'dots'), v('Jaune', C.jaune, 'stripes'), v('Menthe', C.menthe, 'stars'), v('Lilas', C.lilas, 'hearts'), v('Corail', C.corail, 'flowers')], (va) => {
  const m = fabricMat(va.c, va.p), g = grp(waist(m));
  for (const sx of [-1, 1]) g.add(at(M(legTube(m, 0.125, 0.215, 0.006), m), sx * LEG_X, 0, 0));
  return [P('root', g)];
});
def('bas', 'bottom', 'pantalon', 'Pantalon', [v('Jean', C.marine), v('Rose', C.rose, 'plain'), v('Lilas', C.lilas, 'stars'), v('Menthe', C.menthe, 'plain'), v('Rouge', C.rouge, 'dots'), v('Jaune', C.jaune, 'plain')], (va) => {
  const m = fabricMat(va.c, va.p), g = grp(waist(m));
  for (const sx of [-1, 1]) g.add(at(M(legTube(m, 0.04, 0.215, 0.012, 0.0045), m), sx * LEG_X, 0, 0));
  return [P('root', g)];
});
def('bas', 'bottom', 'legging', 'Legging', [v('Étoilé', C.violet, 'stars'), v('Rayé', C.noir, 'stripes'), v('Cœurs', C.rose, 'hearts'), v('Arc-en-ciel', C.blanc, 'rainbow'), v('Pois', C.turquoise, 'dots'), v('Rose', C.fuchsia, 'sparkle')], (va) => {
  const m = fabricMat(va.c, va.p), g = grp(waist(m));
  for (const sx of [-1, 1]) g.add(at(M(legTube(m, 0.05, 0.215, 0, 0.0022), m), sx * LEG_X, 0, 0));
  return [P('root', g)];
});

/* ============ DRESSES ============ */
const DV = [v('Bonbon', C.rose, 'sparkle'), v('Glace', C.ciel, 'sparkle'), v('Lavande', C.lilas, 'sparkle'), v('Soleil', C.or, 'sparkle'), v('Rubis', C.rouge, 'plain'), v('Neige', C.blanc, 'sparkle')];
const bodice = (m, y0 = 0.222) => M(lathe(shell(y0, 0.337, 0.0045, 10), 48), m);
const sash = (y, c = 0xffc94d) => { const t = M(new THREE.TorusGeometry(torsoR(y) + 0.006, 0.0055, 10, 40), solidMat(c, { rough: 0.25, metal: 1 })); t.rotation.x = Math.PI / 2; t.position.y = y; return t; };
function puffSleeves(m, size = 0.03) { return ['armL', 'armR'].map((n) => P(n, grp(at(sph(size, m, 1, 0.85, 1, 22), 0, -0.02, 0)))); }
def('robes', 'dress', 'robe_bal', 'Robe de princesse', DV, (va) => {
  const m = fabricMat(va.c, va.p), g = new THREE.Group();
  g.add(bodice(m));
  const skirt = lathe(smooth([[0.0565, 0.262], [0.072, 0.236], [0.1, 0.185], [0.15, 0.115], [0.2, 0.065], [0.235, 0.036]], 28), 72);
  warp(skirt, (p) => { if (p.y < 0.07) p.y += (1 - Math.cos(Math.atan2(p.x, p.z) * 14)) * 0.006; });
  g.add(M(skirt, m));
  const over = lathe(smooth([[0.058, 0.262], [0.078, 0.24], [0.108, 0.19], [0.16, 0.125], [0.21, 0.08], [0.245, 0.05]], 24), 72);
  warp(over, (p) => { if (p.y < 0.09) p.y += (1 - Math.cos(Math.atan2(p.x, p.z) * 11 + 1)) * 0.01; });
  const ov = M(over, tulleMat(va.c, 0.5)); ov.renderOrder = 3; g.add(ov);
  g.add(sash(0.263), at(bow(va.c === C.or ? C.rose : C.fuchsia, 2.2, 'sparkle'), 0, 0.262, -0.07));
  const j = gem(0xff4fa0, 0.0075); j.position.set(0, 0.3, torsoR(0.3) + 0.007); g.add(j);
  return [P('root', g), ...puffSleeves(m)];
});
def('robes', 'dress', 'robe_trapeze', 'Robe trapèze', [v('Rose', C.rose, 'dots'), v('Menthe', C.menthe, 'stars'), v('Jaune', C.jaune, 'hearts'), v('Bleue', C.ciel, 'stripes'), v('Lilas', C.lilas, 'flowers'), v('Corail', C.corail, 'plain')], (va) => {
  const m = fabricMat(va.c, va.p), g = new THREE.Group();
  g.add(bodice(m), M(lathe(smooth([[0.0565, 0.262], [0.08, 0.205], [0.108, 0.15], [0.126, 0.105]], 16), 56), m), sash(0.263, 0xffffff));
  g.add(at(bow(C.fuchsia, 1.4, 'plain'), 0, 0.263, 0.066));
  return [P('root', g), ...sleeves(m, 0.04, 0.0225, 0.0235)];
});
def('robes', 'dress', 'robe_sirene', 'Robe sirène', [v('Lagon', C.turquoise, 'scales'), v('Corail', C.corail, 'scales'), v('Lilas', C.lilas, 'scales'), v('Rose', C.rose, 'scales'), v('Océan', C.marine, 'scales'), v('Perle', C.blanc, 'scales')], (va) => {
  const m = fabricMat(va.c, va.p), g = new THREE.Group(), st = fabricMat(mixHex(va.c), 'sparkle');
  g.add(M(lathe(shell(0.222, 0.318, 0.0045, 8), 48), m));
  g.add(M(lathe(smooth([[0.0565, 0.262], [0.065, 0.22], [0.066, 0.16], [0.065, 0.105], [0.085, 0.066], [0.125, 0.034]], 22), 64), m));
  const fin = lathe(smooth([[0.07, 0.1], [0.11, 0.07], [0.15, 0.035]], 8), 64); warp(fin, (p) => { p.y += Math.max(0, Math.cos(Math.atan2(p.x, p.z) * 8)) * 0.012; });
  const f = M(fin, tulleMat(va.c, 0.65)); f.renderOrder = 3; g.add(f);
  for (const sx of [-1, 1]) { const s = M(new THREE.CylinderGeometry(0.0045, 0.0045, 0.05, 8), st); s.position.set(sx * 0.036, 0.334, 0.012); s.rotation.set(0.1, 0, sx * 0.2); g.add(s); }
  const sh = M(shapeGeo(heartShape(0.01), 0.003, 0.001), solidMat(0xfff0f8, { rough: 0.2, metal: 0.5, coat: 1 })); sh.position.set(0, 0.3, torsoR(0.3) + 0.005); g.add(sh);
  return [P('root', g)];
});
function mixHex(c) { return new THREE.Color(c).lerp(new THREE.Color(0xffffff), 0.4).getHex(); }
def('robes', 'dress', 'robe_ballerine', 'Robe de danseuse', [v('Rose', C.pastel, 'sparkle'), v('Blanche', C.blanc, 'sparkle'), v('Lilas', C.lilas, 'sparkle'), v('Ciel', C.ciel, 'sparkle'), v('Menthe', C.menthe, 'sparkle'), v('Corail', C.corail, 'sparkle')], (va) => {
  const m = fabricMat(va.c, va.p), g = new THREE.Group(), tm = tulleMat(va.c, 0.78);
  g.add(bodice(m, 0.222), M(lathe(shell(0.255, 0.28, 0.0055, 2), 40), m));
  for (let i = 0; i < 6; i++) {
    const hr = 0.17 - i * 0.012, hy = 0.15 + i * 0.012;
    const geo = lathe(smooth([[0.056, 0.27 - i * 0.003], [0.09, 0.245], [hr * 0.8, hy + 0.04], [hr, hy]], 10), 64);
    warp(geo, (p) => { if (p.y < 0.2) p.y += Math.sin(Math.atan2(p.x, p.z) * 18 + i * 1.3) * 0.005; });
    const mm = M(geo, tm); mm.renderOrder = 2 + i; g.add(mm);
  }
  for (const sx of [-1, 1]) { const s = M(new THREE.CylinderGeometry(0.0035, 0.0035, 0.05, 8), m); s.position.set(sx * 0.036, 0.335, 0.012); s.rotation.set(0.1, 0, sx * 0.2); g.add(s); }
  return [P('root', g)];
});
def('robes', 'dress', 'robe_fleurie', 'Robe d\'été', [v('Fleurie', C.ciel, 'flowers'), v('Pois', C.jaune, 'dots'), v('Cœurs', C.pastel, 'hearts'), v('Rayée', C.menthe, 'stripes'), v('Vichy', C.rouge, 'check'), v('Étoiles', C.lilas, 'stars')], (va) => {
  const m = fabricMat(va.c, va.p), g = new THREE.Group();
  g.add(M(lathe(shell(0.222, 0.322, 0.0045, 8), 48), m), M(lathe(smooth([[0.0565, 0.262], [0.085, 0.215], [0.115, 0.165], [0.135, 0.12]], 16), 56), m));
  const hem = M(new THREE.TorusGeometry(0.135, 0.008, 8, 64), m); hem.rotation.x = Math.PI / 2; hem.position.y = 0.12; g.add(hem);
  for (const sx of [-1, 1]) { const s = M(new THREE.CylinderGeometry(0.0045, 0.0045, 0.045, 8), m); s.position.set(sx * 0.037, 0.337, 0.012); s.rotation.set(0.1, 0, sx * 0.2); g.add(s); }
  g.add(at(bow(0xffffff, 1.3, 'plain'), 0, 0.262, 0.066));
  return [P('root', g)];
});
def('robes', 'dress', 'robe_fee', 'Robe de fée', [v('Prairie', C.menthe, 'sparkle'), v('Fleur', C.rose, 'sparkle'), v('Lilas', C.lilas, 'sparkle'), v('Lune', C.ciel, 'sparkle'), v('Soleil', C.jaune, 'sparkle'), v('Forêt', C.vert, 'sparkle')], (va) => {
  const m = fabricMat(va.c, va.p), g = new THREE.Group();
  g.add(bodice(m, 0.222));
  for (let L = 0; L < 2; L++) {
    const geo = lathe(smooth([[0.0565, 0.262], [0.08 + L * 0.01, 0.22], [0.11 + L * 0.015, 0.16], [0.14 + L * 0.02, 0.09 - L * 0.01]], 14), 72);
    warp(geo, (p) => { const k = Math.max(0, (0.15 - p.y) / 0.1); const a = Math.atan2(p.x, p.z) * 7 + L * 0.45; p.y -= Math.abs(Math.sin(a)) * 0.04 * k; });
    const mm = M(geo, L ? tulleMat(va.c, 0.62) : m); if (L) mm.renderOrder = 3; g.add(mm);
  }
  // leaf collar
  for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.283, l = sph(0.012, solidMat(0x8fe8a0, { rough: 0.5 }), 0.6, 1.6, 0.4, 10); l.position.set(Math.sin(a) * 0.053, 0.333, Math.cos(a) * 0.053); l.rotation.set(Math.cos(a) * 1.0, 0, -Math.sin(a) * 1.0); g.add(l); }
  return [P('root', g), ...puffSleeves(m, 0.024)];
});

/* ============ SHOES ============ */
const footPos = (sx) => [sx * LEG_X, 0.0215, 0.012];
const upper = (m, sy = 1) => { const s = sph(0.0275, m, 1.08, 0.95 * sy, 1.95, 22); return s; };
function pair(fn) { return [-1, 1].map((sx) => P('root', at(fn(sx), ...[0, 0, 0]))); }
const SV = [v('Rose', C.rose), v('Rouge', C.rouge), v('Lilas', C.lilas), v('Ciel', C.ciel), v('Menthe', C.menthe), v('Doré', C.or, 'sparkle')];
def('chaussures', 'shoes', 'ballerine', 'Ballerines', SV, (va) => pair((sx) => {
  const m = fabricMat(va.c, va.p === 'plain' ? 'sparkle' : va.p), g = new THREE.Group();
  const u = upper(m, 0.88); u.position.set(...footPos(sx)); g.add(u);
  const rib = M(new THREE.TorusGeometry(0.0195, 0.0025, 8, 20), fabricMat(0xffffff)); rib.rotation.x = Math.PI / 2; rib.position.set(sx * LEG_X, 0.044, 0.0); g.add(rib);
  g.add(at(bow(0xffffff, 0.8, 'plain'), sx * LEG_X, 0.032, 0.044));
  return g;
}));
def('chaussures', 'shoes', 'botte', 'Bottes', [v('Roses', C.rose), v('Blanches', C.blanc), v('Violettes', C.violet), v('Rouges', C.rouge), v('Marron', 0xb67c5a), v('Dorées', C.or, 'sparkle')], (va) => pair((sx) => {
  const m = fabricMat(va.c, va.p === 'plain' ? 'sparkle' : va.p), g = new THREE.Group();
  const u = upper(m); u.position.set(...footPos(sx)); g.add(u);
  const shaft = M(lathe(smooth([[0.0235, 0.03], [0.0255, 0.08], [0.0275, 0.125]], 6), 28), m); shaft.position.x = sx * LEG_X; g.add(shaft);
  const fur = M(new THREE.TorusGeometry(0.028, 0.008, 10, 28), furMat(0xfff7f2)); fur.rotation.x = Math.PI / 2; fur.position.set(sx * LEG_X, 0.125, 0); g.add(fur);
  return g;
}));
def('chaussures', 'shoes', 'basket', 'Baskets', [v('Roses', C.rose), v('Blanches', C.blanc), v('Ciel', C.ciel), v('Menthe', C.menthe), v('Jaunes', C.jaune), v('Arc-en-ciel', C.blanc, 'rainbow')], (va) => pair((sx) => {
  const m = fabricMat(va.c, va.p), g = new THREE.Group(), white = solidMat(0xffffff, { rough: 0.5, coat: 0.3 });
  const u = upper(m, 0.92); u.position.set(...footPos(sx)); u.position.y += 0.002; g.add(u);
  const sole = sph(0.027, white, 1.1, 0.28, 2.05, 22); sole.position.set(sx * LEG_X, 0.006, 0.012); g.add(sole);
  const toe = sph(0.017, white, 1.05, 0.7, 1.0, 16); toe.position.set(sx * LEG_X, 0.017, 0.043); g.add(toe);
  for (let i = 0; i < 3; i++) { const l = M(new THREE.CylinderGeometry(0.0015, 0.0015, 0.024, 6), white); l.rotation.z = Math.PI / 2; l.position.set(sx * LEG_X, 0.036 - i * 0.002, 0.02 + i * 0.011); g.add(l); }
  const st = M(shapeGeo(starPoly(0.008, 0.0035), 0.0015, 0.0005), solidMat(0xffd34d, { rough: 0.3, metal: 0.6 })); st.position.set(sx * LEG_X + sx * 0.025, 0.02, 0.0); st.rotation.y = sx * Math.PI / 2; g.add(st);
  return g;
}));
def('chaussures', 'shoes', 'escarpin', 'Souliers à talon', [v('Rouges', C.rouge, 'sparkle'), v('Roses', C.fuchsia, 'sparkle'), v('Argentés', 0xdfe6f2, 'sparkle'), v('Lilas', C.lilas, 'sparkle'), v('Noirs', C.noir, 'sparkle'), v('Dorés', C.or, 'sparkle')], (va) => pair((sx) => {
  const m = fabricMat(va.c, va.p), g = new THREE.Group();
  const u = upper(m, 0.78); u.position.set(...footPos(sx)); u.position.y = 0.025; g.add(u);
  const heel = M(new THREE.CylinderGeometry(0.0075, 0.005, 0.02, 12), m); heel.position.set(sx * LEG_X, 0.01, -0.022); g.add(heel);
  const b = gem(0xffffff, 0.006); b.position.set(sx * LEG_X, 0.038, 0.04); g.add(b);
  return g;
}));
def('chaussures', 'shoes', 'sandale', 'Sandales', [v('Roses', C.rose), v('Dorées', C.or), v('Turquoise', C.turquoise), v('Blanches', C.blanc), v('Corail', C.corail), v('Lilas', C.lilas)], (va) => pair((sx) => {
  const m = fabricMat(va.c, 'plain'), g = new THREE.Group();
  const sole = sph(0.027, solidMat(0xffe9d8, { rough: 0.5 }), 1.05, 0.22, 2.0, 22); sole.position.set(sx * LEG_X, 0.006, 0.012); g.add(sole);
  for (const z of [0.0, 0.03]) { const s = M(new THREE.TorusGeometry(0.0205, 0.0028, 8, 20, Math.PI), m); s.rotation.set(0, Math.PI / 2, 0); s.rotation.z = 0; s.position.set(sx * LEG_X, 0.008, z + 0.012); g.add(s); }
  const an = M(new THREE.TorusGeometry(0.02, 0.0025, 8, 20), m); an.rotation.x = Math.PI / 2; an.position.set(sx * LEG_X, 0.045, -0.002); g.add(an);
  g.add(at(gem(0xffffff, 0.005), sx * LEG_X, 0.026, 0.03));
  return g;
}));
def('chaussures', 'shoes', 'chausson', 'Chaussons de princesse', [v('Roses', C.rose), v('Bleus', C.ciel), v('Lilas', C.lilas), v('Dorés', C.or), v('Blancs', C.blanc), v('Verts', C.menthe)], (va) => pair((sx) => {
  const m = fabricMat(va.c, 'sparkle'), g = new THREE.Group();
  const u = upper(m, 0.9); u.position.set(...footPos(sx)); g.add(u);
  const tip = M(new THREE.ConeGeometry(0.014, 0.05, 16), m); tip.rotation.x = Math.PI / 2 - 0.5; tip.position.set(sx * LEG_X, 0.035, 0.07); g.add(tip);
  g.add(at(sph(0.009, fabricMat(0xffffff, 'plain'), 1, 1, 1, 12), sx * LEG_X, 0.052, 0.094));
  g.add(at(gem(0xff4fa0, 0.006), sx * LEG_X, 0.04, 0.045));
  return g;
}));

/* ============ HATS (parent head, origin = head centre) ============ */
const HV = [v('Or Rose', C.rose, 'plain', 'gold'), v('Or Bleu', C.ciel, 'plain', 'gold'), v('Argent Lilas', C.lilas, 'plain', 'silver'), v('Or Rubis', C.rouge, 'plain', 'gold'), v('Or Émeraude', C.vert, 'plain', 'gold'), v('Or Rose Perle', 0xffffff, 'plain', 'rose')];
def('chapeaux', 'hat', 'couronne', 'Couronne', HV, (va) => {
  const g = new THREE.Group(), met = metalOf(va.x);
  g.add(M(new THREE.CylinderGeometry(0.087, 0.091, 0.026, 40, 1, true), met));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * 6.283, big = i % 2 === 0, h = big ? 0.05 : 0.032;
    const s = M(new THREE.ConeGeometry(0.0125, h, 14), met); s.position.set(Math.sin(a) * 0.089, 0.013 + h / 2, Math.cos(a) * 0.089); g.add(s);
    const j = gem(big ? va.c : 0xffffff, big ? 0.0085 : 0.0055); j.position.set(Math.sin(a) * 0.089, 0.015 + h, Math.cos(a) * 0.089); g.add(j);
  }
  const front = gem(va.c, 0.011); front.position.set(0, 0.0, 0.093); g.add(front);
  g.position.set(0, 0.072, -0.004); g.rotation.x = -0.12; return [P('head', g)];
});
def('chapeaux', 'hat', 'diademe', 'Diadème', [v('Argent', 0xbfe9ff, 'plain', 'silver'), v('Or', C.rose, 'plain', 'gold'), v('Rose', C.fuchsia, 'plain', 'rose'), v('Lilas', C.lilas, 'plain', 'silver')], (va) => {
  const g = new THREE.Group(), met = metalOf(va.x);
  const arc = M(new THREE.TorusGeometry(0.108, 0.0035, 8, 48, Math.PI * 0.85), met); arc.rotation.z = Math.PI / 2 - Math.PI * 0.425; g.add(arc);
  arc.rotation.set(0, 0, Math.PI / 2 - Math.PI * 0.425);
  const mid = gem(va.c, 0.012); mid.position.set(0, 0.108, 0); g.add(mid);
  for (const sx of [-1, 1]) for (let k = 1; k <= 3; k++) { const a = Math.PI / 2 - sx * k * 0.2, s = gem(k === 3 ? 0xffffff : va.c, 0.007 - k * 0.0008); s.position.set(Math.cos(a) * 0.108, Math.sin(a) * 0.108 + 0.004, 0); g.add(s); }
  const pivot = new THREE.Group(); pivot.add(g); g.rotation.y = 0; pivot.rotation.set(0.45, 0, 0); pivot.position.set(0, 0.0, 0.018);
  return [P('head', pivot)];
});
def('chapeaux', 'hat', 'bonnet', 'Bonnet à pompon', [v('Rose', C.rose, 'stripes'), v('Blanc', C.blanc, 'stars'), v('Lilas', C.lilas, 'hearts'), v('Menthe', C.menthe, 'stripes'), v('Rouge', C.rouge, 'dots'), v('Ciel', C.ciel, 'stars')], (va) => {
  const m = fabricMat(va.c, va.p), g = new THREE.Group();
  g.add(sph(0.112, m, 1, 0.9, 1, 32)); g.children[0].position.y = 0.02;
  const band = M(new THREE.TorusGeometry(0.1, 0.014, 12, 48), fabricMat(va.c, 'plain')); band.rotation.x = Math.PI / 2; band.position.y = -0.012; g.add(band);
  g.add(at(sph(0.025, furMat(0xfff7f2), 1, 1, 1, 16), 0, 0.127, -0.01));
  g.position.set(0, 0.064, -0.004); g.rotation.x = -0.12; return [P('head', g)];
});
def('chapeaux', 'hat', 'paille', 'Chapeau de paille', [v('Rose', C.rose, 'flowers'), v('Bleu', C.ciel, 'flowers'), v('Jaune', C.jaune, 'dots'), v('Lilas', C.lilas, 'flowers')], (va) => {
  const straw = fabricMat(0xf1d28a, 'stripes'), g = new THREE.Group();
  g.add(M(lathe(smooth([[0.06, 0.0], [0.1, -0.002], [0.17, -0.012], [0.2, -0.02]], 10), 64), straw));
  g.add(M(lathe(smooth([[0.1, 0.0], [0.098, 0.04], [0.085, 0.06], [0.0, 0.066]], 10), 48), straw));
  const rib = M(new THREE.TorusGeometry(0.1, 0.008, 10, 48), fabricMat(va.c, 'plain')); rib.rotation.x = Math.PI / 2; rib.position.y = 0.012; g.add(rib);
  g.add(at(bow(va.c, 1.8, 'plain'), 0.07, 0.03, 0.075));
  for (let i = 0; i < 3; i++) { const f = sph(0.011, solidMat([0xffffff, 0xffd34d, 0xff9cc8][i], { rough: 0.5 }), 1, 1, 0.6, 12); f.position.set(0.07 + (i - 1) * 0.02, 0.05 - Math.abs(i - 1) * 0.006, 0.08); g.add(f); }
  g.position.set(0, 0.055, -0.004); g.rotation.x = -0.1; return [P('head', g)];
});
def('chapeaux', 'hat', 'beret', 'Béret', [v('Rouge', C.rouge), v('Rose', C.rose), v('Bleu', C.marine), v('Blanc', C.blanc), v('Lilas', C.lilas), v('Noir', C.noir)], (va) => {
  const m = fabricMat(va.c, va.p), g = new THREE.Group(); g.add(sph(0.12, m, 1, 0.42, 1, 40)); g.add(at(sph(0.009, m, 1, 1.2, 1, 10), 0, 0.05, 0));
  g.position.set(0.014, 0.078, 0.005); g.rotation.set(-0.1, 0, -0.16); return [P('head', g)];
});
def('chapeaux', 'hat', 'hennin', 'Chapeau de princesse', [v('Rose', C.rose, 'sparkle'), v('Lilas', C.lilas, 'sparkle'), v('Ciel', C.ciel, 'sparkle'), v('Doré', C.or, 'sparkle')], (va) => {
  const g = new THREE.Group(), m = fabricMat(va.c, va.p);
  const cone = M(new THREE.ConeGeometry(0.058, 0.2, 32, 1, true), m); cone.position.y = 0.1; g.add(cone);
  const rim = M(new THREE.TorusGeometry(0.058, 0.004, 8, 32), goldMat()); rim.rotation.x = Math.PI / 2; g.add(rim);
  g.add(at(gem(0xffffff, 0.01), 0, 0.2, 0));
  const veil = lathe(smooth([[0.004, 0.2], [0.03, 0.15], [0.07, 0.06], [0.11, -0.04]], 10), 24, Math.PI * 0.75, Math.PI * 0.5);
  const vm = M(veil, tulleMat(va.c, 0.55)); vm.renderOrder = 3; g.add(vm);
  const pivot = new THREE.Group(); pivot.add(g); pivot.position.set(0, 0.06, -0.035); pivot.rotation.x = -0.45; return [P('head', pivot)];
});
def('chapeaux', 'hat', 'oreilles', 'Serre-tête oreilles', [v('de Chat', C.rose, 'plain', 'cat'), v('de Lapin', C.blanc, 'plain', 'bunny'), v('de Chat Noir', C.noir, 'plain', 'cat'), v('d\'Ours', 0xc99a74, 'plain', 'bear')], (va) => {
  const g = new THREE.Group(), m = fabricMat(va.c, 'plain'), inner = solidMat(0xffb0c8, { rough: 0.8 });
  const band = M(new THREE.TorusGeometry(0.108, 0.005, 8, 40, Math.PI), solidMat(0xffffff, { rough: 0.4 })); band.rotation.z = 0; g.add(band);
  for (const sx of [-1, 1]) {
    let e;
    if (va.x === 'bunny') { e = grp(sph(0.026, m, 0.55, 2.4, 0.4, 20), at(sph(0.02, inner, 0.45, 1.9, 0.35, 16), 0, 0, 0.007)); e.position.set(sx * 0.045, 0.145, 0); e.rotation.z = -sx * 0.25; }
    else if (va.x === 'bear') { e = grp(sph(0.028, m, 1, 1, 0.55, 18), at(sph(0.016, inner, 1, 1, 0.5, 12), 0, 0, 0.008)); e.position.set(sx * 0.075, 0.095, 0); }
    else { e = grp(M(new THREE.ConeGeometry(0.03, 0.055, 4), m), at(M(new THREE.ConeGeometry(0.02, 0.04, 4), inner), 0, -0.004, 0.006)); e.position.set(sx * 0.065, 0.105, 0); e.rotation.z = -sx * 0.35; }
    g.add(e);
  }
  const pivot = new THREE.Group(); pivot.add(g); pivot.rotation.set(0.08, 0, 0); return [P('head', pivot)];
});
def('chapeaux', 'hat', 'licorne', 'Serre-tête licorne', [v('Rose', C.rose), v('Lilas', C.lilas), v('Ciel', C.ciel), v('Menthe', C.menthe)], (va) => {
  const g = new THREE.Group(), m = fabricMat(va.c, 'sparkle');
  g.add(M(new THREE.TorusGeometry(0.108, 0.005, 8, 40, Math.PI), solidMat(0xffffff, { rough: 0.4 })));
  const horn = M(new THREE.ConeGeometry(0.018, 0.09, 20), solidMat(0xffe27a, { rough: 0.25, metal: 0.8 })); horn.position.set(0, 0.145, 0.03); horn.rotation.x = 0.25; g.add(horn);
  for (const sx of [-1, 1]) { const e = M(new THREE.ConeGeometry(0.02, 0.045, 4), m); e.position.set(sx * 0.055, 0.1, 0.0); e.rotation.z = -sx * 0.3; g.add(e); const f = sph(0.012, solidMat([C.rose, C.ciel][sx > 0 ? 0 : 1], { rough: 0.5 }), 1, 1, 0.5, 10); f.position.set(sx * 0.03, 0.115, 0.045); g.add(f); }
  const pivot = new THREE.Group(); pivot.add(g); pivot.rotation.x = 0.08; return [P('head', pivot)];
});
def('chapeaux', 'hat', 'couronne_fleurs', 'Couronne de fleurs', [v('Rose', C.rose), v('Jaune', C.jaune), v('Lilas', C.lilas), v('Blanche', C.blanc)], (va) => {
  const g = new THREE.Group();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * 6.283, c = [va.c, 0xffffff, va.c, 0xffd34d][i % 4];
    const f = sph(i % 2 ? 0.014 : 0.018, solidMat(c, { rough: 0.5, coat: 0.2 }), 1, 0.7, 1, 12); f.position.set(Math.sin(a) * 0.098, 0, Math.cos(a) * 0.098); g.add(f);
    if (i % 2 === 0) { const lf = sph(0.011, solidMat(0x7bd68a), 1.6, 0.4, 0.8, 8); lf.position.set(Math.sin(a + 0.2) * 0.098, 0.003, Math.cos(a + 0.2) * 0.098); lf.rotation.y = a; g.add(lf); }
  }
  g.position.set(0, 0.058, -0.004); g.rotation.x = -0.14; return [P('head', g)];
});

/* ============ GLASSES ============ */
const OUT = {
  round: () => { const a = []; for (let i = 0; i < 48; i++) { const t = (i / 48) * 6.283; a.push([Math.cos(t), Math.sin(t)]); } return a; },
  heart: () => { const a = []; for (let i = 0; i < 64; i++) { const t = (i / 64) * 6.283; a.push([(16 * Math.sin(t) ** 3) / 16.5, (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16.5 + 0.1]); } return a; },
  star: () => { const a = []; for (let i = 0; i < 10; i++) { const t = Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 0.5 : 1.1; a.push([Math.cos(t) * r, Math.sin(t) * r + 0.05]); } return a; },
  cat: (sx) => { const a = []; for (let i = 0; i < 48; i++) { const t = (i / 48) * 6.283, x = Math.cos(t); a.push([x * 1.05, Math.sin(t) * 0.72 + 0.4 * Math.pow(Math.max(0, (x * sx + 0.2) / 1.2), 2) * (Math.sin(t) > -0.2 ? 1 : 0.3)]); } return a; },
  square: () => { const a = []; for (let i = 0; i < 48; i++) { const t = (i / 48) * 6.283, c = Math.cos(t), s = Math.sin(t); a.push([Math.sign(c) * Math.pow(Math.abs(c), 0.5) * 1.05, Math.sign(s) * Math.pow(Math.abs(s), 0.5) * 0.8]); } return a; },
  flower: () => { const a = []; for (let i = 0; i < 72; i++) { const t = (i / 72) * 6.283, r = 0.85 + 0.15 * Math.cos(6 * t); a.push([Math.cos(t) * r, Math.sin(t) * r]); } return a; },
};
function lens(kind, R, rim, frameMat, glass, sx) {
  const pts = OUT[kind](sx).map(([x, y]) => new THREE.Vector2(x, y));
  const outer = new THREE.Shape(pts.map((p) => p.clone().multiplyScalar(R)));
  outer.holes.push(new THREE.Path(pts.map((p) => p.clone().multiplyScalar(R - rim)).reverse()));
  const g = new THREE.Group();
  g.add(M(shapeGeo(outer, 0.003, 0.0012), frameMat));
  const lg = new THREE.ShapeGeometry(new THREE.Shape(pts.map((p) => p.clone().multiplyScalar(R - rim * 0.4))));
  const l = new THREE.Mesh(lg, glass); l.position.z = 0.0018; g.add(l);
  return g;
}
function glasses(kind, frameColor, tint, opacity, metal) {
  const R = kind === 'square' ? 0.03 : 0.028, g = new THREE.Group();
  const fm = metal ? metalOf(metal) : solidMat(frameColor, { rough: 0.3, coat: 0.8 });
  for (const sx of [-1, 1]) {
    const l = lens(kind, R, 0.0045, fm, glassMat(tint, opacity), sx);
    l.position.set(sx * 0.034, -0.002, 0.104); l.rotation.y = sx * 0.3; g.add(l);
    const arm = M(new THREE.CylinderGeometry(0.0022, 0.0022, 0.1, 6), fm); arm.rotation.set(Math.PI / 2, 0, 0); arm.position.set(sx * 0.0925, -0.003, 0.05); arm.rotation.z = 0; arm.rotation.y = 0; arm.rotation.x = Math.PI / 2 - 0.0; arm.rotation.set(Math.PI / 2, 0, 0); g.add(arm);
    arm.rotation.set(Math.PI / 2, 0, 0); arm.rotation.z = sx * -0.0;
  }
  const br = M(new THREE.CylinderGeometry(0.0022, 0.0022, 0.016, 6), fm); br.rotation.z = Math.PI / 2; br.position.set(0, 0.006, 0.108); g.add(br);
  return [P('head', g)];
}
def('lunettes', 'glasses', 'l_ronde', 'Lunettes rondes', [v('Roses', C.rose, 'plain', 0), v('Dorées', C.or, 'plain', 'gold'), v('Bleues', C.ciel), v('Violettes', C.violet), v('Rouges', C.rouge), v('Noires', C.noir)], (va) => glasses('round', va.c, 0xffffff, 0.18, va.x || 0));
def('lunettes', 'glasses', 'l_coeur', 'Lunettes cœur', [v('Roses', C.fuchsia), v('Rouges', C.rouge), v('Lilas', C.lilas), v('Blanches', C.blanc)], (va) => glasses('heart', va.c, va.c, 0.35, 0));
def('lunettes', 'glasses', 'l_etoile', 'Lunettes étoile', [v('Jaunes', C.jaune), v('Roses', C.rose), v('Argent', 0xdfe6f2, 'plain', 'silver'), v('Turquoise', C.turquoise)], (va) => glasses('star', va.c, va.c, 0.35, va.x || 0));
def('lunettes', 'glasses', 'l_chat', 'Lunettes papillon', [v('Roses', C.rose), v('Noires', C.noir), v('Lilas', C.lilas), v('Rouges', C.rouge), v('Bleues', C.ciel)], (va) => glasses('cat', va.c, 0xffffff, 0.2, 0));
def('lunettes', 'glasses', 'l_soleil', 'Lunettes de soleil', [v('Noires', C.noir), v('Roses', C.fuchsia), v('Turquoise', C.turquoise), v('Jaunes', C.jaune)], (va) => glasses('square', va.c, 0x2a1f36, 0.88, 0));
def('lunettes', 'glasses', 'l_fleur', 'Lunettes fleur', [v('Roses', C.rose), v('Jaunes', C.jaune), v('Ciel', C.ciel), v('Menthe', C.menthe)], (va) => glasses('flower', va.c, va.c, 0.3, 0));

/* ============ JEWELLERY ============ */
def('bijoux', 'necklace', 'c_perles', 'Collier de perles', [v('Perles', 0xfff6f2), v('Rose', 0xffb3d4), v('Lilas', 0xd3c0ff), v('Bleu', 0xa9ddff)], (va) => {
  const g = new THREE.Group(), m = va.c === 0xfff6f2 ? pearlMat() : solidMat(va.c, { rough: 0.15, coat: 1 });
  for (let i = 0; i < 30; i++) { const a = (i / 30) * 6.283, d = 0.022 * Math.pow(Math.max(0, Math.cos(a)), 2); const b = sph(0.0058, m, 1, 1, 1, 12); b.position.set(Math.sin(a) * 0.057, 0.33 - d, Math.cos(a) * 0.057); g.add(b); }
  return [P('root', g)];
});
def('bijoux', 'necklace', 'c_coeur', 'Pendentif cœur', [v('Rose', C.fuchsia, 'plain', 'gold'), v('Rouge', C.rouge, 'plain', 'gold'), v('Bleu', C.ciel, 'plain', 'silver'), v('Violet', C.violet, 'plain', 'silver')], (va) => {
  const g = new THREE.Group(), met = metalOf(va.x);
  for (let i = 0; i < 40; i++) { const a = (i / 40) * 6.283, d = 0.03 * Math.pow(Math.max(0, Math.cos(a)), 2); const b = sph(0.0022, met, 1, 1, 1, 6); b.position.set(Math.sin(a) * 0.057, 0.333 - d, Math.cos(a) * 0.057); g.add(b); }
  const h = M(shapeGeo(heartShape(0.011), 0.004, 0.0015), gemMat(va.c)); h.position.set(0, 0.296, 0.063); g.add(h);
  return [P('root', g)];
});
def('bijoux', 'necklace', 'c_etoile', 'Collier étoile', [v('Doré', C.or, 'plain', 'gold'), v('Argent', 0xdfe6f2, 'plain', 'silver'), v('Rose', 0xf5a58f, 'plain', 'rose')], (va) => {
  const g = new THREE.Group(), met = metalOf(va.x);
  for (let i = 0; i < 40; i++) { const a = (i / 40) * 6.283, d = 0.026 * Math.pow(Math.max(0, Math.cos(a)), 2); const b = sph(0.0022, met, 1, 1, 1, 6); b.position.set(Math.sin(a) * 0.057, 0.333 - d, Math.cos(a) * 0.057); g.add(b); }
  const s = M(shapeGeo(starPoly(0.014, 0.006), 0.004, 0.0015), met); s.position.set(0, 0.302, 0.063); g.add(s);
  return [P('root', g)];
});
def('bijoux', 'necklace', 'c_fleurs', 'Collier de fleurs', [v('Rose', C.rose), v('Jaune', C.jaune), v('Lilas', C.lilas)], (va) => {
  const g = new THREE.Group();
  for (let i = 0; i < 18; i++) { const a = (i / 18) * 6.283, d = 0.02 * Math.pow(Math.max(0, Math.cos(a)), 2); const f = sph(0.01, solidMat(i % 3 === 0 ? 0xffffff : va.c, { rough: 0.5 }), 1, 0.8, 1, 10); f.position.set(Math.sin(a) * 0.058, 0.33 - d, Math.cos(a) * 0.058); g.add(f); if (i % 2) { const l = sph(0.007, solidMat(0x7bd68a), 1.5, 0.5, 0.8, 8); l.position.copy(f.position).add(new THREE.Vector3(0.0, -0.007, 0)); g.add(l); } }
  return [P('root', g)];
});
def('bijoux', 'earrings', 'b_perles', 'Boucles perles', [v('Perles', 0xfff6f2), v('Roses', 0xffb3d4), v('Bleues', 0xa9ddff)], (va) => {
  const g = new THREE.Group(), m = va.c === 0xfff6f2 ? pearlMat() : solidMat(va.c, { rough: 0.15, coat: 1 });
  for (const sx of [-1, 1]) { g.add(at(sph(0.009, m, 1, 1, 1, 14), sx * 0.1, -0.034, 0.05)); g.add(at(sph(0.012, m, 1, 1, 1, 14), sx * 0.1, -0.056, 0.05)); }
  return [P('head', g)];
});
def('bijoux', 'earrings', 'b_etoiles', 'Boucles étoiles', [v('Dorées', C.or, 'plain', 'gold'), v('Argent', 0xdfe6f2, 'plain', 'silver'), v('Roses', 0xf5a58f, 'plain', 'rose')], (va) => {
  const g = new THREE.Group();
  for (const sx of [-1, 1]) { const s = M(shapeGeo(starPoly(0.014, 0.006), 0.003, 0.001), metalOf(va.x)); s.position.set(sx * 0.1, -0.058, 0.05); s.rotation.y = sx * 0.5; g.add(s); g.add(at(sph(0.004, metalOf(va.x)), sx * 0.1, -0.036, 0.05)); }
  return [P('head', g)];
});
def('bijoux', 'earrings', 'b_coeurs', 'Boucles cœurs', [v('Roses', C.fuchsia), v('Rouges', C.rouge), v('Violettes', C.violet)], (va) => {
  const g = new THREE.Group();
  for (const sx of [-1, 1]) { const s = M(shapeGeo(heartShape(0.0095), 0.003, 0.001), gemMat(va.c)); s.position.set(sx * 0.1, -0.05, 0.05); s.rotation.y = sx * 0.5; g.add(s); g.add(at(sph(0.004, goldMat()), sx * 0.1, -0.036, 0.05)); }
  return [P('head', g)];
});
const bracelet = (fn) => ['armL', 'armR'].map((n, i) => P(n, fn(i)));
def('bijoux', 'bracelet', 'br_perles', 'Bracelet perles', [v('Perles', 0xfff6f2), v('Roses', 0xffb3d4), v('Arc-en-ciel', 0xffffff, 'rainbow'), v('Bleus', 0xa9ddff)], (va) => bracelet(() => {
  const g = new THREE.Group(), cols = [0xff8fa8, 0xffd27a, 0xa8f0a0, 0x8fd0ff, 0xc9a0ff];
  for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.283, m = va.p === 'rainbow' ? solidMat(cols[i % 5], { rough: 0.2, coat: 1 }) : va.c === 0xfff6f2 ? pearlMat() : solidMat(va.c, { rough: 0.15, coat: 1 }); const b = sph(0.0045, m, 1, 1, 1, 10); b.position.set(Math.sin(a) * 0.0195, -0.14, Math.cos(a) * 0.0195); g.add(b); }
  return g;
}));
def('bijoux', 'bracelet', 'br_charm', 'Bracelet à breloques', [v('Doré', C.or, 'plain', 'gold'), v('Argent', 0xdfe6f2, 'plain', 'silver'), v('Rose', 0xf5a58f, 'plain', 'rose')], (va) => bracelet((i) => {
  const g = new THREE.Group(), t = M(new THREE.TorusGeometry(0.0195, 0.0025, 8, 28), metalOf(va.x)); t.rotation.x = Math.PI / 2; t.position.y = -0.14; g.add(t);
  const h = M(shapeGeo(heartShape(0.0055), 0.002, 0.0008), gemMat(0xff4fa0)); h.position.set(0, -0.15, 0.021); g.add(h);
  const s = M(shapeGeo(starPoly(0.006, 0.0028), 0.002, 0.0008), metalOf(va.x)); s.position.set(0.012, -0.149, 0.017); g.add(s);
  return g;
}));
def('bijoux', 'bracelet', 'br_ruban', 'Bracelet ruban', [v('Rose', C.rose, 'dots'), v('Lilas', C.lilas, 'stars'), v('Ciel', C.ciel, 'hearts'), v('Jaune', C.jaune, 'stripes')], (va) => bracelet((i) => {
  const g = new THREE.Group(), b = M(new THREE.CylinderGeometry(0.0195, 0.0195, 0.012, 24, 1, true), fabricMat(va.c, va.p)); b.position.y = -0.14; g.add(b); g.add(at(bow(va.c, 0.7, 'plain'), 0, -0.14, 0.021)); return g;
}));

/* ============ MAGIC / ACCESSORIES ============ */
const glowMat = (c) => new THREE.SpriteMaterial({ map: sparkGlow(), color: c, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
let _glow; const sparkGlow = () => _glow || (_glow = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }));
const heldPose = (g, tilt = 1.15) => { const p = new THREE.Group(); p.position.set(0.0, -0.165, 0.008); p.rotation.x = tilt; p.add(g); return p; };
def('access', 'handR', 'baguette', 'Baguette magique', [v('Rose', C.rose), v('Dorée', C.or), v('Bleue', C.ciel), v('Violette', C.violet)], (va) => {
  const g = new THREE.Group();
  const stick = M(new THREE.CylinderGeometry(0.0035, 0.0045, 0.22, 10), solidMat(0xffffff, { rough: 0.3, coat: 1 })); stick.position.y = 0.07; g.add(stick);
  const star = M(shapeGeo(starPoly(0.032, 0.014), 0.008, 0.002), solidMat(va.c, { rough: 0.2, metal: 0.4, coat: 1, emissive: va.c, ei: 0.4 })); star.position.set(0, 0.2, -0.004); g.add(star);
  const sp = new THREE.Sprite(glowMat(va.c)); sp.scale.setScalar(0.1); sp.position.set(0, 0.2, 0); g.add(sp);
  for (let i = 0; i < 6; i++) { const r = M(new THREE.TorusGeometry(0.005, 0.0012, 6, 12), solidMat(va.c, { rough: 0.3 })); r.position.y = -0.03 + i * 0.03; r.rotation.x = Math.PI / 2; g.add(r); }
  return [P('armR', heldPose(g, 0.55))];
});
def('access', 'handR', 'sceptre', 'Sceptre royal', [v('Or Rose', C.fuchsia), v('Or Bleu', C.ciel), v('Or Violet', C.violet)], (va) => {
  const g = new THREE.Group();
  const stick = M(new THREE.CylinderGeometry(0.004, 0.005, 0.2, 10), goldMat()); stick.position.y = 0.06; g.add(stick);
  const h = M(shapeGeo(heartShape(0.022), 0.01, 0.003), gemMat(va.c)); h.position.set(0, 0.19, -0.005); g.add(h);
  const sp = new THREE.Sprite(glowMat(va.c)); sp.scale.setScalar(0.08); sp.position.set(0, 0.19, 0); g.add(sp);
  const ring = M(new THREE.TorusGeometry(0.018, 0.0025, 8, 24), goldMat()); ring.position.set(0, 0.155, 0); ring.rotation.x = Math.PI / 2; g.add(ring);
  return [P('armR', heldPose(g, 0.55))];
});
def('access', 'handR', 'bouquet', 'Bouquet de fleurs', [v('Roses', C.rose), v('Jaunes', C.jaune), v('Lilas', C.lilas), v('Arc-en-ciel', 0xffffff, 'rainbow')], (va) => {
  const g = new THREE.Group(), cols = [0xff8fa8, 0xffd27a, 0xc9a0ff, 0x8fd0ff, 0xffffff];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * 6.283, tilt = i ? 0.35 : 0;
    const stem = M(new THREE.CylinderGeometry(0.0018, 0.0018, 0.1, 6), solidMat(0x5fbf72)); stem.position.set(Math.sin(a) * tilt * 0.05, 0.05, Math.cos(a) * tilt * 0.05); stem.rotation.set(Math.cos(a) * tilt, 0, -Math.sin(a) * tilt); g.add(stem);
    const f = sph(0.013, solidMat(va.p === 'rainbow' ? cols[i % 5] : (i % 3 === 0 ? 0xffffff : va.c), { rough: 0.5, coat: 0.2 }), 1, 0.8, 1, 12); f.position.set(Math.sin(a) * tilt * 0.1, 0.105 + (i ? 0 : 0.015), Math.cos(a) * tilt * 0.1); g.add(f);
    g.add(at(sph(0.005, solidMat(0xffd34d), 1, 1, 1, 8), f.position.x, f.position.y + 0.007, f.position.z));
  }
  g.add(at(bow(0xffffff, 1, 'plain'), 0, 0.01, 0.012));
  return [P('armR', heldPose(g, 0.5))];
});
def('access', 'handR', 'ombrelle', 'Ombrelle', [v('Rose', C.rose, 'dots'), v('Blanche', C.blanc, 'flowers'), v('Ciel', C.ciel, 'stripes'), v('Lilas', C.lilas, 'hearts')], (va) => {
  const g = new THREE.Group();
  const stick = M(new THREE.CylinderGeometry(0.0028, 0.0028, 0.2, 8), goldMat()); stick.position.y = 0.06; g.add(stick);
  const top = M(new THREE.SphereGeometry(0.075, 36, 14, 0, Math.PI * 2, 0, Math.PI * 0.42), fabricMat(va.c, va.p)); top.scale.y = 0.65; top.position.y = 0.14; g.add(top);
  const rim = M(new THREE.TorusGeometry(0.0745 * Math.sin(Math.PI * 0.42), 0.003, 8, 40), goldMat()); rim.rotation.x = Math.PI / 2; rim.position.y = 0.14 + 0.075 * 0.65 * Math.cos(Math.PI * 0.42); g.add(rim);
  g.add(at(sph(0.006, goldMat()), 0, 0.14 + 0.075 * 0.65, 0));
  return [P('armR', heldPose(g, 0.5))];
});
function teddy(c, s = 1) {
  const g = new THREE.Group(), m = furMat(c), inner = furMat(0xffe3d0);
  g.add(sph(0.034 * s, m, 1, 1.1, 0.9, 22)); g.children[0].position.y = -0.0;
  const head = sph(0.027 * s, m, 1, 0.95, 0.95, 22); head.position.y = 0.045 * s; g.add(head);
  for (const sx of [-1, 1]) { g.add(at(sph(0.011 * s, m, 1, 1, 0.6, 12), sx * 0.02 * s, 0.067 * s, 0)); g.add(at(sph(0.0085 * s, inner, 1, 1, 0.5, 10), sx * 0.02 * s, 0.067 * s, 0.003 * s)); g.add(at(sph(0.01 * s, m, 1, 1.5, 1, 10), sx * 0.04 * s, 0.005 * s, 0.006 * s)); g.add(at(sph(0.012 * s, m, 1, 1.2, 1.2, 10), sx * 0.021 * s, -0.036 * s, 0.01 * s)); g.add(at(sph(0.0035 * s, solidMat(0x2a1f36, { rough: 0.2 }), 1, 1, 1, 8), sx * 0.01 * s, 0.05 * s, 0.025 * s)); }
  g.add(at(sph(0.011 * s, inner, 1, 0.8, 0.8, 12), 0, 0.038 * s, 0.025 * s)); g.add(at(sph(0.004 * s, solidMat(0x2a1f36, { rough: 0.2 }), 1, 0.8, 0.8, 8), 0, 0.041 * s, 0.033 * s));
  g.add(at(bow(0xff5fa8, 0.9 * s, 'dots'), 0, 0.02 * s, 0.03 * s));
  return g;
}
export { teddy };
def('access', 'handL', 'peluche', 'Doudou', [v('Ourson', 0xc99a74), v('Rose', 0xffa8cf), v('Blanc', 0xfff3f8), v('Lilas', 0xcdb7ff)], (va) => [P('armL', at(teddy(va.c), 0, -0.2, 0.02))]);
def('access', 'handL', 'sac', 'Sac à main', [v('Rose', C.rose, 'sparkle'), v('Rouge', C.rouge, 'dots'), v('Lilas', C.lilas, 'stars'), v('Jaune', C.jaune, 'hearts'), v('Ciel', C.ciel, 'flowers'), v('Blanc', C.blanc, 'sparkle')], (va) => {
  const g = new THREE.Group(), m = fabricMat(va.c, va.p);
  const box = M(new THREE.BoxGeometry(0.06, 0.045, 0.026, 1, 1, 1), m); warp(box.geometry, (p) => { p.x *= 1; return p; }); g.add(box); box.position.y = -0.045;
  g.add(M(new THREE.TorusGeometry(0.02, 0.0022, 8, 24, Math.PI), goldMat()));
  g.children[1].position.y = -0.025; g.add(at(gem(0xffffff, 0.006), 0, -0.035, 0.0145));
  const bm = M(new THREE.BoxGeometry(0.062, 0.006, 0.028), goldMat()); bm.position.y = -0.0245; g.add(bm);
  return [P('armL', at(g, 0, -0.145, 0.0))];
});
def('access', 'handL', 'ballon', 'Ballon', [v('Cœur Rose', C.fuchsia, 'plain', 'heart'), v('Cœur Rouge', C.rouge, 'plain', 'heart'), v('Étoile', C.jaune, 'plain', 'star'), v('Rond Lilas', C.lilas, 'plain', 'round'), v('Rond Ciel', C.ciel, 'plain', 'round')], (va) => {
  const g = new THREE.Group(), m = solidMat(va.c, { rough: 0.1, coat: 1 });
  const string = M(new THREE.CylinderGeometry(0.0008, 0.0008, 0.24, 4), solidMat(0xffffff)); string.position.y = 0.12 - 0.165; g.add(string);
  let b;
  if (va.x === 'heart') b = M(shapeGeo(heartShape(0.045), 0.04, 0.02), m);
  else if (va.x === 'star') b = M(shapeGeo(starPoly(0.06, 0.03), 0.03, 0.02), m);
  else b = sph(0.05, m, 1, 1.15, 1, 28);
  b.position.set(0, 0.14, 0); if (va.x !== 'round') b.position.z = -0.02; g.add(b);
  g.add(at(sph(0.004, m), 0, 0.075 - 0.0, 0));
  return [P('armL', at(g, 0, -0.165, 0.0))];
});
function wingGeo(s = 1) {
  const sh = new THREE.Shape();
  sh.moveTo(0, 0); sh.bezierCurveTo(0.03 * s, 0.14 * s, 0.14 * s, 0.26 * s, 0.24 * s, 0.2 * s); sh.bezierCurveTo(0.31 * s, 0.15 * s, 0.2 * s, 0.04 * s, 0.1 * s, 0.01 * s); sh.bezierCurveTo(0.2 * s, -0.02 * s, 0.22 * s, -0.12 * s, 0.14 * s, -0.15 * s); sh.bezierCurveTo(0.07 * s, -0.16 * s, 0.02 * s, -0.08 * s, 0, 0);
  const g = new THREE.ShapeGeometry(sh, 24);
  g.computeBoundingBox(); const b = g.boundingBox, uv = g.attributes.uv, p = g.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (p.getX(i) - b.min.x) / (b.max.x - b.min.x), (p.getY(i) - b.min.y) / (b.max.y - b.min.y));
  return g;
}
def('access', 'back', 'ailes_fee', 'Ailes de fée', [v('Arc-en-ciel', 0xdff3ff), v('Roses', 0xffc4e4), v('Lilas', 0xd8c4ff), v('Dorées', 0xffe6a0)], (va) => {
  const g = new THREE.Group(), geo = wingGeo(0.8);
  const wm = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: patternTexture('sparkle', va.c), transparent: true, opacity: 0.72, roughness: 0.15, iridescence: 1, iridescenceIOR: 1.6, side: THREE.DoubleSide, depthWrite: false, emissive: va.c, emissiveIntensity: 0.12 });
  for (const sx of [-1, 1]) { const w = new THREE.Mesh(geo, wm); w.renderOrder = 4; const holder = new THREE.Group(); w.scale.x = sx; w.rotation.z = 0.15 + 0; holder.add(w); holder.position.set(sx * 0.012, 0.29, -0.058); holder.rotation.y = sx * -0.45; g.add(holder); }
  return [P('root', g)];
});
def('access', 'back', 'ailes_ange', 'Ailes d\'ange', [v('Blanches', 0xffffff), v('Roses', 0xffd3e8), v('Bleues', 0xcfe9ff)], (va) => {
  const g = new THREE.Group(), m = solidMat(va.c, { rough: 0.7 });
  for (const sx of [-1, 1]) {
    const h = new THREE.Group();
    for (let r = 0; r < 3; r++) for (let i = 0; i < 6 - r; i++) { const f = sph(0.017 - r * 0.002, m, 0.5, 2.2 - r * 0.3, 0.3, 12); const a = 0.3 + i * 0.22; f.position.set(Math.sin(a) * (0.03 + i * 0.022 + r * 0.01), 0.04 + Math.cos(a) * 0.04 - r * 0.03 + i * 0.012, -r * 0.004); f.rotation.z = -a + 0.3; h.add(f); }
    h.position.set(sx * 0.012, 0.28, -0.062); h.scale.set(sx * 1.6, 1.6, 1.6); h.rotation.y = sx * -0.5; g.add(h);
  }
  return [P('root', g)];
});
def('access', 'back', 'cape', 'Cape royale', [v('Rouge', C.rouge, 'plain'), v('Rose', C.rose, 'sparkle'), v('Violette', C.violet, 'sparkle'), v('Bleue', C.marine, 'sparkle')], (va) => {
  const g = new THREE.Group(), m = fabricMat(va.c, va.p);
  g.add(M(lathe(smooth([[0.072, 0.345], [0.098, 0.3], [0.118, 0.22], [0.14, 0.12], [0.16, 0.05]], 14), 48, Math.PI * 0.38, Math.PI * 1.24), m));
  const fur = M(new THREE.TorusGeometry(0.068, 0.012, 10, 40, Math.PI * 1.3), furMat(0xfff7f2)); fur.rotation.set(Math.PI / 2, 0, Math.PI * 0.2 + Math.PI / 2 - 0.0); fur.position.y = 0.34; fur.rotation.z = Math.PI * 0.5 + Math.PI * 0.15 + 0.0; g.add(fur);
  const hemF = M(lathe([[0.16, 0.06], [0.1605, 0.045]], 4), furMat(0xfff7f2)); g.add(at(gem(0xffd34d, 0.008), 0, 0.338, 0.07));
  return [P('root', g)];
});
def('access', 'back', 'sac_dos', 'Sac à dos', [v('Licorne', C.rose, 'hearts'), v('Menthe', C.menthe, 'stars'), v('Lilas', C.lilas, 'dots'), v('Jaune', C.jaune, 'flowers')], (va) => {
  const g = new THREE.Group(), m = fabricMat(va.c, va.p);
  const b = sph(0.05, m, 0.9, 1.05, 0.55, 24); b.position.set(0, 0.275, -0.068); g.add(b);
  g.add(at(sph(0.028, m, 1, 0.8, 0.5, 16), 0, 0.26, -0.098));
  for (const sx of [-1, 1]) { const s = M(new THREE.TorusGeometry(0.038, 0.004, 8, 24, Math.PI), fabricMat(0xffffff)); s.rotation.set(0, Math.PI / 2, 0); s.scale.set(1, 1, 1); s.position.set(sx * 0.034, 0.29, -0.03); s.rotation.x = Math.PI / 2 * 0; g.add(s); }
  g.add(at(bow(C.fuchsia, 1, 'plain'), 0.0, 0.31, -0.096));
  return [P('root', g)];
});

/* ============ Preview builder ============ */
export function buildPreview(item, ctx = {}, fit = 0.1) {
  const parts = item.build(ctx), g = new THREE.Group();
  for (const p of parts) {
    const mt = MOUNTS[p.parent] || MOUNTS.root, h = new THREE.Group();
    h.position.set(...mt.pos); if (mt.rotZ) h.rotation.z = mt.rotZ; if (mt.scale) h.scale.set(...mt.scale);
    h.add(p.obj); g.add(h);
  }
  const box = new THREE.Box3().setFromObject(g), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
  const s = fit / Math.max(size.x, size.y * 0.95, size.z, 0.001);
  const inner = new THREE.Group(); g.position.sub(c); inner.add(g); inner.scale.setScalar(s);
  const out = new THREE.Group(); out.add(inner);
  out.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  return out;
}
