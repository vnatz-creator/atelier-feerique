import * as THREE from 'three';
import { canvasTex, rr, M, sph, warp, fabricMat, solidMat, goldMat, glassMat, tulleMat, furMat, shapeGeo, heartShape, starPoly, bow, lathe, smooth, patternTexture } from './util.js';
import { teddy } from './catalog.js';
import { sparkTex } from './fx.js';

const rnd = (() => { let s = 11; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
const box = (w, h, d, mat, cast = false) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.castShadow = cast; m.receiveShadow = true; return m; };
const std = (color, rough = 0.6, metal = 0) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };

export function makeEnvironment(renderer) {
  const s = new THREE.Scene();
  const sky = canvasTex(8, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#fff2fa'); gr.addColorStop(0.5, '#ffd3ea'); gr.addColorStop(1, '#e8c9ff'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  s.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.MeshBasicMaterial({ map: sky, side: THREE.BackSide })));
  const lamp = (x, y, z, w, h, c, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(i), side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); s.add(m); };
  lamp(-4, 5, 4, 5, 3, 0xfff1e0, 6); lamp(5, 3, -2, 3, 4, 0xffd6ec, 3); lamp(0, 6, 0, 4, 4, 0xffffff, 2.5); lamp(-3, 2, -6, 5, 3, 0xe9d4ff, 2);
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(s, 0.03).texture; pm.dispose();
  return tex;
}

