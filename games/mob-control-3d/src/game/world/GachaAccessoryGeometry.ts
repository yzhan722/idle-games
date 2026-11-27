import * as THREE from 'three';
import type { GachaSkinId } from '../State';

/**
 * MC-13: Builds a gacha skin head accessory in the Bobo trooper's model space (head top ~y 0.68, face toward +z),
 * with per-part vertex colors, so it can reuse the trooper's exact instance matrix every frame.
 */
export function buildGachaAccessoryGeometry(id: GachaSkinId, lift = 0): THREE.BufferGeometry {
  const parts: Array<{ geo: THREE.BufferGeometry; color: number }> = [];
  const add = (geo: THREE.BufferGeometry, color: number): void => {
    parts.push({ geo, color });
  };
  switch (id) {
    case 'mint_cap': {
      const dome = new THREE.SphereGeometry(0.235, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
      dome.scale(1, 0.78, 1.04);
      dome.translate(0, 0.6, 0);
      add(dome, 0x2dd4bf);
      const brim = new THREE.CylinderGeometry(0.2, 0.2, 0.035, 16, 1, false, -Math.PI * 0.5, Math.PI);
      brim.scale(1.05, 1, 1.25);
      brim.translate(0, 0.62, 0.06);
      add(brim, 0xf8fafc);
      const button = new THREE.SphereGeometry(0.045, 8, 6);
      button.translate(0, 0.79, 0);
      add(button, 0xf8fafc);
      break;
    }
    case 'peach_bow': {
      for (const side of [-1, 1]) {
        const loop = new THREE.ConeGeometry(0.1, 0.2, 10);
        loop.rotateZ(side * Math.PI * 0.5);
        loop.scale(1, 1, 0.55);
        loop.translate(0.1 + side * 0.11, 0.72, 0.04);
        add(loop, 0xf43f5e);
      }
      const knot = new THREE.SphereGeometry(0.055, 10, 8);
      knot.translate(0.1, 0.72, 0.05);
      add(knot, 0xfda4af);
      break;
    }
    case 'sprout_leaf': {
      const stem = new THREE.CylinderGeometry(0.016, 0.022, 0.16, 6);
      stem.translate(0, 0.74, 0);
      add(stem, 0x15803d);
      for (const side of [-1, 1]) {
        const leaf = new THREE.SphereGeometry(0.085, 10, 6);
        leaf.scale(1.45, 0.32, 0.8);
        leaf.rotateZ(side * 0.5);
        leaf.translate(side * 0.085, 0.84, 0);
        add(leaf, 0x4ade80);
      }
      break;
    }
    case 'pirate_hat': {
      const brim = new THREE.CylinderGeometry(0.31, 0.31, 0.045, 3);
      brim.translate(0, 0.66, 0);
      add(brim, 0x1e293b);
      const crown = new THREE.CylinderGeometry(0.15, 0.19, 0.17, 14);
      crown.translate(0, 0.76, 0);
      add(crown, 0x0f172a);
      const band = new THREE.TorusGeometry(0.185, 0.022, 6, 20);
      band.rotateX(Math.PI / 2);
      band.translate(0, 0.69, 0);
      add(band, 0xfacc15);
      const badge = new THREE.SphereGeometry(0.045, 8, 6);
      badge.scale(1, 1, 0.5);
      badge.translate(0, 0.77, 0.16);
      add(badge, 0xf8fafc);
      break;
    }
    case 'bunny_ears': {
      for (const side of [-1, 1]) {
        const ear = new THREE.CapsuleGeometry(0.06, 0.24, 4, 10);
        ear.scale(1, 1, 0.6);
        ear.rotateZ(-side * 0.22);
        ear.translate(side * 0.12, 0.86, -0.02);
        add(ear, 0xfaf5ff);
        const inner = new THREE.CapsuleGeometry(0.034, 0.17, 4, 8);
        inner.scale(1, 1, 0.35);
        inner.rotateZ(-side * 0.22);
        inner.translate(side * 0.12, 0.86, 0.016);
        add(inner, 0xf9a8d4);
      }
      break;
    }
    case 'lava_horns': {
      for (const side of [-1, 1]) {
        const base = new THREE.ConeGeometry(0.065, 0.16, 10);
        base.translate(0, 0.08, 0);
        const tip = new THREE.ConeGeometry(0.04, 0.12, 10);
        tip.translate(0, 0.2, 0);
        for (const [g, col] of [
          [base, 0x7f1d1d],
          [tip, 0xfb923c],
        ] as const) {
          g.rotateZ(-side * 0.5);
          g.translate(side * 0.15, 0.62, 0.02);
          add(g, col);
        }
      }
      break;
    }
    case 'halo_angel': {
      const halo = new THREE.TorusGeometry(0.165, 0.028, 8, 28);
      halo.rotateX(Math.PI / 2);
      halo.translate(0, 0.93, 0);
      add(halo, 0xfde047);
      for (const side of [-1, 1]) {
        const wing = new THREE.SphereGeometry(0.13, 10, 8);
        wing.scale(0.45, 0.85, 0.18);
        wing.rotateZ(-side * 0.6);
        wing.translate(side * 0.24, 0.46, -0.24);
        add(wing, 0xfffbeb);
      }
      break;
    }
    case 'royal_crown':
    default: {
      const ring = new THREE.CylinderGeometry(0.17, 0.15, 0.11, 12, 1, true);
      ring.translate(0, 0.7, 0);
      add(ring, 0xfacc15);
      for (let cp = 0; cp < 5; cp++) {
        const ang = (cp / 5) * Math.PI * 2;
        const spike = new THREE.ConeGeometry(0.045, 0.12, 6);
        spike.translate(Math.sin(ang) * 0.15, 0.81, Math.cos(ang) * 0.15);
        add(spike, 0xfde047);
        const pearl = new THREE.SphereGeometry(0.022, 6, 5);
        pearl.translate(Math.sin(ang) * 0.15, 0.885, Math.cos(ang) * 0.15);
        add(pearl, 0xfef9c3);
      }
      const ruby = new THREE.OctahedronGeometry(0.05, 0);
      ruby.translate(0, 0.71, 0.165);
      add(ruby, 0xef4444);
      const amethyst = new THREE.OctahedronGeometry(0.036, 0);
      amethyst.translate(0.12, 0.71, 0.11);
      add(amethyst, 0xa855f7);
      const sapphire = new THREE.OctahedronGeometry(0.036, 0);
      sapphire.translate(-0.12, 0.71, 0.11);
      add(sapphire, 0x38bdf8);
      break;
    }
  }
  let vertCount = 0;
  const flat = parts.map((p) => {
    const g = p.geo.index ? p.geo.toNonIndexed() : p.geo;
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    vertCount += g.getAttribute('position').count;
    return { g, color: new THREE.Color(p.color) };
  });
  const pos = new Float32Array(vertCount * 3);
  const nrm = new Float32Array(vertCount * 3);
  const col = new Float32Array(vertCount * 3);
  let o = 0;
  for (const { g, color } of flat) {
    const pa = g.getAttribute('position');
    const na = g.getAttribute('normal');
    for (let i = 0; i < pa.count; i++) {
      pos[(o + i) * 3] = pa.getX(i);
      pos[(o + i) * 3 + 1] = pa.getY(i) + lift;
      pos[(o + i) * 3 + 2] = pa.getZ(i);
      nrm[(o + i) * 3] = na.getX(i);
      nrm[(o + i) * 3 + 1] = na.getY(i);
      nrm[(o + i) * 3 + 2] = na.getZ(i);
      col[(o + i) * 3] = color.r;
      col[(o + i) * 3 + 1] = color.g;
      col[(o + i) * 3 + 2] = color.b;
    }
    o += pa.count;
    g.dispose();
  }
  for (const p of parts) p.geo.dispose();
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.computeBoundingSphere();
  return out;
}
