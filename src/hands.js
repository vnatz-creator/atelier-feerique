import * as THREE from 'three';
import { sparkTex } from './fx.js';

const FINGERS = ['thumb', 'index-finger', 'middle-finger', 'ring-finger', 'pinky-finger'];
const JOINTS = ['wrist'];
const BONES = [];
for (const f of FINGERS) {
  const names = f === 'thumb' ? ['metacarpal', 'phalanx-proximal', 'phalanx-distal', 'tip'] : ['metacarpal', 'phalanx-proximal', 'phalanx-intermediate', 'phalanx-distal', 'tip'];
  const full = names.map((n) => `${f}-${n}`);
  JOINTS.push(...full);
  for (let i = 0; i < full.length - 1; i++) BONES.push([full[i], full[i + 1]]);
  BONES.push(['wrist', full[0]]);
}
// palm fill
const knuckles = ['index-finger', 'middle-finger', 'ring-finger', 'pinky-finger'];
for (let i = 0; i < 3; i++) {
  BONES.push([`${knuckles[i]}-metacarpal`, `${knuckles[i + 1]}-metacarpal`]);
  BONES.push([`${knuckles[i]}-phalanx-proximal`, `${knuckles[i + 1]}-phalanx-proximal`]);
  BONES.push([`${knuckles[i]}-metacarpal`, `${knuckles[i + 1]}-phalanx-proximal`]);
}
BONES.push(['thumb-metacarpal', 'index-finger-metacarpal'], ['thumb-phalanx-proximal', 'index-finger-metacarpal']);

const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q = new THREE.Quaternion(), _m = new THREE.Matrix4(), _s = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);

export class Hand {
  constructor(id) {
    this.id = id; this.kind = 'none'; this.tracked = false;
    this.tip = new THREE.Vector3(); this.thumb = new THREE.Vector3(); this.pinchPos = new THREE.Vector3();
    this.pinching = false; this.started = false; this.ended = false;
    this.held = null; this.hover = null; this.depth = 0.9; this.inputSource = null; this.selecting = false;
    this.pinchTime = 0; this.startPos = new THREE.Vector3();
  }
}

