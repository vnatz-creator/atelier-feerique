import * as THREE from 'three';
import { canvasTex } from './util.js';

export const sparkTex = () => canvasTex(64, 64, (g) => {
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#fff';
  g.beginPath(); g.moveTo(32, 2); g.quadraticCurveTo(32, 32, 62, 32); g.quadraticCurveTo(32, 32, 32, 62); g.quadraticCurveTo(32, 32, 2, 32); g.quadraticCurveTo(32, 32, 32, 2); g.fill();
});

/** Burst particles (equip, save, ...) */
export class Sparkles {
  constructor(scene, max = 500) {
    this.max = max; this.i = 0;
    this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3); this.life = new Float32Array(max); this.size = new Float32Array(max);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.mat = new THREE.PointsMaterial({ size: 0.03, map: sparkTex(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
    this.points = new THREE.Points(geo, this.mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.pos.fill(-999);
  }
  burst(p, color = 0xffd1ec, n = 40, speed = 0.5) {
    const c = new THREE.Color(color), w = new THREE.Color(0xffffff);
    for (let k = 0; k < n; k++) {
      const i = this.i; this.i = (this.i + 1) % this.max;
      this.pos[i * 3] = p.x; this.pos[i * 3 + 1] = p.y; this.pos[i * 3 + 2] = p.z;
      const a = Math.random() * 6.283, b = Math.acos(2 * Math.random() - 1), s = speed * (0.3 + Math.random());
      this.vel[i * 3] = Math.sin(b) * Math.cos(a) * s; this.vel[i * 3 + 1] = Math.cos(b) * s + 0.2; this.vel[i * 3 + 2] = Math.sin(b) * Math.sin(a) * s;
      this.life[i] = 0.8 + Math.random() * 0.8;
      const m = c.clone().lerp(w, Math.random() * 0.6);
      this.col[i * 3] = m.r; this.col[i * 3 + 1] = m.g; this.col[i * 3 + 2] = m.b;
    }
  }
  trail(p, color) { this.burst(p, color, 2, 0.08); }
  update(dt) {
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) { this.pos[i * 3 + 1] = -999; continue; }
      this.life[i] -= dt;
      this.vel[i * 3 + 1] -= 0.5 * dt;
      this.pos[i * 3] += this.vel[i * 3] * dt; this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt; this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      const f = Math.min(1, this.life[i] * 1.5);
      this.col[i * 3] *= 1 - dt * 0.6 * (1 - f); // soft fade
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }
}

/** Slow ambient floating dust of sparkles in the room */
export function ambientSparkles(scene, count = 160) {
  const pos = new Float32Array(count * 3), base = new Float32Array(count * 3), col = new Float32Array(count * 3);
  const pal = [0xffd1ec, 0xfff0b3, 0xd9c7ff, 0xbfe9ff].map((c) => new THREE.Color(c));
  for (let i = 0; i < count; i++) {
    base[i * 3] = (Math.random() - 0.5) * 4.6; base[i * 3 + 1] = 0.3 + Math.random() * 2.1; base[i * 3 + 2] = -2.5 + Math.random() * 4.5;
    const c = pal[i % 4]; col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.035, map: sparkTex(), vertexColors: true, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending }));
  pts.frustumCulled = false;
  scene.add(pts);
  return {
    update(t) {
      for (let i = 0; i < count; i++) {
        pos[i * 3] = base[i * 3] + Math.sin(t * 0.3 + i) * 0.12;
        pos[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * 0.4 + i * 1.7) * 0.1 + ((t * 0.02 + i * 0.013) % 1) * 0.0;
        pos[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * 0.25 + i * 0.6) * 0.12;
      }
      geo.attributes.position.needsUpdate = true;
      pts.material.size = 0.03 + Math.sin(t * 1.3) * 0.006;
    },
  };
}
