import * as THREE from 'three';

/**
 * Part IDs encoded in vertex attribute `aPartId`:
 * 0 = Body / Jelly Torso / Backpack (bobs + squash/stretch)
 * 1 = Headband / Face / Ears / Hat / Helmet (bobs + subtle head turn)
 * 2 = Left Arm + Lightstick / Shield (cheers & swings around left shoulder pivot)
 * 3 = Right Arm + Lightstick / Wand / Wrench / Net (cheers & swings + strikes on attack!)
 * 4 = Left Foot / Boot (strides around left hip pivot)
 * 5 = Right Foot / Boot (strides around right hip pivot)
 * 6 = Left Wing / Ribbon / Flag / Halo (flaps / waves dynamically!)
 * 7 = Right Wing / Ribbon / Flag / Inner Halo (flaps / waves symmetrically!)
 */
export type HumanoidPartId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface PartSpec {
  geo: THREE.BufferGeometry;
  color: number;
  partId: HumanoidPartId;
  glowWeight?: number; // 0..1 extra self-illumination for lightsticks, stars, goggles
  tintMask?: number; // 1 = tinted by InstancedMesh instanceColor (candy jelly body); 0 = fixed baked color (white headband, eyes, props)
}

let cachedSmoothVinylBumpTex: THREE.CanvasTexture | null = null;

/**
 * Generates a subtle, silky-smooth procedural vinyl/jelly micro-sheen texture (zero dark scale seams).
 */
export function getMicroArmorBumpTexture(): THREE.CanvasTexture {
  if (cachedSmoothVinylBumpTex) return cachedSmoothVinylBumpTex;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 24; i++) {
    const cx = ((i * 53) % size);
    const cy = ((i * 79) % size);
    const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 28);
    grad.addColorStop(0, 'rgba(255,255,255,0.06)');
    grad.addColorStop(1, 'rgba(128,128,128,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  cachedSmoothVinylBumpTex = tex;
  return tex;
}

interface LoftRingSpec {
  pos: [number, number, number];
  rx: number;
  rz: number;
  color: number;
}

function createLoftedGeometry(rings: LoftRingSpec[], radialSegs = 6): THREE.BufferGeometry {
  const curvePts = rings.map((r) => new THREE.Vector3(r.pos[0], r.pos[1], r.pos[2]));
  const curve = new THREE.CatmullRomCurve3(curvePts);
  const segs = Math.max(6, (rings.length - 1) * 3);
  const ring = Math.max(5, radialSegs);
  const cols = ring + 1;
  const vertCount = (segs + 1) * cols;
  const positions = new Float32Array(vertCount * 3);
  const colors = new Float32Array(vertCount * 3);
  const centers: THREE.Vector3[] = [];
  for (let i = 0; i <= segs; i++) {
    centers.push(curve.getPoint(i / segs));
  }

  const tangents: THREE.Vector3[] = [];
  for (let i = 0; i <= segs; i++) {
    const prev = centers[Math.max(0, i - 1)];
    const next = centers[Math.min(segs, i + 1)];
    const t = next.clone().sub(prev);
    if (t.lengthSq() < 1e-8) t.set(0, 1, 0);
    else t.normalize();
    tangents.push(t);
  }

  const normals: THREE.Vector3[] = [];
  const binormals: THREE.Vector3[] = [];
  const upRef = Math.abs(tangents[0].y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const b0 = new THREE.Vector3().crossVectors(tangents[0], upRef).normalize();
  const n0 = new THREE.Vector3().crossVectors(b0, tangents[0]).normalize();
  normals.push(n0);
  binormals.push(b0);

  const rotMat = new THREE.Matrix4();
  const axis = new THREE.Vector3();
  for (let i = 1; i <= segs; i++) {
    const nPrev = normals[i - 1].clone();
    axis.crossVectors(tangents[i - 1], tangents[i]);
    if (axis.lengthSq() > 1e-8) {
      axis.normalize();
      const angle = Math.acos(Math.max(-1, Math.min(1, tangents[i - 1].dot(tangents[i]))));
      nPrev.applyMatrix4(rotMat.makeRotationAxis(axis, angle));
    }
    const bi = new THREE.Vector3().crossVectors(tangents[i], nPrev).normalize();
    const ni = new THREE.Vector3().crossVectors(bi, tangents[i]).normalize();
    normals.push(ni);
    binormals.push(bi);
  }

  const ringColors = rings.map((r) => new THREE.Color(r.color));
  const tmpCol = new THREE.Color();
  let ptr = 0;
  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    const scaled = u * (rings.length - 1);
    const idx0 = Math.min(rings.length - 2, Math.floor(scaled));
    const idx1 = idx0 + 1;
    const frac = scaled - idx0;

    const rx = rings[idx0].rx + (rings[idx1].rx - rings[idx0].rx) * frac;
    const rz = rings[idx0].rz + (rings[idx1].rz - rings[idx0].rz) * frac;
    tmpCol.copy(ringColors[idx0]).lerp(ringColors[idx1], frac);

    const c = centers[i];
    const n = normals[i];
    const b = binormals[i];
    for (let j = 0; j <= ring; j++) {
      const theta = (j / ring) * Math.PI * 2;
      const sx = Math.cos(theta) * rx;
      const sy = Math.sin(theta) * rz;
      positions[ptr * 3] = c.x + n.x * sx + b.x * sy;
      positions[ptr * 3 + 1] = c.y + n.y * sx + b.y * sy;
      positions[ptr * 3 + 2] = c.z + n.z * sx + b.z * sy;
      colors[ptr * 3] = tmpCol.r;
      colors[ptr * 3 + 1] = tmpCol.g;
      colors[ptr * 3 + 2] = tmpCol.b;
      ptr++;
    }
  }

  const indices: number[] = [];
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < ring; j++) {
      const a = i * cols + j;
      const b = a + cols;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setIndex(indices);
  const nonIndexed = geo.toNonIndexed();
  nonIndexed.computeVertexNormals();
  geo.dispose();
  return nonIndexed;
}

/**
 * Plump Q-Cute Jelly Droplet Body Geometry:
 * Soft chubby bottom belly + smooth round cheeks + optional subtle droplet crown taper,
 * with smooth bottom-to-top creamy vertex gradient so candy colors have lush 3D translucency.
 */
function createPlumpJellyBodyGeometry(
  radius: number,
  sx: number,
  sy: number,
  sz: number,
  topColor = 0xffffff,
  bottomColor = 0xdbe7f3
): THREE.BufferGeometry {
  const rx = radius * sx;
  const ry = radius * sy;
  const rz = radius * sz;
  const sph = new THREE.SphereGeometry(1, 12, 9);
  const nonIdx = sph.index ? sph.toNonIndexed() : sph;
  const pos = nonIdx.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const colTop = new THREE.Color(topColor);
  const colBot = new THREE.Color(bottomColor);
  const colTmp = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    // Chubby lower cheeks (y < 0.15 swells slightly, very bottom flattens gently like soft mochi/jelly!)
    const bellySwell = y < 0.2 ? 1.0 + 0.11 * (1.0 - Math.abs(y + 0.25)) : 1.0 - 0.06 * Math.pow(Math.max(0, y - 0.2), 1.4);
    const flatBottom = y < -0.68 ? -0.68 + (y + 0.68) * 0.45 : y;
    pos.setXYZ(i, x * rx * bellySwell, flatBottom * ry, z * rz * bellySwell);

    const t = Math.max(0, Math.min(1, (y + 0.95) * 0.56));
    colTmp.copy(colBot).lerp(colTop, t);
    colors[i * 3] = colTmp.r;
    colors[i * 3 + 1] = colTmp.g;
    colors[i * 3 + 2] = colTmp.b;
  }

  nonIdx.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  nonIdx.computeVertexNormals();
  return nonIdx;
}

function createBeveledBladeGeometry(
  width: number,
  height: number,
  depth = 0.024,
  taper = 0.35
): THREE.BufferGeometry {
  const hw = width * 0.5;
  const hh = height * 0.5;
  const shape = new THREE.Shape();
  shape.moveTo(0, -hh);
  shape.quadraticCurveTo(hw * (1 + taper * 0.4), -hh * 0.15, hw * (1 - taper * 0.5), hh * 0.72);
  shape.quadraticCurveTo(hw * 0.25, hh, 0, hh);
  shape.quadraticCurveTo(-hw * 0.35, hh * 0.85, -hw * (1 - taper * 0.25), hh * 0.25);
  shape.quadraticCurveTo(-hw * 0.85, -hh * 0.45, 0, -hh);

  const bevelSize = Math.min(depth * 0.35, 0.012);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevelSize,
    bevelSize,
    bevelSegments: 1,
    curveSegments: 5,
  });
  geo.center();
  const nonIdx = geo.index ? geo.toNonIndexed() : geo;
  nonIdx.computeVertexNormals();
  return nonIdx;
}