export class Hands {
  constructor(renderer, scene, camera, dom) {
    this.renderer = renderer; this.scene = scene; this.camera = camera; this.dom = dom;
    this.list = [new Hand(0), new Hand(1)];
    this.mouse = new Hand(2); this.mouse.kind = 'mouse'; this.mouse.tracked = false;
    this.mouseNdc = new THREE.Vector2(); this.mouseOn = false;
    this.group = new THREE.Group(); scene.add(this.group);
    this.visuals = [];
    this.glowTex = sparkTex();
    for (let i = 0; i < 2; i++) this._setupXR(i);
    this._setupMouse();
    // cursor glows (one for each hand + mouse)
    for (const h of [...this.list, this.mouse]) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: 0xffa6d8, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending }));
      sp.renderOrder = 999; sp.visible = false; this.group.add(sp); h.cursor = sp;
    }
  }

  _setupXR(i) {
    const r = this.renderer, h = this.list[i];
    const hand = r.xr.getHand(i); this.scene.add(hand); h.handObj = hand;
    hand.addEventListener('connected', (e) => { h.inputSource = e.data; h.kind = e.data.hand ? 'hand' : h.kind; h.tracked = !!e.data.hand; });
    hand.addEventListener('disconnected', () => { h.tracked = false; h.kind = 'none'; });
    const c = r.xr.getController(i); this.scene.add(c); h.ctrl = c;
    c.addEventListener('connected', (e) => { if (!e.data.hand) { h.kind = 'controller'; h.tracked = true; h.ctrlSource = e.data; } });
    c.addEventListener('disconnected', () => { if (h.kind === 'controller') { h.kind = 'none'; h.tracked = false; } });
    c.addEventListener('selectstart', (e) => { if (!e.data.hand) h.selecting = true; });
    c.addEventListener('selectend', (e) => { if (!e.data.hand) h.selecting = false; });
    // visual hand
    const joints = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), null, JOINTS.length);
    const bones = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 12, 1, false), null, BONES.length);
    const mat = new THREE.MeshPhysicalMaterial({ color: 0xffd8ea, roughness: 0.35, clearcoat: 0.6, emissive: 0xff8ec4, emissiveIntensity: 0.22, sheen: 1, sheenColor: new THREE.Color(0xffffff) });
    joints.material = bones.material = mat;
    joints.frustumCulled = bones.frustumCulled = false; joints.visible = bones.visible = false;
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let k = 0; k < JOINTS.length; k++) joints.setMatrixAt(k, zero);
    for (let k = 0; k < BONES.length; k++) bones.setMatrixAt(k, zero);
    this.group.add(joints, bones);
    h.vis = { joints, bones };
  }

  _setupMouse() {
    const d = this.dom;
    const upd = (e) => { const r = d.getBoundingClientRect(); this.mouseNdc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); this.mouseOn = true; };
    d.addEventListener('pointermove', upd);
    d.addEventListener('pointerdown', (e) => { upd(e); this.mouse.selecting = true; this.mouse.stick = 4; });
    window.addEventListener('pointerup', () => { this.mouse.selecting = false; });
    d.addEventListener('pointerleave', () => { this.mouseOn = false; });
  }

  get all() { return [...this.list, this.mouse]; }

  update(dt, targets, inXR) {
    const cam = this.camera;
    this.mouse.tracked = !inXR && this.mouseOn;
    for (const h of this.list) {
      h.started = h.ended = false;
      const was = h.pinching;
      if (!inXR) { h.tracked = false; h.vis.joints.visible = h.vis.bones.visible = false; continue; }
      if (h.kind === 'hand') this._readHand(h);
      else if (h.kind === 'controller' && h.ctrl) {
        h.ctrl.getWorldPosition(h.tip); _v.set(0, 0, -1).applyQuaternion(h.ctrl.getWorldQuaternion(_q)); h.pinchPos.copy(h.tip).addScaledVector(_v, 0.09);
        h.pinching = h.selecting; h.vis.joints.visible = h.vis.bones.visible = false;
      }
      h.started = h.pinching && !was; h.ended = !h.pinching && was;
    }
    // mouse as a virtual hand
    const m = this.mouse; const was = m.pinching;
    m.started = m.ended = false;
    if (m.tracked) {
      const ray = new THREE.Raycaster(); ray.setFromCamera(this.mouseNdc, cam);
      const o = ray.ray.origin, d = ray.ray.direction;
      let depth = m.held ? m.depth : 0.9;
      if (!m.held) {
        let best = null, bs = -1;
        for (const t of targets) {
          if (!t.isActive()) continue;
          t.center(_v); _v2.copy(_v).sub(o); const tt = _v2.dot(d); if (tt < 0.2) continue;
          const dist = _v2.sub(_v.copy(d).multiplyScalar(tt)).length();
          if (dist < t.radius) { const s = (t.priority || 1) * 10 - dist / t.radius; if (s > bs) { bs = s; best = { t: tt }; } }
        }
        if (best) depth = best.t;
        m.depth = depth;
      }
      m.pinchPos.copy(o).addScaledVector(d, m.depth); m.tip.copy(m.pinchPos);
      m.pinching = m.selecting || (m.stick | 0) > 0; // keep very short clicks alive for a few frames
      if (m.stick > 0) m.stick--;
    } else m.pinching = false;
    m.started = m.pinching && !was; m.ended = !m.pinching && was;
    // cursor visuals
    for (const h of this.all) {
      const on = h.tracked; h.cursor.visible = on;
      if (!on) continue;
      h.cursor.position.copy(h.pinchPos);
      const target = h.pinching ? 0.075 : h.hover ? 0.06 : 0.035;
      h.cursor.scale.x += (target - h.cursor.scale.x) * Math.min(1, dt * 14); h.cursor.scale.y = h.cursor.scale.z = h.cursor.scale.x;
      h.cursor.material.color.set(h.pinching ? 0xffe27a : h.hover ? 0xffffff : 0xffa6d8);
    }
  }

  _readHand(h) {
    const j = h.handObj.joints, ti = j['index-finger-tip'], tt = j['thumb-tip'];
    const vis = h.vis;
    if (!ti || !tt || !ti.visible || !tt.visible) { h.tracked = false; vis.joints.visible = vis.bones.visible = false; h.pinching = false; return; }
    h.tracked = true;
    h.tip.copy(ti.position); h.thumb.copy(tt.position);
    h.pinchPos.copy(h.tip).add(h.thumb).multiplyScalar(0.5);
    const d = h.tip.distanceTo(h.thumb);
    h.pinching = h.pinching ? d < 0.042 : d < 0.024;
    // draw
    vis.joints.visible = vis.bones.visible = true;
    const pos = {};
    JOINTS.forEach((n, i) => {
      const jj = j[n]; if (!jj || !jj.visible) { _m.makeScale(0, 0, 0); vis.joints.setMatrixAt(i, _m); return; } pos[n] = jj.position;
      const r = (jj.jointRadius || 0.008) * 1.15 + 0.0015;
      _m.compose(jj.position, _q.identity(), _s.set(r, r, r)); vis.joints.setMatrixAt(i, _m);
    });
    vis.joints.instanceMatrix.needsUpdate = true;
    BONES.forEach(([a, b], i) => {
      const pa = pos[a], pb = pos[b]; if (!pa || !pb) { _m.makeScale(0, 0, 0); vis.bones.setMatrixAt(i, _m); return; }
      _v.copy(pb).sub(pa); const len = _v.length();
      _q.setFromUnitVectors(UP, _v.normalize());
      const ra = (j[a].jointRadius || 0.008) * 1.1, rb = (j[b].jointRadius || 0.008) * 1.1, r = Math.min(ra, rb);
      _m.compose(_v2.copy(pa).add(pb).multiplyScalar(0.5), _q, _s.set(r, len, r)); vis.bones.setMatrixAt(i, _m);
    });
    vis.bones.instanceMatrix.needsUpdate = true;
  }
}