function woodTex() {
  return canvasTex(1024, 1024, (g, W, H) => {
    const n = 8, pw = W / n; let s = 5; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < n; i++) {
      const base = [0xf3dcc0, 0xefd3b4, 0xf6e0c8, 0xeacbab][i % 4];
      g.fillStyle = '#' + base.toString(16); g.fillRect(i * pw, 0, pw, H);
      for (let k = 0; k < 70; k++) { g.fillStyle = `rgba(150,100,60,${0.03 + r() * 0.05})`; g.fillRect(i * pw + r() * pw, 0, 1 + r() * 2, H); }
      for (let k = 0; k < 6; k++) { g.fillStyle = 'rgba(255,255,255,0.1)'; g.fillRect(i * pw + r() * pw, r() * H, 1, 80 + r() * 200); }
      g.fillStyle = 'rgba(120,80,50,0.35)'; g.fillRect(i * pw, 0, 3, H);
      const cut = r() * H; g.fillRect(i * pw, cut, pw, 3);
    }
  }, { repeat: [3, 3] });
}
function wallTex() {
  return canvasTex(512, 512, (g, W, H) => {
    g.fillStyle = '#ffd3e6'; g.fillRect(0, 0, W, H);
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(255,255,255,0.25)'); gr.addColorStop(1, 'rgba(255,170,210,0.15)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,0.7)';
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      const x = 64 + c * 128 + (r % 2) * 64, y = 64 + r * 128;
      if ((r + c) % 2) { g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); }
      else { g.save(); g.translate(x, y); g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rad = i % 2 ? 6 : 14; g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rad, Math.sin(a) * rad); } g.closePath(); g.fillStyle = 'rgba(255,255,255,0.85)'; g.fill(); g.restore(); }
    }
    g.fillStyle = 'rgba(255,150,200,0.35)';
    for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(rnd() * W, rnd() * H, 3, 0, 7); g.fill(); }
  }, { repeat: [3, 1.6] });
}
function skyTex() {
  return canvasTex(1024, 768, (g, W, H) => {
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#8e7cf0'); gr.addColorStop(0.45, '#ffa9d6'); gr.addColorStop(0.8, '#ffd9b0'); gr.addColorStop(1, '#fff0c9');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    const sun = g.createRadialGradient(W * 0.7, H * 0.78, 0, W * 0.7, H * 0.78, 260); sun.addColorStop(0, 'rgba(255,250,220,1)'); sun.addColorStop(0.3, 'rgba(255,230,180,0.7)'); sun.addColorStop(1, 'rgba(255,200,200,0)');
    g.fillStyle = sun; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + rnd() * 0.7})`; g.beginPath(); g.arc(rnd() * W, rnd() * H * 0.5, 1 + rnd() * 2.2, 0, 7); g.fill(); }
    const cloud = (x, y, s, a) => { g.fillStyle = `rgba(255,255,255,${a})`; for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(x + (i - 2.5) * 38 * s, y + Math.sin(i * 1.7) * 10 * s, 60 * s, 30 * s, 0, 0, 7); g.fill(); } };
    cloud(250, 420, 1.2, 0.8); cloud(760, 330, 1.0, 0.7); cloud(480, 560, 1.6, 0.6); cloud(900, 600, 1.1, 0.7);
    // crescent moon
    g.fillStyle = '#fff7d6'; g.beginPath(); g.arc(210, 130, 44, 0, 7); g.fill(); g.fillStyle = '#a07fe8'; g.beginPath(); g.arc(234, 118, 40, 0, 7); g.fill();
  });
}
function rugTex() {
  return canvasTex(512, 512, (g, W) => {
    const c = W / 2, rings = [['#fff5fa', 256], ['#ffc2de', 232], ['#fff5fa', 190], ['#ffa6cf', 150], ['#fff5fa', 100], ['#ffd9ea', 70]];
    for (const [col, r] of rings) { g.fillStyle = col; g.beginPath(); g.arc(c, c, r, 0, 7); g.fill(); }
    // scalloped edge
    for (let i = 0; i < 36; i++) { const a = (i / 36) * 6.283; g.fillStyle = '#ffa6cf'; g.beginPath(); g.arc(c + Math.cos(a) * 240, c + Math.sin(a) * 240, 14, 0, 7); g.fill(); }
    for (let i = 0; i < 9000; i++) { const a = rnd() * 6.283, r = Math.sqrt(rnd()) * 255; g.fillStyle = `rgba(255,255,255,${rnd() * 0.18})`; g.fillRect(c + Math.cos(a) * r, c + Math.sin(a) * r, 2, 2); g.fillStyle = `rgba(230,120,170,${rnd() * 0.08})`; g.fillRect(c + Math.cos(a) * r, c + Math.sin(a) * r, 2, 2); }
  });
}
function unicorn(color = 0xffffff) {
  const g = new THREE.Group(), m = furMat(color), mane = fabricMat(0xff9ccf, 'sparkle');
  g.add(sph(0.07, m, 1.2, 0.95, 0.9)); const h = sph(0.045, m, 1, 1, 1); h.position.set(0.075, 0.07, 0); g.add(h);
  const horn = M(new THREE.ConeGeometry(0.012, 0.055, 12), goldMat()); horn.position.set(0.09, 0.13, 0); horn.rotation.z = -0.3; g.add(horn);
  for (const z of [-0.03, 0.03]) { g.add(at(M(new THREE.CapsuleGeometry(0.016, 0.04, 4, 8), m), 0.05, -0.07, z)); g.add(at(M(new THREE.CapsuleGeometry(0.016, 0.04, 4, 8), m), -0.05, -0.07, z)); g.add(at(sph(0.012, m, 0.8, 1.4, 0.5, 8), 0.085, 0.115, z * 0.8)); }
  for (let i = 0; i < 5; i++) g.add(at(sph(0.018, mane, 1, 1, 0.8, 10), 0.03 - i * 0.025, 0.08 - i * 0.012, 0));
  g.add(at(sph(0.02, mane, 1, 1, 1, 10), -0.08, 0.02, 0));
  for (const z of [-1, 1]) g.add(at(sph(0.007, solidMat(0x2a1f36, { rough: 0.2 }), 1, 1, 1, 8), 0.115, 0.075, z * 0.02));
  return g;
}
function bunny(color = 0xffe0ee) {
  const g = new THREE.Group(), m = furMat(color);
  g.add(sph(0.05, m, 1, 1.1, 0.95)); const h = sph(0.04, m); h.position.y = 0.07; g.add(h);
  for (const x of [-1, 1]) { g.add(at(sph(0.014, m, 0.7, 3, 0.5, 10), x * 0.02, 0.135, 0)); g.add(at(sph(0.009, furMat(0xffb0c8), 0.6, 2.4, 0.5, 8), x * 0.02, 0.135, 0.007)); g.add(at(sph(0.008, solidMat(0x2a1f36), 1, 1, 1, 6), x * 0.014, 0.078, 0.035)); g.add(at(sph(0.014, m, 1, 1.4, 1), x * 0.03, -0.045, 0.03)); }
  g.add(at(sph(0.014, furMat(0xffffff)), 0, 0.0, -0.05));
  return g;
}

export class Room {
  constructor(scene, renderer) {
    this.group = new THREE.Group(); scene.add(this.group); const G = this.group;
    this.spin = []; this.bob = [];
    const W = 5.6, D = 6.0, Hh = 2.8, cz = -0.2, zF = cz - D / 2, zB = cz + D / 2;
    this.bounds = { W, zF, zB, Hh };

    /* floor + rug */
    const wood = woodTex(); const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: wood, roughness: 0.5 }));
    floor.rotation.x = -Math.PI / 2; floor.position.z = cz; floor.receiveShadow = true; G.add(floor);
    const rug = new THREE.Mesh(new THREE.CircleGeometry(1.55, 96), new THREE.MeshStandardMaterial({ map: rugTex(), roughness: 1 })); rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.006, -0.55); rug.receiveShadow = true; G.add(rug);

    /* walls */
    const wallMat = new THREE.MeshStandardMaterial({ map: wallTex(), roughness: 0.85 });
    const mkWall = (w, x, y, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, Hh), wallMat); m.position.set(x, y, z); m.rotation.y = ry; m.receiveShadow = true; G.add(m); return m; };
    mkWall(W, 0, Hh / 2, zF, 0); mkWall(W, 0, Hh / 2, zB, Math.PI); mkWall(D, -W / 2, Hh / 2, cz, Math.PI / 2); mkWall(D, W / 2, Hh / 2, cz, -Math.PI / 2);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), std(0xfff4fa, 0.9)); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, Hh, cz); G.add(ceil);
    // wainscot + skirting + crown
    const wain = std(0xfff6fb, 0.55), trim = std(0xffffff, 0.4);
    const rail = (len, x, z, ry) => {
      const g = new THREE.Group();
      g.add(at(box(len, 0.95, 0.025, wain), 0, 0.475, 0)); g.add(at(box(len, 0.045, 0.05, trim), 0, 0.97, 0.01)); g.add(at(box(len, 0.1, 0.04, trim), 0, 0.05, 0.008));
      for (let i = 0; i < len / 0.6; i++) g.add(at(box(0.45, 0.62, 0.012, std(0xffeaf4, 0.6)), -len / 2 + 0.3 + i * 0.6, 0.5, 0.015));
      g.add(at(box(len, 0.08, 0.06, trim), 0, Hh - 0.04, 0.02));
      g.position.set(x, 0, z); g.rotation.y = ry; G.add(g);
    };
    rail(W, 0, zF + 0.012, 0); rail(W, 0, zB - 0.012, Math.PI); rail(D, -W / 2 + 0.012, cz, Math.PI / 2); rail(D, W / 2 - 0.012, cz, -Math.PI / 2);

    /* window with sunset */
    const win = new THREE.Group(); win.position.set(0, 1.55, zF + 0.01);
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.3), new THREE.MeshBasicMaterial({ map: skyTex(), toneMapped: false })); sky.position.z = 0.002; win.add(sky);
    const fm = std(0xffffff, 0.35);
    win.add(at(box(1.9, 0.1, 0.12, fm), 0, 0.7, 0.04), at(box(1.9, 0.1, 0.12, fm), 0, -0.7, 0.04), at(box(0.1, 1.5, 0.12, fm), -0.9, 0, 0.04), at(box(0.1, 1.5, 0.12, fm), 0.9, 0, 0.04), at(box(0.05, 1.3, 0.06, fm), 0, 0, 0.04), at(box(1.7, 0.05, 0.06, fm), 0, 0.1, 0.04));
    win.add(at(box(2.1, 0.06, 0.28, fm), 0, -0.78, 0.12));
    G.add(win);
    // window seat
    const seat = box(2.0, 0.42, 0.45, std(0xffeaf4, 0.5)); seat.position.set(0, 0.21, zF + 0.26); G.add(seat);
    const cush = M(new THREE.BoxGeometry(1.9, 0.09, 0.42), fabricMat(0xff9ccf, 'dots'), { cast: false }); cush.position.set(0, 0.46, zF + 0.26); G.add(cush);
    [[-0.7, 0xff7eb6, 'hearts'], [-0.35, 0xb9a0ff, 'stars'], [0.6, 0xffd966, 'dots']].forEach(([x, c, p], i) => { const pl = sph(0.15, fabricMat(c, p), 1, 0.9, 0.35, 24); pl.position.set(x, 0.62, zF + 0.3); pl.rotation.set(-0.3, 0.2 * (i - 1), 0.2 * (i - 1)); G.add(pl); });
    const tdy = teddy(0xf3c4a4, 2.2); tdy.position.set(0.9, 0.62, zF + 0.3); tdy.rotation.y = -0.3; G.add(tdy);
    // curtains
    const curtainMat = new THREE.MeshPhysicalMaterial({ color: 0xff9fcb, roughness: 0.6, sheen: 1, sheenColor: new THREE.Color(0xffd6ea), side: THREE.DoubleSide });
    for (const sx of [-1, 1]) {
      const geo = new THREE.PlaneGeometry(0.75, 2.55, 40, 2); warp(geo, (p) => { p.z += Math.sin(p.x * 22) * 0.05 + Math.sin(p.x * 9) * 0.02; p.x *= 1 + (p.y + 1.27) * 0.03; });
      const c = new THREE.Mesh(geo, curtainMat); c.position.set(sx * 1.2, 1.5, zF + 0.1); c.castShadow = false; G.add(c);
      const tie = M(new THREE.TorusGeometry(0.2, 0.025, 8, 24), fabricMat(0xffffff, 'plain'), { cast: false }); tie.position.set(sx * 1.0, 1.0, zF + 0.12); tie.rotation.y = Math.PI / 2; tie.scale.set(1, 1, 0.6); G.add(tie);
    }
    const valance = M(new THREE.CylinderGeometry(0.04, 0.04, 3.2, 12), goldMat(), { cast: false }); valance.rotation.z = Math.PI / 2; valance.position.set(0, 2.62, zF + 0.1); G.add(valance);
    const scallop = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 0.28, 60, 1), new THREE.MeshPhysicalMaterial({ color: 0xff86bd, roughness: 0.6, sheen: 1, side: THREE.DoubleSide }));
    warp(scallop.geometry, (p) => { if (p.y < 0) p.y -= Math.abs(Math.sin(p.x * 7)) * 0.06; p.z = Math.sin(p.x * 12) * 0.02; }); scallop.position.set(0, 2.5, zF + 0.14); G.add(scallop);

    /* canopy bed (left) */
    this.makeBed(G, -W / 2 + 0.55, zF);
    /* vanity (right) */
    this.makeVanity(G, W / 2 - 0.55, zF + 0.3);
    /* shelves right wall */
    this.makeShelves(G, W / 2 - 0.12, cz + 1.4);
    /* left wall decor */
    this.makeDecor(G, W, zF, zB, cz);
    /* ceiling lamp + mobile */
    this.makeCeiling(G, cz);
    /* fairy lights */
    this.makeFairyLights(G, W, zF, zB, cz, Hh);
    /* lights */
    const hemi = new THREE.HemisphereLight(0xfff0f8, 0xffc4dd, 0.65); G.add(hemi);
    const key = new THREE.DirectionalLight(0xfff1e2, 1.9); key.position.set(-1.0, 3.0, 1.4); key.target.position.set(0, 0.9, -0.8);
    key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.camera.left = -1.2; key.shadow.camera.right = 1.2; key.shadow.camera.top = 1.4; key.shadow.camera.bottom = -0.6; key.shadow.camera.near = 0.5; key.shadow.camera.far = 7;
    key.shadow.bias = -0.0004; key.shadow.normalBias = 0.01; key.shadow.radius = 4; G.add(key, key.target); this.key = key;
    const fill = new THREE.PointLight(0xffb9dc, 14, 6, 1.6); fill.position.set(0.9, 1.9, -0.2); G.add(fill);
    const rim = new THREE.PointLight(0xcdb7ff, 8, 5, 1.6); rim.position.set(-0.9, 1.7, -2.1); G.add(rim);
  }

  makeBed(G, x, zF) {
    const g = new THREE.Group(); g.position.set(x, 0, zF + 1.05);
    const frame = std(0xffffff, 0.35), pink = fabricMat(0xff9ccf, 'hearts');
    g.add(at(box(1.0, 0.22, 2.0, frame, true), 0, 0.22, 0));
    g.add(at(M(new THREE.BoxGeometry(0.96, 0.17, 1.96), fabricMat(0xffffff, 'plain')), 0, 0.42, 0));
    const blanket = M(new THREE.BoxGeometry(1.0, 0.07, 1.25), pink); blanket.position.set(0, 0.53, 0.35); g.add(blanket);
    const fold = M(new THREE.BoxGeometry(1.02, 0.09, 0.22), fabricMat(0xffffff, 'stars')); fold.position.set(0, 0.55, -0.28); g.add(fold);
    // headboard
    const hb = M(new THREE.CylinderGeometry(0.52, 0.52, 0.07, 32, 1, false, 0, Math.PI), frame); hb.rotation.set(Math.PI / 2, 0, Math.PI / 2); hb.rotation.set(Math.PI / 2, 0, 0); hb.position.set(0, 0.6, -1.0); hb.rotation.x = Math.PI / 2; g.add(hb);
    g.add(at(box(1.04, 0.5, 0.07, frame, true), 0, 0.35, -1.0));
    const hbc = M(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 32, 1, false, 0, Math.PI), fabricMat(0xffc4de, 'plain')); hbc.rotation.x = Math.PI / 2; hbc.position.set(0, 0.6, -0.965); g.add(hbc);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const p = M(new THREE.CylinderGeometry(0.025, 0.03, 2.3, 12), goldMat()); p.position.set(sx * 0.5, 1.15, sz * 1.0); g.add(p); g.add(at(sph(0.04, goldMat()), sx * 0.5, 2.3, sz * 1.0)); }
    // tulle
    const tm = tulleMat(0xffd0e8, 0.45);
    for (const sx of [-1, 1]) { const geo = new THREE.PlaneGeometry(2.0, 1.5, 24, 8); warp(geo, (p) => { p.z += Math.sin(p.x * 6 + p.y * 2) * 0.03 - 0.0; p.y += Math.sin(((p.x + 1) / 2) * Math.PI) * -0.0; }); const t = new THREE.Mesh(geo, tm); t.rotation.y = Math.PI / 2; t.position.set(sx * 0.52, 1.5, 0); t.renderOrder = 3; g.add(t); }
    const top = new THREE.Mesh(new THREE.PlaneGeometry(1.04, 2.04, 6, 12), tm); top.rotation.x = Math.PI / 2; top.position.y = 2.28; g.add(top);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(1.04, 1.4, 12, 6), tm); back.position.set(0, 1.6, -1.0); g.add(back);
    // pillows & plush
    [[-0.25, 0xffffff, 'hearts'], [0.25, 0xffc4de, 'sparkle']].forEach(([px, c, p]) => { const pl = sph(0.22, fabricMat(c, p), 1.1, 0.4, 0.8, 24); pl.position.set(px, 0.6, -0.72); pl.rotation.set(-0.3, 0, px * 0.5); g.add(pl); });
    const un = unicorn(0xffffff); un.scale.setScalar(2.1); un.position.set(0.0, 0.68, -0.4); un.rotation.y = -0.4; g.add(un);
    const bn = bunny(0xffd6e8); bn.scale.setScalar(1.7); bn.position.set(-0.3, 0.64, -0.2); bn.rotation.y = 0.5; g.add(bn);
    G.add(g);
  }
  makeVanity(G, x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const white = std(0xffffff, 0.35, 0);
    g.add(at(box(1.15, 0.06, 0.5, white, true), 0, 0.76, 0));
    for (const sx of [-1, 1]) g.add(at(box(0.4, 0.73, 0.46, white, true), sx * 0.37, 0.365, 0));
    g.add(at(box(0.3, 0.12, 0.44, white), 0, 0.66, 0));
    for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) g.add(at(sph(0.015, goldMat()), sx * 0.37, 0.2 + i * 0.22, 0.235));
    // mirror
    const mir = new THREE.Mesh(new THREE.CircleGeometry(0.4, 48), new THREE.MeshStandardMaterial({ color: 0xf3f9ff, metalness: 1, roughness: 0.04 })); mir.scale.y = 1.25; mir.position.set(0, 1.45, -0.2); g.add(mir);
    const mf = M(new THREE.TorusGeometry(0.4, 0.035, 12, 64), goldMat(), { cast: false }); mf.scale.y = 1.25; mf.position.set(0, 1.45, -0.19); g.add(mf);
    for (let i = 0; i < 18; i++) { const a = (i / 18) * 6.283; const b = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff1c9, toneMapped: false })); b.position.set(Math.sin(a) * 0.46, 1.45 + Math.cos(a) * 0.575, -0.17); g.add(b); }
    // stool
    const stool = M(new THREE.CylinderGeometry(0.19, 0.17, 0.1, 28), fabricMat(0xff9ccf, 'stars')); stool.position.set(0.0, 0.43, 0.65); g.add(stool);
    for (let i = 0; i < 4; i++) { const a = i * 1.571 + 0.78; g.add(at(M(new THREE.CylinderGeometry(0.014, 0.014, 0.4, 8), goldMat()), Math.cos(a) * 0.12, 0.2, 0.65 + Math.sin(a) * 0.12)); }
    // perfumes & jewellery box
    [[-0.3, 0xffb3d4], [-0.18, 0xcdb7ff], [0.32, 0xa9ddff]].forEach(([px, c], i) => { const b = M(new THREE.CylinderGeometry(0.03, 0.04, 0.09 + i * 0.015, 20), glassMat(c, 0.6)); b.position.set(px, 0.84 + i * 0.007, 0.05); g.add(b); g.add(at(sph(0.02, goldMat()), px, 0.915 + i * 0.015, 0.05)); });
    const jb = M(new THREE.BoxGeometry(0.2, 0.09, 0.14), fabricMat(0xff7eb6, 'sparkle')); jb.position.set(0.1, 0.835, 0.06); g.add(jb);
    g.add(at(M(shapeGeo(heartShape(0.03), 0.01, 0.003), goldMat()), 0.1, 0.9, 0.065));
    g.rotation.y = 0;
    G.add(g);
  }
  makeShelves(G, x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = -Math.PI / 2;
    const wood = std(0xffffff, 0.4);
    for (const sx of [-1, 1]) g.add(at(box(0.04, 1.8, 0.3, wood), sx * 0.7, 0.9 + 0.3, 0));
    const cols = [0xff7eb6, 0xb9a0ff, 0x8fd3ff, 0xffd966, 0x8fe8c8, 0xff9a8a, 0xffffff];
    for (let r = 0; r < 4; r++) {
      const y = 0.55 + r * 0.5; g.add(at(box(1.44, 0.035, 0.3, wood), 0, y, 0));
      let xx = -0.62;
      for (let i = 0; i < 11 && xx < 0.35; i++) { const w = 0.03 + rnd() * 0.03, h = 0.16 + rnd() * 0.12; const b = box(w, h, 0.2, std(cols[(rnd() * 7) | 0], 0.6)); b.position.set(xx + w / 2, y + 0.018 + h / 2, 0); b.rotation.z = i === 10 ? 0.3 : 0; g.add(b); xx += w + 0.003; }
      const pick = r % 3;
      if (pick === 0) { const t = teddy([0xc99a74, 0xffa8cf][r % 2], 2.6); t.position.set(0.5, y + 0.1, 0); g.add(t); }
      else if (pick === 1) { const u = unicorn(0xffffff); u.scale.setScalar(2.2); u.position.set(0.48, y + 0.14, 0); u.rotation.y = -0.5; g.add(u); }
      else { const b = bunny(0xffe0ee); b.scale.setScalar(1.8); b.position.set(0.5, y + 0.12, 0); g.add(b); }
    }
    G.add(g);
  }
  makeDecor(G, W, zF, zB, cz) {
    // framed pictures on left wall
    const frames = [[-0.3, 1.7, 0xffc94d, 'heart'], [0.5, 1.5, 0xffffff, 'star'], [1.3, 1.75, 0xffc94d, 'cloud']];
    frames.forEach(([z, y, c, kind], i) => {
      const g = new THREE.Group(); g.position.set(-W / 2 + 0.02, y, cz + z - 0.4); g.rotation.y = Math.PI / 2;
      g.add(at(M(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 32), c === 0xffc94d ? goldMat() : solidMat(0xffffff, { rough: 0.3 }), { cast: false }), 0, 0, 0)); g.children[0].rotation.x = Math.PI / 2;
      const pic = new THREE.Mesh(new THREE.CircleGeometry(0.24, 32), new THREE.MeshBasicMaterial({ map: canvasTex(128, 128, (c2) => { const gr = c2.createLinearGradient(0, 0, 128, 128); gr.addColorStop(0, '#ffd6ec'); gr.addColorStop(1, '#d7c4ff'); c2.fillStyle = gr; c2.fillRect(0, 0, 128, 128); c2.font = '70px serif'; c2.textAlign = 'center'; c2.textBaseline = 'middle'; c2.fillText(['🦄', '🌈', '🧚'][i], 64, 70); }), toneMapped: false })); pic.position.z = 0.025; g.add(pic);
      G.add(g);
    });
    // wall shelf heart + neon star sign on back wall
    const neon = (shape, color, x, y, z, ry, s = 1) => {
      const m = new THREE.Mesh(shapeGeo(shape, 0.02, 0.006), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(1.4), toneMapped: false })); m.scale.setScalar(s); m.position.set(x, y, z); m.rotation.y = ry; G.add(m);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTex(), color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8 })); sp.scale.setScalar(0.9 * s); sp.position.set(x, y, z + (ry ? 0 : 0)); sp.position.x += ry === Math.PI ? 0 : 0; G.add(sp); this.bob.push({ o: sp, mat: sp.material, kind: 'pulse' });
    };
    neon(heartShape(0.28), 0xff6fb5, -0.8, 1.7, zB - 0.03, Math.PI, 1);
    neon(starPoly(0.3, 0.13), 0xffe27a, 0.8, 1.9, zB - 0.03, Math.PI, 1);
    // bean bag + plush pile (back right)
    const bag = sph(0.5, fabricMat(0xff9ccf, 'hearts'), 1, 0.7, 1, 36); bag.position.set(1.6, 0.34, 1.9); bag.castShadow = true; G.add(bag);
    const bag2 = sph(0.42, fabricMat(0xc9b2ff, 'stars'), 1, 0.7, 1, 36); bag2.position.set(0.7, 0.28, 2.2); bag2.castShadow = true; G.add(bag2);
    const bn = bunny(0xffffff); bn.scale.setScalar(3); bn.position.set(1.55, 0.78, 1.85); bn.rotation.y = -0.6; G.add(bn);
    // balloons
    const balloons = new THREE.Group(); balloons.position.set(-2.1, 0, 1.9);
    [[0xff7eb6, 0, 1.7], [0xffd966, 0.2, 1.95], [0xb9a0ff, -0.18, 1.85], [0x8fe8c8, 0.1, 1.55]].forEach(([c, x, y]) => {
      const b = sph(0.17, solidMat(c, { rough: 0.15, coat: 1 }), 1, 1.18, 1, 28); b.position.set(x, y, 0); balloons.add(b);
      const s = M(new THREE.CylinderGeometry(0.0015, 0.0015, y - 0.02, 4), solidMat(0xffffff), { cast: false }); s.position.set(x * 0.5, y / 2 - 0.15, 0); s.rotation.z = -x * 0.35; balloons.add(s);
      this.bob.push({ o: b, kind: 'bob', base: y, ph: x * 10 });
    });
    G.add(balloons);
    // dollhouse on a small cabinet (left back)
    const dh = new THREE.Group(); dh.position.set(-2.1, 0, 0.7); dh.rotation.y = Math.PI / 2;
    dh.add(at(box(0.9, 0.5, 0.4, std(0xffffff, 0.4), true), 0, 0.25, 0));
    dh.add(at(box(0.7, 0.45, 0.36, std(0xffc4de, 0.5), true), 0, 0.73, 0));
    const roof = M(new THREE.ConeGeometry(0.55, 0.3, 4), std(0xff7eb6, 0.4)); roof.rotation.y = Math.PI / 4; roof.position.set(0, 1.12, 0); roof.scale.set(1, 1, 0.7); dh.add(roof);
    for (const sx of [-1, 1]) dh.add(at(box(0.16, 0.18, 0.02, std(0xfff1b0, 0.3)), sx * 0.2, 0.8, 0.185));
    dh.add(at(box(0.14, 0.24, 0.02, std(0xb9a0ff, 0.4)), 0, 0.6, 0.185));
    G.add(dh);
  }
  makeCeiling(G, cz) {
    const lamp = new THREE.Group(); lamp.position.set(0, 2.55, -0.6);
    lamp.add(M(new THREE.CylinderGeometry(0.01, 0.01, 0.4, 6), goldMat(), { cast: false }));
    lamp.children[0].position.y = 0.2;
    for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.283; const p = sph(0.12, new THREE.MeshPhysicalMaterial({ color: 0xff9ccf, roughness: 0.3, clearcoat: 1, emissive: 0xff7eb6, emissiveIntensity: 0.25 }), 1, 0.35, 1.5, 20); p.position.set(Math.cos(a) * 0.17, -0.02, Math.sin(a) * 0.17); p.rotation.y = -a; lamp.add(p); }
    lamp.add(at(sph(0.09, new THREE.MeshBasicMaterial({ color: 0xfff1c9, toneMapped: false })), 0, -0.04, 0));
    G.add(lamp);
    // mobile of stars/moon/hearts
    const mob = new THREE.Group(); mob.position.set(0, 2.78, -0.9); G.add(mob); this.spin.push({ o: mob, s: 0.25 });
    const hang = (shape, color, x, len, s) => {
      const st = M(new THREE.CylinderGeometry(0.0015, 0.0015, len, 4), solidMat(0xffffff), { cast: false }); st.position.set(x, -len / 2, 0); mob.add(st);
      const m = M(shapeGeo(shape, 0.02, 0.006), new THREE.MeshPhysicalMaterial({ color, roughness: 0.25, clearcoat: 1, emissive: color, emissiveIntensity: 0.3 }), { cast: false }); m.scale.setScalar(s); m.position.set(x, -len, 0); mob.add(m); this.spin.push({ o: m, s: 1.2 });
    };
    hang(starPoly(0.09, 0.04), 0xffd966, 0.5, 0.35, 1); hang(heartShape(0.07), 0xff7eb6, -0.5, 0.5, 1); hang(starPoly(0.07, 0.03), 0xb9a0ff, 0, 0.25, 1); hang(heartShape(0.06), 0x8fd3ff, 0, 0.65, 1);
    hang(starPoly(0.08, 0.035), 0xff9a8a, 0.0, 0.45, 1);
    mob.children.forEach((c, i) => { if (c.geometry && c.geometry.type === 'ExtrudeGeometry') c.position.z = 0; });
    mob.add(M(new THREE.TorusGeometry(0.5, 0.008, 6, 40), goldMat(), { cast: false })); mob.children[mob.children.length - 1].rotation.x = Math.PI / 2;
  }
  makeFairyLights(G, W, zF, zB, cz, H) {
    const strands = [];
    const swag = (a, b, sag, n) => { const pts = []; for (let i = 0; i <= n; i++) { const t = i / n; const p = new THREE.Vector3().lerpVectors(a, b, t); p.y -= Math.sin(t * Math.PI) * sag; pts.push(p); } return pts; };
    const y = H - 0.12;
    for (let k = 0; k < 3; k++) strands.push(swag(new THREE.Vector3(-W / 2 + 0.05, y - k * 0.12, zF + 0.05), new THREE.Vector3(W / 2 - 0.05, y - k * 0.12, zF + 0.05), 0.22 + k * 0.05, 22));
    strands.push(swag(new THREE.Vector3(-W / 2 + 0.05, y, zF + 0.05), new THREE.Vector3(-W / 2 + 0.05, y, zB - 0.05), 0.25, 26));
    strands.push(swag(new THREE.Vector3(W / 2 - 0.05, y, zF + 0.05), new THREE.Vector3(W / 2 - 0.05, y, zB - 0.05), 0.25, 26));
    strands.push(swag(new THREE.Vector3(-W / 2 + 0.05, y, zB - 0.05), new THREE.Vector3(W / 2 - 0.05, y, zB - 0.05), 0.25, 22));
    const pts = strands.flat(), n = pts.length;
    const inst = new THREE.InstancedMesh(new THREE.SphereGeometry(0.022, 10, 8), new THREE.MeshBasicMaterial({ toneMapped: false }), n);
    const pal = [0xffd27a, 0xff9ccf, 0xcdb7ff, 0xa9ddff, 0xfff1c9].map((c) => new THREE.Color(c)); const d = new THREE.Object3D();
    this.bulbCols = []; pts.forEach((p, i) => { d.position.copy(p); d.updateMatrix(); inst.setMatrixAt(i, d.matrix); const c = pal[i % 5]; inst.setColorAt(i, c); this.bulbCols.push(c.clone()); });
    inst.instanceColor.needsUpdate = true; this.bulbs = inst; G.add(inst);
    const glow = new THREE.Points(new THREE.BufferGeometry().setFromPoints(pts), new THREE.PointsMaterial({ size: 0.16, map: sparkTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffd9a8, opacity: 0.65 })); G.add(glow);
    for (const s of strands) { const c = new THREE.CatmullRomCurve3(s); G.add(M(new THREE.TubeGeometry(c, s.length * 2, 0.0035, 4), solidMat(0xe9d6c0), { cast: false })); }
  }
  update(t) {
    for (const s of this.spin) s.o.rotation.y = t * s.s;
    for (const b of this.bob) { if (b.kind === 'bob') b.o.position.y = b.base + Math.sin(t * 0.8 + b.ph) * 0.03; else if (b.kind === 'pulse') b.mat.opacity = 0.55 + Math.sin(t * 2) * 0.2; }
    if (this.bulbs) {
      const col = new THREE.Color();
      for (let i = 0; i < this.bulbCols.length; i += 1) { const k = 0.55 + 0.45 * Math.sin(t * 2.2 + i * 1.3); col.copy(this.bulbCols[i]).multiplyScalar(0.6 + k * 0.9); this.bulbs.setColorAt(i, col); }
      this.bulbs.instanceColor.needsUpdate = true;
    }
  }
}