function createColoredPart(
  geo: THREE.BufferGeometry,
  hexColor: number,
  partId: HumanoidPartId,
  glowWeight = 0,
  tintMask = 0
): PartSpec {
  const nonIndexed = geo.index ? geo.toNonIndexed() : geo.clone();
  nonIndexed.computeVertexNormals();
  return {
    geo: nonIndexed,
    color: hexColor,
    partId,
    glowWeight,
    tintMask,
  };
}

function mergeHumanoidParts(parts: PartSpec[]): THREE.BufferGeometry {
  let totalVertices = 0;
  for (const p of parts) {
    totalVertices += p.geo.attributes.position.count;
  }

  const positions = new Float32Array(totalVertices * 3);
  const normals = new Float32Array(totalVertices * 3);
  const colors = new Float32Array(totalVertices * 3);
  const uvs = new Float32Array(totalVertices * 2);
  const partIds = new Float32Array(totalVertices);
  const tintMasks = new Float32Array(totalVertices);

  const tmpColor = new THREE.Color();
  let offset = 0;

  for (const p of parts) {
    const posAttr = p.geo.attributes.position;
    const normAttr = p.geo.attributes.normal;
    const colAttr = p.geo.attributes.color;
    const count = posAttr.count;
    tmpColor.setHex(p.color);
    const hdrMult = 1.0 + (p.glowWeight || 0) * 0.24;
    const tMask = p.tintMask ?? 0;

    for (let i = 0; i < count; i++) {
      const idx3 = (offset + i) * 3;
      const idx2 = (offset + i) * 2;
      const px = posAttr.getX(i);
      const py = posAttr.getY(i);
      const pz = posAttr.getZ(i);

      positions[idx3] = px;
      positions[idx3 + 1] = py;
      positions[idx3 + 2] = pz;

      normals[idx3] = normAttr ? normAttr.getX(i) : 0;
      normals[idx3 + 1] = normAttr ? normAttr.getY(i) : 1;
      normals[idx3 + 2] = normAttr ? normAttr.getZ(i) : 0;

      const cr = colAttr ? colAttr.getX(i) : tmpColor.r;
      const cg = colAttr ? colAttr.getY(i) : tmpColor.g;
      const cb = colAttr ? colAttr.getZ(i) : tmpColor.b;
      colors[idx3] = cr * hdrMult;
      colors[idx3 + 1] = cg * hdrMult;
      colors[idx3 + 2] = cb * hdrMult;

      uvs[idx2] = (px + pz) * 1.6;
      uvs[idx2 + 1] = py * 1.6;

      partIds[offset + i] = p.partId;
      tintMasks[offset + i] = tMask;
    }

    offset += count;
    p.geo.dispose();
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  merged.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  merged.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  merged.setAttribute('aPartId', new THREE.BufferAttribute(partIds, 1));
  merged.setAttribute('aTintMask', new THREE.BufferAttribute(tintMasks, 1));
  return merged;
}

/**
 * Glossy Vinyl / Candy-Jelly PBR Material with GPU vertex-shader skeletal animation
 * AND selective `aTintMask` per-instance candy coloring (tints jelly bodies Sky-Blue / Apple-Green / Coral-Pink
 * while keeping white headbands, eyes, and glowing idol lightsticks 100% crisp!).
 */
export function createAnimatedHumanoidMaterial(options: {
  roughness?: number;
  metalness?: number;
  emissive?: number;
  emissiveIntensity?: number;
  shoulderY?: number;
  hipY?: number;
  rimColor?: number;
  usePhysicalClearcoat?: boolean;
}): THREE.MeshStandardMaterial {
  const shoulderY = options.shoulderY ?? 0.45;
  const hipY = options.hipY ?? 0.18;
  const rimCol = new THREE.Color(options.rimColor ?? 0xffffff);

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: options.roughness ?? 0.22,
    metalness: options.metalness ?? 0.06,
    emissive: options.emissive ?? 0x101820,
    emissiveIntensity: options.emissiveIntensity ?? 0.08,
    envMapIntensity: 0.0,
  });

  mat.onBeforeCompile = (shader) => {
    shader.vertexShader =
      `
      attribute float aPartId;
      attribute float aTintMask;
      attribute vec4 aAnim;
      varying float vFlash;
      varying float vHeight;
      varying float vTintMask;

      vec3 rotateX(vec3 p, float a) {
        float s = sin(a);
        float c = cos(a);
        return vec3(p.x, p.y * c - p.z * s, p.y * s + p.z * c);
      }

      vec3 rotateY(vec3 p, float a) {
        float s = sin(a);
        float c = cos(a);
        return vec3(p.x * c + p.z * s, p.y, -p.x * s + p.z * c);
      }

      vec3 rotateZ(vec3 p, float a) {
        float s = sin(a);
        float c = cos(a);
        return vec3(p.x * c - p.y * s, p.x * s + p.y * c, p.z);
      }
      ` + shader.vertexShader;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <color_vertex>',
      `
      #include <color_vertex>
      vTintMask = aTintMask;
      #if defined( USE_COLOR ) && defined( USE_INSTANCING_COLOR )
        vColor.xyz = mix( color.xyz, color.xyz * instanceColor.xyz, aTintMask );
      #endif
      `
    );

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      float walkPhase = aAnim.x;
      float speedAmt = clamp(aAnim.y, 0.0, 1.4);
      float activeAmt = max(0.68, speedAmt);
      float atk = clamp(aAnim.z, 0.0, 1.0);
      vFlash = aAnim.w;

      float stride = sin(walkPhase) * 0.98 * activeAmt;
      float hopWave = abs(sin(walkPhase));
      float bounce = hopWave * 0.22 * activeAmt;
      float jellySquash = cos(walkPhase * 2.0) * 0.14 * activeAmt;
      float atkSwing = sin(atk * 3.14159265);
      float wingFlap = sin(walkPhase * 2.4) * 0.52 * activeAmt + atkSwing * 0.55;

      if (aPartId > 3.5 && aPartId < 4.5) {
        vec3 local = transformed - vec3(-0.14, ${hipY.toFixed(2)}, 0.0);
        local = rotateX(local, stride);
        local = rotateZ(local, sin(walkPhase) * 0.12 * activeAmt);
        transformed = local + vec3(-0.14, ${hipY.toFixed(2)}, 0.0);
        transformed.y += max(0.0, sin(walkPhase)) * 0.14 * activeAmt;
      } else if (aPartId > 4.5 && aPartId < 5.5) {
        vec3 local = transformed - vec3(0.14, ${hipY.toFixed(2)}, 0.0);
        local = rotateX(local, -stride);
        local = rotateZ(local, -sin(walkPhase) * 0.12 * activeAmt);
        transformed = local + vec3(0.14, ${hipY.toFixed(2)}, 0.0);
        transformed.y += max(0.0, -sin(walkPhase)) * 0.14 * activeAmt;
      } else if (aPartId > 5.5 && aPartId < 6.5) {
        vec3 pivot = vec3(-0.16, ${(shoulderY + 0.08).toFixed(2)}, -0.16);
        vec3 local = transformed - pivot;
        local = rotateY(local, wingFlap);
        local = rotateZ(local, wingFlap * 0.52);
        transformed = local + pivot;
      } else if (aPartId > 6.5) {
        vec3 pivot = vec3(0.16, ${(shoulderY + 0.08).toFixed(2)}, -0.16);
        vec3 local = transformed - pivot;
        local = rotateY(local, -wingFlap);
        local = rotateZ(local, -wingFlap * 0.52);
        transformed = local + pivot;
      } else if (aPartId > 1.5 && aPartId < 2.5) {
        vec3 local = transformed - vec3(-0.28, ${shoulderY.toFixed(2)}, 0.0);
        local = rotateX(local, -stride * 1.05 - atkSwing * 0.85);
        local = rotateZ(local, (sin(walkPhase) * 0.34 - 0.12) * activeAmt - atkSwing * 0.28);
        local = rotateY(local, cos(walkPhase) * 0.22 * activeAmt);
        transformed = local + vec3(-0.28, ${shoulderY.toFixed(2)}, 0.0);
      } else if (aPartId > 2.5 && aPartId < 3.5) {
        vec3 local = transformed - vec3(0.28, ${shoulderY.toFixed(2)}, 0.0);
        local = rotateX(local, stride * 1.05 - atkSwing * 1.55);
        local = rotateZ(local, (-sin(walkPhase) * 0.34 + 0.12) * activeAmt + atkSwing * 0.32);
        local = rotateY(local, -cos(walkPhase) * 0.22 * activeAmt);
        transformed = local + vec3(0.28, ${shoulderY.toFixed(2)}, 0.0);
      } else if (aPartId > 0.5 && aPartId < 1.5) {
        vec3 headPivot = vec3(0.0, ${(shoulderY + 0.12).toFixed(2)}, 0.0);
        vec3 local = transformed - headPivot;
        local = rotateY(local, cos(walkPhase) * 0.25 * activeAmt);
        local = rotateZ(local, -sin(walkPhase) * 0.16 * activeAmt);
        local = rotateX(local, sin(walkPhase * 2.0 - 0.5) * 0.15 * activeAmt - atkSwing * 0.22);
        if (local.y > 0.18) {
          float tipFactor = clamp((local.y - 0.18) * 1.8, 0.0, 1.2);
          local.x += sin(walkPhase * 2.0 - 1.1) * 0.09 * tipFactor * activeAmt;
          local.z += cos(walkPhase * 2.0 - 1.1) * 0.08 * tipFactor * activeAmt;
        }
        transformed = local + headPivot;
      } else if (aPartId < 0.5) {
        vec3 bodyPivot = vec3(0.0, ${hipY.toFixed(2)}, 0.0);
        vec3 local = transformed - bodyPivot;
        local = rotateZ(local, sin(walkPhase) * 0.11 * activeAmt);
        local = rotateY(local, cos(walkPhase) * 0.14 * activeAmt);
        local = rotateX(local, sin(walkPhase * 2.0) * 0.08 * activeAmt + atkSwing * 0.2);
        transformed = local + bodyPivot;
      }

      // Soft Q-elastic jelly squash & stretch + secondary follow-through wave on body & head
      if (aPartId < 3.5 || aPartId > 5.5) {
        if (aPartId < 1.5) {
          float squashAmt = (aTintMask > 0.5 ? 1.0 : 0.6) * jellySquash;
          float bellyWave = sin(walkPhase * 2.0 - transformed.y * 2.5) * 0.055 * activeAmt;
          transformed.x *= (1.0 + squashAmt * 0.85 + bellyWave);
          transformed.z *= (1.0 + squashAmt * 0.85 - bellyWave);
          transformed.y *= max(0.72, 1.0 - squashAmt * 1.15);
        }
        transformed.y += bounce;
        transformed.z += atkSwing * 0.22;
      }
      vHeight = clamp(transformed.y, 0.0, 2.2);
      `
    );

    shader.fragmentShader =
      `
      varying float vFlash;
      varying float vHeight;
      varying float vTintMask;
      ` + shader.fragmentShader;

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `
      #include <emissivemap_fragment>
      diffuseColor.rgb *= mix(0.82, 1.0, smoothstep(0.02, 0.52, vHeight));
      `
    );

    // Strip redundant 3D PBR GGX light loops, shadow map lookups, and IBL environment fetches
    // since units render with our custom 2D Cel-Toon / MatCap shader below!
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <lights_physical_fragment>', '')
      .replace('#include <lights_fragment_begin>', '')
      .replace('#include <lights_fragment_maps>', '')
      .replace('#include <lights_fragment_end>', '');

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `
      // === TRUE 2D CEL-TOON / MATCAP ILLUSTRATION SHADING FOR UNITS ===
      vec3 viewDir2D = normalize(vViewPosition);
      vec3 viewN2D = normalize(normal);
      float ndv2D = abs(dot(viewN2D, viewDir2D));

      // 1. 2-Step Warm Cel-Toon Lighting (Zero dark/muddy 3D PBR shadows!)
      vec3 toonLightDir = normalize(vec3(-0.36, 0.74, 0.56));
      float ndl2D = dot(viewN2D, toonLightDir);
      float celBand = mix(0.80, 1.06, smoothstep(-0.10, 0.15, ndl2D));
      vec3 shadowWarmth = mix(vec3(0.95, 0.84, 0.78), vec3(1.0, 1.0, 1.0), smoothstep(-0.10, 0.15, ndl2D));
      vec3 toonCol = diffuseColor.rgb * shadowWarmth * celBand;

      // 2. Soft Translucent Jelly Rim Glow + Hit/Charge Flash
      float fresnel2D = pow(1.0 - ndv2D, 2.4);
      vec3 rimGlow2D = vec3(${rimCol.r.toFixed(3)}, ${rimCol.g.toFixed(3)}, ${rimCol.b.toFixed(3)}) * (fresnel2D * (0.14 + vTintMask * 0.16));
      vec3 flashGlow2D = vec3(1.0, 0.88, 0.42) * clamp(vFlash, 0.0, 0.65) * 0.45;
      toonCol += rimGlow2D + flashGlow2D;

      // 3. Iconic Supercell Vinyl-Toy Dual Specular Catchlights on Jelly Slimes (vTintMask > 0.5)
      if (vTintMask > 0.5 && viewN2D.z > 0.12) {
        vec2 catchUV = (viewN2D.xy - vec2(-0.31, 0.36)) * vec2(0.95, 1.32);
        float catchDot = 1.0 - smoothstep(0.14, 0.21, length(catchUV));
        vec2 subCatchUV = (viewN2D.xy - vec2(-0.14, 0.51)) * vec2(1.4, 1.6);
        float subCatchDot = 1.0 - smoothstep(0.06, 0.11, length(subCatchUV));
        float vinylGloss = max(catchDot, subCatchDot * 0.85);
        toonCol = mix(toonCol, vec3(1.0, 1.0, 1.0), vinylGloss * 0.96);
      } else {
        // Crisp 2D cartoon specular band for crowns, helmets, goggles & weapons
        float hardSpec = smoothstep(0.82, 0.89, max(0.0, dot(viewN2D, toonLightDir))) * 0.30;
        toonCol += vec3(hardSpec);
      }

      // 4. Crisp Supercell Vinyl-Toy Dark-Espresso Cartoon Silhouette Ink Outline (#1e110a)
      float inkEdge = 1.0 - smoothstep(0.24, 0.36, ndv2D);
      toonCol = mix(toonCol, vec3(0.118, 0.067, 0.039), inkEdge * 0.94);

      gl_FragColor = vec4(toonCol, diffuseColor.a);
      #include <dithering_fragment>
      `
    );
  };

  return mat;
}

export interface SkinPalette {
  primary: number;
  secondary: number;
  dark: number;
  accent: number;
  glow: number;
  emissive: number;
}

export const DEFAULT_SKIN_PALETTE: SkinPalette = {
  primary: 0x25c4f8,
  secondary: 0x12a4db,
  dark: 0x2c3340,
  accent: 0x67dcff,
  glow: 0xff7ac6,
  emissive: 0x0a2536,
};

export type RaceModelId = 'swarm' | 'titan' | 'gate' | 'plasma' | 'orbital' | 'bastion' | 'tycoon';

/**
 * Adds the shared Q-Cute Glossy Bubble Slime base anatomy:
 * - Stubby bouncy jelly feet (`partId 4, 5`, `tintMask = 1`)
 * - Plump round droplet jelly body + top droplet curl (`partId 0`, `tintMask = 1`)
 * - Knotted victory headband (`鉢巻`) wrapped all around + side/front perky knot tails (`partId 1`, `tintMask = 0`)
 * - Adorable dark oval eyes + white specular catchlights + rosy pink cheeks (`partId 1`, `tintMask = 0`)
 * - Stubby jelly hands (`partId 2, 3`, `tintMask = 1`)
 */
function addBaseBubbleSlimeAnatomy(
  parts: PartSpec[],
  bodyScale = 1.0,
  withDropletTip = true,
  withHeadband = true,
  headbandColor = 0xffffff
): void {
  // 1. Stubby Bouncy Jelly Feet
  for (const [side, partId] of [
    [-1, 4],
    [1, 5],
  ] as const) {
    const foot = new THREE.SphereGeometry(0.098 * bodyScale, 7, 5);
    foot.scale(1.08, 0.66, 1.25);
    foot.translate(side * 0.148 * bodyScale, 0.065 * bodyScale, 0.03);
    parts.push(createColoredPart(foot, 0xeef5fc, partId, 0, 1));
  }

  // 2. Plump Chubby Jelly Body
  const jellyBody = createPlumpJellyBodyGeometry(
    0.33 * bodyScale,
    1.1,
    0.95,
    1.05,
    0xffffff,
    0xd8e8f8
  );
  jellyBody.translate(0, 0.37 * bodyScale, 0);
  parts.push(createColoredPart(jellyBody, 0xffffff, 0, 0, 1));

  // Cute Water-Droplet Tip on Crown
  if (withDropletTip) {
    const tip = createLoftedGeometry(
      [
        { pos: [0, 0.62 * bodyScale, 0], rx: 0.115 * bodyScale, rz: 0.115 * bodyScale, color: 0xffffff },
        { pos: [-0.015, 0.73 * bodyScale, 0.01], rx: 0.058 * bodyScale, rz: 0.058 * bodyScale, color: 0xffffff },
        { pos: [-0.035, 0.82 * bodyScale, 0.02], rx: 0.012 * bodyScale, rz: 0.012 * bodyScale, color: 0xffffff },
      ],
      5
    );
    parts.push(createColoredPart(tip, 0xffffff, 1, 0, 1));
  }

  // 3. Knotted Victory Headband (Untinted crisp vinyl color!)
  if (withHeadband) {
    const band = new THREE.TorusGeometry(0.296 * bodyScale, 0.054 * bodyScale, 6, 14);
    band.rotateX(Math.PI / 2 + 0.08);
    band.scale(1.08, 1.0, 1.05);
    band.translate(0, 0.52 * bodyScale, 0.01 * bodyScale);
    parts.push(createColoredPart(band, headbandColor, 1, 0.25, 0));

    // Cute side-front knot + two perky ribbon tails (clearly visible when facing camera!)
    const knot = new THREE.SphereGeometry(0.066 * bodyScale, 6, 5);
    knot.translate(0.26 * bodyScale, 0.55 * bodyScale, 0.12 * bodyScale);
    parts.push(createColoredPart(knot, headbandColor, 1, 0.25, 0));

    for (const [angZ, offX, offY] of [
      [-0.48, 0.34, 0.66],
      [-0.96, 0.37, 0.56],
    ] as const) {
      const ribbonTail = createBeveledBladeGeometry(0.084 * bodyScale, 0.23 * bodyScale, 0.024, 0.25);
      ribbonTail.rotateZ(angZ);
      ribbonTail.rotateY(0.22);
      ribbonTail.translate(offX * bodyScale, offY * bodyScale, 0.1 * bodyScale);
      parts.push(createColoredPart(ribbonTail, headbandColor, 1, 0.25, 0));
    }
  }

  // 4. Bold 2D-Style Dark Oval Eyes + White Catchlights + Rosy Blush Cheeks (on front +Z)
  for (const side of [-1, 1]) {
    const eye = new THREE.SphereGeometry(0.052 * bodyScale, 7, 5);
    eye.scale(0.88, 1.22, 0.55);
    eye.translate(side * 0.118 * bodyScale, 0.405 * bodyScale, 0.332 * bodyScale);
    parts.push(createColoredPart(eye, 0x1e1620, 1, 0, 0));

    const catchlight = new THREE.SphereGeometry(0.022 * bodyScale, 5, 4);
    catchlight.translate((side * 0.118 - 0.014) * bodyScale, 0.432 * bodyScale, 0.356 * bodyScale);
    parts.push(createColoredPart(catchlight, 0xffffff, 1, 0.8, 0));

    const blush = new THREE.SphereGeometry(0.056 * bodyScale, 6, 5);
    blush.scale(1.3, 0.68, 0.4);
    blush.translate(side * 0.205 * bodyScale, 0.345 * bodyScale, 0.308 * bodyScale);
    parts.push(createColoredPart(blush, 0xff6e96, 1, 0.35, 0));
  }

  // Cute cheerful smile curve
  const smile = new THREE.TorusGeometry(0.036 * bodyScale, 0.013 * bodyScale, 4, 7, Math.PI);
  smile.rotateZ(Math.PI);
  smile.translate(0, 0.365 * bodyScale, 0.342 * bodyScale);
  parts.push(createColoredPart(smile, 0x29151c, 1, 0, 0));

  // 5. Stubby Jelly Hands (Left = partId 2, Right = partId 3)
  for (const [side, partId] of [
    [-1, 2],
    [1, 3],
  ] as const) {
    const hand = new THREE.SphereGeometry(0.086 * bodyScale, 7, 5);
    hand.scale(0.95, 0.95, 1.15);
    hand.translate(side * 0.34 * bodyScale, 0.38 * bodyScale, 0.08);
    parts.push(createColoredPart(hand, 0xf2f8ff, partId, 0, 1));
  }
}

function addIdolLightstick(
  parts: PartSpec[],
  side: -1 | 1,
  partId: 2 | 3,
  glowHex: number,
  scale = 1.0
): void {
  const x = side * 0.37 * scale;
  const tiltZ = -side * 0.34;
  const tiltX = 0.28;

  const grip = new THREE.CylinderGeometry(0.022 * scale, 0.024 * scale, 0.11 * scale, 6);
  grip.rotateZ(tiltZ);
  grip.rotateX(tiltX);
  grip.translate(x, 0.4 * scale, 0.07 * scale);
  parts.push(createColoredPart(grip, 0x3b2d38, partId, 0, 0));

  const tube = new THREE.CapsuleGeometry(0.033 * scale, 0.24 * scale, 3, 6);
  tube.rotateZ(tiltZ);
  tube.rotateX(tiltX);
  tube.translate(x + side * 0.055 * scale, 0.55 * scale, 0.12 * scale);
  parts.push(createColoredPart(tube, glowHex, partId, 1.0, 0));

  const core = new THREE.CapsuleGeometry(0.018 * scale, 0.2 * scale, 3, 5);
  core.rotateZ(tiltZ);
  core.rotateX(tiltX);
  core.translate(x + side * 0.055 * scale, 0.55 * scale, 0.12 * scale);
  parts.push(createColoredPart(core, 0xffffff, partId, 1.0, 0));
}

/**
 * 1. Race-Specific Q-Cute Glossy Bubble Slime Trooper Geometry (7 Distinct Cute Playable Races)
 * - swarm   (💧 波波偶像团): Classic droplet tip + white victory headband + dual neon pink/lemon idol lightsticks + ribbon wings
 * - titan   (🍮 焦糖布丁族): Caramel chocolate glaze top + whipped cream cherry crown + waffle-biscuit candy mallet
 * - gate    (🎀 星梦兔耳族): Tall cute bunny ears + spinning golden star halo + golden star magical wand
 * - plasma  (⚡ 电音喵喵族): Perky cat ears + gold/black DJ headphones + dorsal equalizer rings + lightning glowstick
 * - orbital (🎵 云朵音律族): Fluffy white angel cloud-wings + mini conductor top-hat + golden microphone scepter
 * - bastion (🛡️ 皇家曲奇族): Brass crown trim + twin pink cheer flags + chocolate-chip cookie shield & candy lance
 * - tycoon  (🪙 招财金团族): Golden fortune horns + golden coin wings + golden fortune-coin cannon
 */
export function buildBlueMarineGeometry(
  _palette: SkinPalette = DEFAULT_SKIN_PALETTE,
  raceId: RaceModelId = 'swarm'
): THREE.BufferGeometry {
  const parts: PartSpec[] = [];

  if (raceId === 'swarm') {
    // Iconic Supercell Crimson Victory Headband (0xef4444) on Waterdrop Bobo!
    addBaseBubbleSlimeAnatomy(parts, 1.0, true, true, 0xef4444);
    // Dual Glowing Neon Pink & Sunny-Gold Idol Lightsticks
    addIdolLightstick(parts, -1, 2, 0xff6ac6, 1.0);
    addIdolLightstick(parts, 1, 3, 0xffe066, 1.0);

    // Subtle fluttering pastel cheer ribbons on back (partId 6 & 7)
    for (const [side, wId] of [
      [-1, 6],
      [1, 7],
    ] as const) {
      const wing = createBeveledBladeGeometry(0.11, 0.24, 0.018, 0.3);
      wing.rotateY(Math.PI / 2);
      wing.rotateZ(-side * 0.65);
      wing.translate(side * 0.16, 0.45, -0.25);
      parts.push(createColoredPart(wing, 0xfff0f7, wId, 0.35, 0));
    }
    return mergeHumanoidParts(parts);
  }

  if (raceId === 'titan') {
    // 🍮 Caramel Pudding Slime with Chocolate-Caramel Glaze Cap, Golden 3D Royal Crown + Ruby Gem & Waffle Candy Hammer
    addBaseBubbleSlimeAnatomy(parts, 1.08, false, false);

    const caramelCap = new THREE.SphereGeometry(0.29, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5);
    caramelCap.scale(1.14, 0.74, 1.1);
    caramelCap.translate(0, 0.54, 0);
    parts.push(createColoredPart(caramelCap, 0x6b2d12, 1, 0.12, 0));

    // Golden 3D Royal Crown + Front Ruby Gem (Matches Supercell Vinyl-Toy Asset Sheet!)
    const crownBase = new THREE.CylinderGeometry(0.155, 0.135, 0.095, 10);
    crownBase.translate(0, 0.74, 0);
    parts.push(createColoredPart(crownBase, 0xfacc15, 1, 0.45, 0));

    for (let cp = 0; cp < 5; cp++) {
      const ang = (cp / 5) * Math.PI * 2;
      const spike = new THREE.ConeGeometry(0.042, 0.09, 5);
      spike.translate(Math.sin(ang) * 0.125, 0.82, Math.cos(ang) * 0.125);
      parts.push(createColoredPart(spike, 0xfde047, 1, 0.55, 0));
    }

    const crownRuby = new THREE.OctahedronGeometry(0.044, 0);
    crownRuby.translate(0, 0.75, 0.145);
    parts.push(createColoredPart(crownRuby, 0xef4444, 1, 0.65, 0));

    addIdolLightstick(parts, -1, 2, 0xff85c8, 1.0);

    // Giant Biscuit & Caramel Waffle Hammer in right hand
    const handle = new THREE.CylinderGeometry(0.028, 0.03, 0.48, 7);
    handle.rotateX(Math.PI / 3);
    handle.translate(0.38, 0.5, 0.18);
    parts.push(createColoredPart(handle, 0xc88446, 3, 0, 0));

    const malletHead = new THREE.CylinderGeometry(0.135, 0.135, 0.28, 12);
    malletHead.rotateZ(Math.PI / 2);
    malletHead.translate(0.38, 0.64, 0.34);
    parts.push(createColoredPart(malletHead, 0xf6bd2e, 3, 0.45, 0));

    for (const side of [-1, 1]) {
      const waffleCap = new THREE.CylinderGeometry(0.142, 0.142, 0.036, 12);
      waffleCap.rotateZ(Math.PI / 2);
      waffleCap.translate(0.38 + side * 0.14, 0.64, 0.34);
      parts.push(createColoredPart(waffleCap, 0x9a4e1c, 3, 0.2, 0));
    }

    return mergeHumanoidParts(parts);
  }

  if (raceId === 'gate') {
    // 🎀 Star-Dream Bunny Slime with Long Bunny Ears, Star Halo & Star Magical Wand
    addBaseBubbleSlimeAnatomy(parts, 1.0, false, true);

    for (const side of [-1, 1]) {
      const outerEar = new THREE.CapsuleGeometry(0.062, 0.24, 5, 8);
      outerEar.scale(1.0, 1.0, 0.58);
      outerEar.rotateZ(-side * 0.22);
      outerEar.translate(side * 0.13, 0.78, -0.02);
      parts.push(createColoredPart(outerEar, 0xffffff, 1, 0, 1));

      const innerEar = new THREE.CapsuleGeometry(0.036, 0.17, 4, 6);
      innerEar.scale(1.0, 1.0, 0.35);
      innerEar.rotateZ(-side * 0.22);
      innerEar.translate(side * 0.13, 0.78, 0.015);
      parts.push(createColoredPart(innerEar, 0xff9ebb, 1, 0.25, 0));
    }

    const starHalo = new THREE.TorusGeometry(0.24, 0.024, 6, 16);
    starHalo.translate(0, 0.62, -0.26);
    parts.push(createColoredPart(starHalo, 0xffe066, 6, 0.9, 0));

    addIdolLightstick(parts, -1, 2, 0xff70c8, 1.0);

    const wandStick = new THREE.CylinderGeometry(0.02, 0.022, 0.42, 7);
    wandStick.rotateX(0.35);
    wandStick.rotateZ(-0.25);
    wandStick.translate(0.39, 0.52, 0.12);
    parts.push(createColoredPart(wandStick, 0xfff5d6, 3, 0.2, 0));

    const wandStar = new THREE.OctahedronGeometry(0.095, 0);
    wandStar.scale(1.15, 1.15, 0.55);
    wandStar.translate(0.44, 0.7, 0.19);
    parts.push(createColoredPart(wandStar, 0xffdf4d, 3, 1.0, 0));

    return mergeHumanoidParts(parts);
  }

  if (raceId === 'plasma') {
    // ⚡ Electro-Meow DJ Cat Slime with Cat Ears, Black/Gold Headphones & Lightning Glowsticks
    addBaseBubbleSlimeAnatomy(parts, 1.0, false, true);

    for (const side of [-1, 1]) {
      const catEar = new THREE.ConeGeometry(0.095, 0.19, 4);
      catEar.rotateY(Math.PI / 4);
      catEar.rotateZ(-side * 0.35);
      catEar.translate(side * 0.19, 0.7, 0);
      parts.push(createColoredPart(catEar, 0xffffff, 1, 0, 1));

      const earCup = new THREE.CylinderGeometry(0.085, 0.085, 0.07, 12);
      earCup.rotateZ(Math.PI / 2);
      earCup.translate(side * 0.31, 0.49, 0);
      parts.push(createColoredPart(earCup, 0x2b2f38, 1, 0, 0));

      const earGold = new THREE.CylinderGeometry(0.06, 0.06, 0.08, 10);
      earGold.rotateZ(Math.PI / 2);
      earGold.translate(side * 0.315, 0.49, 0);
      parts.push(createColoredPart(earGold, 0xf7c331, 1, 0.65, 0));
    }

    const headArc = new THREE.TorusGeometry(0.305, 0.026, 7, 18, Math.PI);
    headArc.translate(0, 0.49, 0);
    parts.push(createColoredPart(headArc, 0x2b2f38, 1, 0, 0));

    for (const [side, eqId] of [
      [-1, 6],
      [1, 7],
    ] as const) {
      const eqRing = new THREE.TorusGeometry(0.11, 0.022, 6, 12);
      eqRing.translate(side * 0.16, 0.56, -0.26);
      parts.push(createColoredPart(eqRing, 0xffe047, eqId, 0.95, 0));
    }

    addIdolLightstick(parts, -1, 2, 0xffe047, 1.05);
    addIdolLightstick(parts, 1, 3, 0x45e3ff, 1.05);
    return mergeHumanoidParts(parts);
  }

  if (raceId === 'orbital') {
    // 🎵 Cloud-Melody Angel Slime with Fluffy White Cloud Wings, Mini Top-Hat & Golden Mic
    addBaseBubbleSlimeAnatomy(parts, 1.0, false, true);

    const hatBrim = new THREE.CylinderGeometry(0.15, 0.15, 0.03, 12);
    hatBrim.rotateZ(-0.15);
    hatBrim.translate(0.05, 0.68, 0);
    parts.push(createColoredPart(hatBrim, 0x5b3b8c, 1, 0, 0));

    const hatTop = new THREE.CylinderGeometry(0.105, 0.095, 0.15, 12);
    hatTop.rotateZ(-0.15);
    hatTop.translate(0.07, 0.76, 0);
    parts.push(createColoredPart(hatTop, 0x7c4dff, 1, 0.2, 0));

    const hatRibbon = new THREE.CylinderGeometry(0.102, 0.1, 0.04, 12);
    hatRibbon.rotateZ(-0.15);
    hatRibbon.translate(0.06, 0.71, 0);
    parts.push(createColoredPart(hatRibbon, 0xf7c331, 1, 0.5, 0));

    // Fluffy White Angel Cloud Wings (partId 6 & 7)
    for (const [side, wId] of [
      [-1, 6],
      [1, 7],
    ] as const) {
      for (const [ox, oy, r] of [
        [0.18, 0.52, 0.095],
        [0.29, 0.58, 0.105],
        [0.37, 0.5, 0.08],
      ] as const) {
        const puff = new THREE.SphereGeometry(r, 8, 8);
        puff.scale(1.1, 0.9, 0.65);
        puff.translate(side * ox, oy, -0.24);
        parts.push(createColoredPart(puff, 0xffffff, wId, 0.3, 0));
      }
    }

    addIdolLightstick(parts, -1, 2, 0xff70d0, 1.0);

    // Golden Concert Microphone Staff in right hand
    const micRod = new THREE.CylinderGeometry(0.022, 0.022, 0.36, 7);
    micRod.rotateX(0.32);
    micRod.rotateZ(-0.25);
    micRod.translate(0.38, 0.5, 0.12);
    parts.push(createColoredPart(micRod, 0xd89e32, 3, 0.3, 0));

    const micBall = new THREE.SphereGeometry(0.072, 10, 10);
    micBall.translate(0.43, 0.67, 0.18);
    parts.push(createColoredPart(micBall, 0xffe066, 3, 0.85, 0));

    return mergeHumanoidParts(parts);
  }

  if (raceId === 'bastion') {
    // 🛡️ Royal Cookie Knight Slime with Golden Knight Crown/Helm, Twin Cheer Flags, Gear-Rimmed Cookie Shield & Candy Lance
    addBaseBubbleSlimeAnatomy(parts, 1.02, false, true, 0xfacc15);

    // Golden Knight Visor Crown on top of head
    const knightHelm = new THREE.CylinderGeometry(0.17, 0.21, 0.12, 10);
    knightHelm.translate(0, 0.68, 0);
    parts.push(createColoredPart(knightHelm, 0xfacc15, 1, 0.4, 0));

    const helmPlume = new THREE.BoxGeometry(0.06, 0.14, 0.22);
    helmPlume.translate(0, 0.78, -0.02);
    parts.push(createColoredPart(helmPlume, 0xef4444, 1, 0.45, 0));

    for (const [side, fId] of [
      [-1, 6],
      [1, 7],
    ] as const) {
      const pole = new THREE.CylinderGeometry(0.016, 0.016, 0.48, 6);
      pole.translate(side * 0.15, 0.66, -0.24);
      parts.push(createColoredPart(pole, 0xd89e32, fId, 0.2, 0));

      const flag = new THREE.BoxGeometry(0.02, 0.22, 0.17);
      flag.translate(side * 0.15, 0.78, -0.32);
      parts.push(createColoredPart(flag, 0xf47296, fId, 0.45, 0));
    }

    // Round Golden-Brass Gear-Toothed Cookie Shield on left arm
    const shieldRim = new THREE.CylinderGeometry(0.205, 0.205, 0.055, 12);
    shieldRim.rotateX(Math.PI / 2);
    shieldRim.rotateY(0.32);
    shieldRim.translate(-0.36, 0.39, 0.16);
    parts.push(createColoredPart(shieldRim, 0xfacc15, 2, 0.45, 0));

    const cookieFace = new THREE.CylinderGeometry(0.155, 0.155, 0.065, 14);
    cookieFace.rotateX(Math.PI / 2);
    cookieFace.rotateY(0.32);
    cookieFace.translate(-0.36, 0.39, 0.168);
    parts.push(createColoredPart(cookieFace, 0xd98a3c, 2, 0.15, 0));

    // Candy Lance on right arm
    const lance = new THREE.ConeGeometry(0.068, 0.5, 8);
    lance.rotateX(Math.PI / 2);
    lance.translate(0.37, 0.41, 0.26);
    parts.push(createColoredPart(lance, 0xff6b8b, 3, 0.65, 0));

    return mergeHumanoidParts(parts);
  }

  // 🪙 TYCOON RACE: Lucky Fortune-Gold Slime with Golden Horns, Coin Wings & Treasure Rattle
  addBaseBubbleSlimeAnatomy(parts, 1.0, false, true);

  for (const side of [-1, 1]) {
    const goldHorn = createLoftedGeometry(
      [
        { pos: [side * 0.14, 0.62, 0.02], rx: 0.052, rz: 0.052, color: 0xd89e32 },
        { pos: [side * 0.2, 0.75, -0.03], rx: 0.034, rz: 0.034, color: 0xffd43b },
        { pos: [side * 0.23, 0.85, -0.08], rx: 0.008, rz: 0.008, color: 0xfff3bf },
      ],
      6
    );
    parts.push(createColoredPart(goldHorn, 0xffd43b, 1, 0.65, 0));
  }

  for (const [side, wId] of [
    [-1, 6],
    [1, 7],
  ] as const) {
    const coinWing = new THREE.CylinderGeometry(0.14, 0.14, 0.03, 12);
    coinWing.rotateX(Math.PI / 2);
    coinWing.rotateY(side * 0.42);
    coinWing.translate(side * 0.24, 0.52, -0.24);
    parts.push(createColoredPart(coinWing, 0xffcf33, wId, 0.75, 0));
  }

  addIdolLightstick(parts, -1, 2, 0xffe066, 1.0);

  const goldCannon = new THREE.CylinderGeometry(0.08, 0.06, 0.38, 10);
  goldCannon.rotateX(Math.PI / 2);
  goldCannon.translate(0.37, 0.42, 0.22);
  parts.push(createColoredPart(goldCannon, 0xf5b727, 3, 0.65, 0));

  return mergeHumanoidParts(parts);
}

/**
 * 2. Colossal Idol Concert Leader / Super-King Bubble Mascot (`buildChampionMechaGeometry`)
 * Summoned when "安可演唱会" reaches 100%!
 */
export function buildChampionMechaGeometry(
  palette: SkinPalette = DEFAULT_SKIN_PALETTE,
  raceId: RaceModelId = 'swarm'
): THREE.BufferGeometry {
  const parts: PartSpec[] = [];

  // Bouncy Idol Boots
  for (const [side, partId] of [
    [-1, 4],
    [1, 5],
  ] as const) {
    const boot = new THREE.CapsuleGeometry(0.16, 0.24, 6, 10);
    boot.translate(side * 0.26, 0.22, 0.02);
    parts.push(createColoredPart(boot, 0xfff8eb, partId, 0.1, 0));

    const sole = new THREE.BoxGeometry(0.32, 0.12, 0.42);
    sole.translate(side * 0.26, 0.06, 0.05);
    parts.push(createColoredPart(sole, 0xd89e32, partId, 0.3, 0));
  }

  // Giant Plump Crowned Idol Bubble King Body
  const heroColor = raceId === 'tycoon' ? 0xf7b731 : raceId === 'titan' ? 0xf59f42 : palette.primary;
  const heroBelly = createPlumpJellyBodyGeometry(0.68, 1.08, 0.96, 1.04, heroColor, palette.secondary);
  heroBelly.translate(0, 0.88, 0);
  parts.push(createColoredPart(heroBelly, heroColor, 0, 0.15, 0));

  // Pure-White Giant Victory Headband + Ribbon Tails
  const heroBand = new THREE.TorusGeometry(0.61, 0.085, 8, 24);
  heroBand.rotateX(Math.PI / 2 + 0.06);
  heroBand.scale(1.07, 1.0, 1.04);
  heroBand.translate(0, 1.18, 0);
  parts.push(createColoredPart(heroBand, 0xffffff, 1, 0.25, 0));

  // Golden Idol Crown + Headphones
  const crownBase = new THREE.CylinderGeometry(0.28, 0.24, 0.18, 12);
  crownBase.translate(0, 1.56, 0);
  parts.push(createColoredPart(crownBase, 0xf7c331, 1, 0.65, 0));

  for (const side of [-1, 0, 1]) {
    const jewel = new THREE.OctahedronGeometry(0.09, 0);
    jewel.translate(side * 0.16, 1.7, 0.08);
    parts.push(createColoredPart(jewel, side === 0 ? 0xff5ca8 : 0xffe066, 1, 1.0, 0));
  }

  for (const side of [-1, 1]) {
    const earPhone = new THREE.CylinderGeometry(0.18, 0.18, 0.14, 14);
    earPhone.rotateZ(Math.PI / 2);
    earPhone.translate(side * 0.68, 1.08, 0);
    parts.push(createColoredPart(earPhone, 0x2d313a, 1, 0, 0));

    const earRing = new THREE.CylinderGeometry(0.13, 0.13, 0.16, 12);
    earRing.rotateZ(Math.PI / 2);
    earRing.translate(side * 0.69, 1.08, 0);
    parts.push(createColoredPart(earRing, 0xf7c331, 1, 0.7, 0));

    const eye = new THREE.SphereGeometry(0.085, 10, 10);
    eye.scale(0.88, 1.2, 0.55);
    eye.translate(side * 0.24, 0.98, 0.67);
    parts.push(createColoredPart(eye, 0x1e2430, 1, 0, 0));

    const blush = new THREE.SphereGeometry(0.09, 8, 8);
    blush.scale(1.3, 0.65, 0.4);
    blush.translate(side * 0.39, 0.85, 0.62);
    parts.push(createColoredPart(blush, 0xff7597, 1, 0.3, 0));
  }

  // Fluttering Idol Concert Banner Wings / Star Halo on Back (partId 6 & 7)
  for (const [side, wId] of [
    [-1, 6],
    [1, 7],
  ] as const) {
    const wing = createBeveledBladeGeometry(0.36, 0.95, 0.05, 0.35);
    wing.rotateY(Math.PI / 2 + side * 0.25);
    wing.rotateZ(-side * 0.52);
    wing.translate(side * 0.52, 1.12, -0.52);
    parts.push(createColoredPart(wing, 0xff70b8, wId, 0.85, 0));

    const subWing = createBeveledBladeGeometry(0.24, 0.72, 0.04, 0.35);
    subWing.rotateY(Math.PI / 2 + side * 0.28);
    subWing.rotateZ(-side * 0.75);
    subWing.translate(side * 0.62, 0.95, -0.55);
    parts.push(createColoredPart(subWing, 0xffe066, wId, 0.95, 0));
  }

  // Left Arm + Star Tambourine Cheer Shield
  const lHand = new THREE.SphereGeometry(0.18, 10, 10);
  lHand.translate(-0.74, 0.88, 0.14);
  parts.push(createColoredPart(lHand, heroColor, 2, 0.1, 0));

  const starShield = new THREE.CylinderGeometry(0.38, 0.38, 0.1, 16);
  starShield.rotateZ(Math.PI / 2);
  starShield.translate(-0.88, 0.92, 0.26);
  parts.push(createColoredPart(starShield, 0xf7c331, 2, 0.6, 0));

  const shieldHeart = new THREE.SphereGeometry(0.24, 12, 10);
  shieldHeart.scale(0.45, 1.0, 1.0);
  shieldHeart.translate(-0.92, 0.92, 0.26);
  parts.push(createColoredPart(shieldHeart, 0xff6ac6, 2, 0.95, 0));

  // Right Arm + Colossal Golden Microphone & Pink Music-Note Megaphone Hammer!
  const rHand = new THREE.SphereGeometry(0.18, 10, 10);
  rHand.translate(0.74, 0.88, 0.16);
  parts.push(createColoredPart(rHand, heroColor, 3, 0.1, 0));

  const micShaft = new THREE.CylinderGeometry(0.065, 0.065, 1.28, 10);
  micShaft.rotateX(Math.PI / 3);
  micShaft.translate(0.74, 0.98, 0.54);
  parts.push(createColoredPart(micShaft, 0xd89e32, 3, 0.4, 0));

  const micHeadL = new THREE.CylinderGeometry(0.26, 0.2, 0.32, 14);
  micHeadL.rotateZ(Math.PI / 2);
  micHeadL.translate(0.58, 1.26, 0.98);
  parts.push(createColoredPart(micHeadL, 0xff6ac6, 3, 1.0, 0));

  const micHeadR = new THREE.CylinderGeometry(0.2, 0.28, 0.34, 14);
  micHeadR.rotateZ(Math.PI / 2);
  micHeadR.translate(0.9, 1.26, 0.98);
  parts.push(createColoredPart(micHeadR, 0xf7c331, 3, 0.85, 0));

  return mergeHumanoidParts(parts);
}

/**
 * 3. Steampunk Factory Catcher Goon (`buildRedMutantGeometry`)
 * Matches the reference screenshot 1:1:
 * - Charcoal-iron dome pot-helmet (#434852) with bright Red Star emblem on front
 * - White-rimmed twin round goggles over dark mask
 * - Brick-red factory coat (#c8493a), dark belt + brass buckle, charcoal gloves & boots
 * - Red pressurized back tank + Long-handled White-Mesh Bubble-Catcher Net!
 */
export function buildRedMutantGeometry(): THREE.BufferGeometry {
  const parts: PartSpec[] = [];

  // Chunky Charcoal Factory Work Boots & Trousers
  for (const [side, partId] of [
    [-1, 4],
    [1, 5],
  ] as const) {
    const leg = new THREE.CapsuleGeometry(0.082, 0.16, 4, 8);
    leg.translate(side * 0.125, 0.24, 0);
    parts.push(createColoredPart(leg, 0x3a3e47, partId));

    const boot = new THREE.BoxGeometry(0.15, 0.12, 0.23);
    boot.translate(side * 0.125, 0.06, 0.035);
    parts.push(createColoredPart(boot, 0x262930, partId));
  }

  // Brick-Red Double-Breasted Factory Coat + Dark Belt + Brass Buckle + Red Back Tank
  const coat = createPlumpJellyBodyGeometry(0.25, 1.02, 0.98, 0.92, 0xd45242, 0xa33629);
  coat.translate(0, 0.52, 0);
  parts.push(createColoredPart(coat, 0xc8493a, 0));

  const belt = new THREE.CylinderGeometry(0.245, 0.25, 0.075, 12);
  belt.translate(0, 0.44, 0);
  parts.push(createColoredPart(belt, 0x2b2e36, 0));

  const buckle = new THREE.BoxGeometry(0.09, 0.075, 0.04);
  buckle.translate(0, 0.44, 0.24);
  parts.push(createColoredPart(buckle, 0xe2a838, 0, 0.35));

  const backTank = new THREE.CapsuleGeometry(0.105, 0.22, 5, 8);
  backTank.translate(0, 0.58, -0.24);
  parts.push(createColoredPart(backTank, 0xb8382c, 0));

  const tankCap = new THREE.CylinderGeometry(0.05, 0.05, 0.06, 8);
  tankCap.translate(0, 0.76, -0.24);
  parts.push(createColoredPart(tankCap, 0xd89e32, 0, 0.3));

  // Masked Head + White-Rimmed Round Steampunk Goggles + Iron Pot-Helmet with Red Star!
  const maskHead = new THREE.SphereGeometry(0.21, 8, 6);
  maskHead.translate(0, 0.86, 0.02);
  parts.push(createColoredPart(maskHead, 0x2c3038, 1));

  for (const side of [-1, 1]) {
    const goggleRim = new THREE.CylinderGeometry(0.072, 0.072, 0.06, 8);
    goggleRim.rotateX(Math.PI / 2);
    goggleRim.translate(side * 0.082, 0.85, 0.2);
    parts.push(createColoredPart(goggleRim, 0xf8fafc, 1, 0.35));

    const goggleLens = new THREE.CylinderGeometry(0.048, 0.048, 0.068, 7);
    goggleLens.rotateX(Math.PI / 2);
    goggleLens.translate(side * 0.082, 0.85, 0.205);
    parts.push(createColoredPart(goggleLens, 0x1e2229, 1));
  }

  // Dark Charcoal-Iron Dome Pot-Helmet + Brim + Front Red Star Emblem
  const helmetDome = new THREE.SphereGeometry(0.245, 9, 6, 0, Math.PI * 2, 0, Math.PI * 0.56);
  helmetDome.scale(1.06, 0.96, 1.08);
  helmetDome.translate(0, 0.9, 0.01);
  parts.push(createColoredPart(helmetDome, 0x484d57, 1));

  const helmetBrim = new THREE.TorusGeometry(0.245, 0.028, 5, 12);
  helmetBrim.rotateX(Math.PI / 2 - 0.06);
  helmetBrim.scale(1.06, 1.08, 1.0);
  helmetBrim.translate(0, 0.91, 0.015);
  parts.push(createColoredPart(helmetBrim, 0x3b3f47, 1));

  const redStar = new THREE.OctahedronGeometry(0.055, 0);
  redStar.scale(1.15, 1.15, 0.45);
  redStar.translate(0, 1.01, 0.24);
  parts.push(createColoredPart(redStar, 0xff3b47, 1, 0.75));

  // Left & Right Arms + Long-Handled White-Mesh Bubble-Catcher Net!
  const lArm = new THREE.CapsuleGeometry(0.068, 0.2, 3, 6);
  lArm.rotateX(0.45);
  lArm.translate(-0.26, 0.54, 0.08);
  parts.push(createColoredPart(lArm, 0xb83e30, 2));

  const rArm = new THREE.CapsuleGeometry(0.068, 0.2, 3, 6);
  rArm.rotateX(0.55);
  rArm.translate(0.26, 0.54, 0.1);
  parts.push(createColoredPart(rArm, 0xb83e30, 3));

  // Catcher Net Pole + Silver Hoop + Conical White Woven Net Bag (partId 3 so they swing the net!)
  const netPole = new THREE.CylinderGeometry(0.024, 0.026, 0.86, 6);
  netPole.rotateX(Math.PI / 2.8);
  netPole.rotateZ(-0.35);
  netPole.translate(0.32, 0.56, 0.28);
  parts.push(createColoredPart(netPole, 0x4a3525, 3));

  const netHoop = new THREE.TorusGeometry(0.21, 0.022, 5, 10);
  netHoop.rotateY(0.35);
  netHoop.rotateX(0.45);
  netHoop.translate(0.48, 0.78, 0.58);
  parts.push(createColoredPart(netHoop, 0xdbe2ec, 3, 0.25));

  const netBag = new THREE.ConeGeometry(0.205, 0.36, 7, 1, true);
  netBag.rotateX(-1.1);
  netBag.rotateZ(0.25);
  netBag.translate(0.51, 0.72, 0.44);
  parts.push(createColoredPart(netBag, 0xf1f5f9, 3, 0.25));

  return mergeHumanoidParts(parts);
}

/**
 * 4. Giant Copper-Orange Boiler-Suit Foreman (`buildBruteGeometry`)
 * Matches the giant boss/foreman in the reference screenshot:
 * - Hulking copper-orange riveted boiler armor (#d95f38) with leather & brass chest straps
 * - Dark iron dome helmet with glowing golden-yellow goggle eyes
 * - Twin red steam tanks on back + Giant Metallic-Silver C-Jaw Monkey Wrench!
 */
export function buildBruteGeometry(): THREE.BufferGeometry {
  const parts: PartSpec[] = [];

  for (const [side, partId] of [
    [-1, 4],
    [1, 5],
  ] as const) {
    const leg = new THREE.CapsuleGeometry(0.17, 0.32, 6, 10);
    leg.translate(side * 0.26, 0.36, 0);
    parts.push(createColoredPart(leg, 0x7c462b, partId));

    const boot = new THREE.BoxGeometry(0.28, 0.22, 0.36);
    boot.translate(side * 0.26, 0.12, 0.04);
    parts.push(createColoredPart(boot, 0x353942, partId));
  }

  // Broad Copper-Orange Boiler-Suit Torso + Brass Harness + Twin Red Back Tanks
  const torso = createPlumpJellyBodyGeometry(0.56, 1.18, 1.08, 0.96, 0xe86b42, 0xb54424);
  torso.translate(0, 1.04, 0);
  parts.push(createColoredPart(torso, 0xd95f38, 0));

  const chestStrap = new THREE.BoxGeometry(0.76, 0.2, 0.56);
  chestStrap.translate(0, 1.08, 0.16);
  parts.push(createColoredPart(chestStrap, 0x6b3e26, 0));

  const brassPlate = new THREE.BoxGeometry(0.36, 0.26, 0.14);
  brassPlate.translate(0, 1.08, 0.42);
  parts.push(createColoredPart(brassPlate, 0xd89e32, 0, 0.35));

  for (const side of [-1, 1]) {
    const tank = new THREE.CapsuleGeometry(0.18, 0.48, 6, 10);
    tank.translate(side * 0.24, 1.18, -0.44);
    parts.push(createColoredPart(tank, 0xc43c2f, 0));
  }

  // Dark Iron Dome Helmet + Glowing Golden Goggle Eyes
  const helm = new THREE.SphereGeometry(0.33, 14, 12);
  helm.scale(1.06, 0.98, 1.05);
  helm.translate(0, 1.66, 0.1);
  parts.push(createColoredPart(helm, 0x3e434d, 1));

  const jawGuard = new THREE.BoxGeometry(0.46, 0.18, 0.32);
  jawGuard.translate(0, 1.54, 0.22);
  parts.push(createColoredPart(jawGuard, 0x2d3138, 1));

  for (const side of [-1, 1]) {
    const eye = new THREE.CylinderGeometry(0.075, 0.075, 0.08, 10);
    eye.rotateX(Math.PI / 2);
    eye.translate(side * 0.12, 1.68, 0.39);
    parts.push(createColoredPart(eye, 0xffe066, 1, 1.0));
  }

  // Massive Copper Pauldrons + Brawny Arms + Giant Silver C-Jaw Monkey Wrench!
  for (const [side, pId] of [
    [-1, 2],
    [1, 3],
  ] as const) {
    const pauldron = new THREE.SphereGeometry(0.26, 10, 10);
    pauldron.translate(side * 0.62, 1.32, 0.04);
    parts.push(createColoredPart(pauldron, 0xd95f38, pId));

    const arm = new THREE.CapsuleGeometry(0.17, 0.44, 6, 10);
    arm.rotateX(0.42);
    arm.translate(side * 0.64, 0.96, 0.16);
    parts.push(createColoredPart(arm, 0xc44f2b, pId));
  }

  const wrenchShaft = new THREE.BoxGeometry(0.12, 0.14, 1.05);
  wrenchShaft.rotateX(-0.35);
  wrenchShaft.translate(0.64, 0.96, 0.56);
  parts.push(createColoredPart(wrenchShaft, 0xb8c4d4, 3, 0.2));

  const wrenchJaw = new THREE.TorusGeometry(0.24, 0.085, 8, 14, Math.PI * 1.45);
  wrenchJaw.rotateY(Math.PI / 2);
  wrenchJaw.translate(0.64, 1.18, 1.05);
  parts.push(createColoredPart(wrenchJaw, 0xdbe4f0, 3, 0.35));

  return mergeHumanoidParts(parts);
}

/**
 * 5. Wind-Up Pressure-Boiler Bomb Bot (`buildBanelingGeometry`)
 */
export function buildBanelingGeometry(): THREE.BufferGeometry {
  const parts: PartSpec[] = [];

  for (const [side, partId] of [
    [-1, 4],
    [1, 5],
  ] as const) {
    const leg = new THREE.CapsuleGeometry(0.072, 0.16, 4, 8);
    leg.translate(side * 0.13, 0.2, 0);
    parts.push(createColoredPart(leg, 0x353942, partId));
  }

  // Round Copper Pressure-Boiler Body + Glowing Overload Furnace Grate + Golden Wind-Up Key!
  const boiler = new THREE.SphereGeometry(0.29, 12, 12);
  boiler.scale(1.08, 1.02, 1.08);
  boiler.translate(0, 0.52, 0);
  parts.push(createColoredPart(boiler, 0xe56b38, 0, 0.25));

  const brassBand = new THREE.TorusGeometry(0.295, 0.032, 7, 16);
  brassBand.rotateX(Math.PI / 2);
  brassBand.translate(0, 0.52, 0);
  parts.push(createColoredPart(brassBand, 0xd89e32, 0, 0.4));

  const furnaceGlow = new THREE.CylinderGeometry(0.14, 0.14, 0.1, 12);
  furnaceGlow.rotateX(Math.PI / 2);
  furnaceGlow.translate(0, 0.54, 0.26);
  parts.push(createColoredPart(furnaceGlow, 0xffe066, 1, 1.0));

  const whistle = new THREE.CylinderGeometry(0.06, 0.08, 0.18, 10);
  whistle.translate(0, 0.86, 0);
  parts.push(createColoredPart(whistle, 0xf7c331, 1, 0.6));

  // Wind-up clockwork key on back (partId 6 so it wobbles frantically!)
  const keyStem = new THREE.CylinderGeometry(0.025, 0.025, 0.18, 6);
  keyStem.rotateX(Math.PI / 2);
  keyStem.translate(0, 0.58, -0.34);
  parts.push(createColoredPart(keyStem, 0xf7c331, 6, 0.5));

  for (const side of [-1, 1]) {
    const keyLoop = new THREE.TorusGeometry(0.085, 0.024, 6, 12);
    keyLoop.translate(side * 0.09, 0.58, -0.42);
    parts.push(createColoredPart(keyLoop, 0xf7c331, 6, 0.6));
  }

  return mergeHumanoidParts(parts);
}

/**
 * 6. Steampunk Megaphone Broadcast Supervisor (`buildShamanGeometry`)
 */
export function buildShamanGeometry(): THREE.BufferGeometry {
  const parts: PartSpec[] = [];

  for (const [side, partId] of [
    [-1, 4],
    [1, 5],
  ] as const) {
    const leg = new THREE.CapsuleGeometry(0.08, 0.24, 4, 8);
    leg.translate(side * 0.12, 0.28, 0);
    parts.push(createColoredPart(leg, 0x352938, partId));
  }

  // Burgundy Coat + Brass Shoulder Epaulets
  const coat = new THREE.ConeGeometry(0.33, 0.68, 12);
  coat.translate(0, 0.62, 0);
  parts.push(createColoredPart(coat, 0x992f3b, 0));

  const epaulets = new THREE.BoxGeometry(0.58, 0.12, 0.26);
  epaulets.translate(0, 0.9, 0);
  parts.push(createColoredPart(epaulets, 0xd89e32, 0, 0.4));

  // Head + Steampunk Top Hat + Golden Goggles
  const head = new THREE.SphereGeometry(0.2, 10, 10);
  head.translate(0, 1.08, 0.03);
  parts.push(createColoredPart(head, 0x2f333d, 1));

  const goggles = new THREE.BoxGeometry(0.25, 0.08, 0.14);
  goggles.translate(0, 1.1, 0.18);
  parts.push(createColoredPart(goggles, 0xffe066, 1, 1.0));

  const hatBrim = new THREE.CylinderGeometry(0.28, 0.28, 0.04, 14);
  hatBrim.translate(0, 1.24, 0.02);
  parts.push(createColoredPart(hatBrim, 0x2b2e36, 1));

  const hatCrown = new THREE.CylinderGeometry(0.19, 0.17, 0.3, 14);
  hatCrown.translate(0, 1.4, 0.02);
  parts.push(createColoredPart(hatCrown, 0x383c46, 1));

  const hatBand = new THREE.CylinderGeometry(0.182, 0.178, 0.07, 14);
  hatBand.translate(0, 1.3, 0.02);
  parts.push(createColoredPart(hatBand, 0xd89e32, 1, 0.5));

  // Left Arm + Right Arm Waving Tall Brass Megaphone Staff
  const lArm = new THREE.CapsuleGeometry(0.065, 0.24, 4, 8);
  lArm.rotateX(0.45);
  lArm.translate(-0.28, 0.76, 0.1);
  parts.push(createColoredPart(lArm, 0x992f3b, 2));

  const rArm = new THREE.CapsuleGeometry(0.065, 0.24, 4, 8);
  rArm.rotateX(0.5);
  rArm.translate(0.28, 0.76, 0.12);
  parts.push(createColoredPart(rArm, 0x992f3b, 3));

  const staff = new THREE.CylinderGeometry(0.035, 0.04, 1.24, 8);
  staff.rotateX(0.22);
  staff.translate(0.3, 0.84, 0.26);
  parts.push(createColoredPart(staff, 0xd89e32, 3, 0.35));

  const megaphoneHorn = new THREE.ConeGeometry(0.22, 0.38, 12, 1, true);
  megaphoneHorn.rotateX(-Math.PI / 2 + 0.22);
  megaphoneHorn.translate(0.3, 1.42, 0.48);
  parts.push(createColoredPart(megaphoneHorn, 0xf7c331, 3, 0.85));

  return mergeHumanoidParts(parts);
}