/** Targets that hands can hover, press or grab. */
export class Interaction {
  constructor() { this.targets = []; }
  add(t) {
    t.isActive = () => { if (t.enabled && !t.enabled()) return false; for (let o = t.obj; o; o = o.parent) if (!o.visible) return false; return true; };
    t.center = (out) => t.obj.getWorldPosition(out);
    t.hovered = false; this.targets.push(t); return t;
  }
  remove(t) { const i = this.targets.indexOf(t); if (i >= 0) this.targets.splice(i, 1); }
  update(hands, dt) {
    for (const t of this.targets) t.hovered = false;
    for (const h of hands.all) {
      if (!h.tracked) { if (h.held) { h.held.onRelease && h.held.onRelease(h); h.held = null; } h.hover = null; continue; }
      if (h.held) {
        h.held.hovered = true;
        h.held.onHold && h.held.onHold(h, dt);
        if (!h.pinching) { const t = h.held; h.held = null; t.onRelease && t.onRelease(h); }
        continue;
      }
      let best = null, bs = -1e9;
      for (const t of this.targets) {
        if (!t.isActive()) continue;
        t.center(_v); const d = _v.distanceTo(h.pinchPos);
        if (d <= t.radius) { const s = (t.priority || 1) * 10 - d / t.radius; if (s > bs) { bs = s; best = t; } }
      }
      h.hover = best; if (best) best.hovered = true;
      if (h.started && best && !hands.all.some((o) => o !== h && o.held === best)) {
        h.startPos.copy(h.pinchPos); h.pinchTime = performance.now();
        if (best.grab) { h.held = best; best.onGrab && best.onGrab(h); } else best.onPress && best.onPress(h);
      }
    }
  }
}
