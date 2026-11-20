import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PieceSymbol } from 'chess.js';

function normalizeForMerge(rawGeo: THREE.BufferGeometry): THREE.BufferGeometry {
  const geo = rawGeo.index ? rawGeo.toNonIndexed() : rawGeo.clone();
  if (!geo.attributes.normal) {
    geo.computeVertexNormals();
  }
  const posCount = geo.attributes.position.count;
  if (!geo.attributes.uv) {
    const uvs = new Float32Array(posCount * 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < posCount; i++) {
      uvs[i * 2] = pos.getX(i) * 0.5 + 0.5;
      uvs[i * 2 + 1] = pos.getY(i) * 0.5 + 0.5;
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  }
  // Remove tangent or extra attributes so all parts have identical attribute sets
  for (const attr of Object.keys(geo.attributes)) {
    if (attr !== 'position' && attr !== 'normal' && attr !== 'uv') {
      geo.deleteAttribute(attr);
    }
  }
  return geo;
}

function finalizeMergedPiece(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const normalized = parts.map((p) => {
    const n = normalizeForMerge(p);
    p.dispose();
    return n;
  });
  const merged = mergeGeometries(normalized, false);
  normalized.forEach((g) => g.dispose());
  if (!merged) {
    return new THREE.CylinderGeometry(0.18, 0.28, 0.7, 24);
  }
  merged.computeBoundingBox();
  if (merged.boundingBox) {
    const minY = merged.boundingBox.min.y;
    merged.translate(0, -minY, 0);
  }
  merged.computeVertexNormals();
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}

function buildLathe(pts: Array<[number, number]>, segments = 36): THREE.BufferGeometry {
  const vecs = pts.map(([r, y]) => new THREE.Vector2(Math.max(0.0001, r), y));
  // Ensure closed cap at origin top/bottom for watertight mesh
  const first = pts[0];
  const last = pts[pts.length - 1];
  const closed: THREE.Vector2[] = [];
  if (first[0] > 0.001) closed.push(new THREE.Vector2(0.0001, first[1]));
  closed.push(...vecs);
  if (last[0] > 0.001) closed.push(new THREE.Vector2(0.0001, last[1]));
  return new THREE.LatheGeometry(closed, segments);
}

function buildPawnGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  parts.push(
    buildLathe([
      [0.295, 0],
      [0.3, 0.035],
      [0.275, 0.075],
      [0.285, 0.1],
      [0.23, 0.135],
      [0.165, 0.21],
      [0.115, 0.34],
      [0.092, 0.44],
      [0.165, 0.465],
      [0.168, 0.485],
      [0.088, 0.505],
    ])
  );

  const head = new THREE.SphereGeometry(0.145, 28, 22);
  head.translate(0, 0.615, 0);
  parts.push(head);

  return finalizeMergedPiece(parts);
}

function buildRookGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  parts.push(
    buildLathe([
      [0.325, 0],
      [0.33, 0.04],
      [0.3, 0.085],
      [0.312, 0.115],
      [0.25, 0.16],
      [0.2, 0.24],
      [0.17, 0.46],
      [0.16, 0.56],
      [0.228, 0.61],
      [0.236, 0.68],
      [0.155, 0.68],
      [0.155, 0.635],
    ])
  );

  // 6 distinct beveled castle battlements around the turret rim
  const battlementCount = 6;
  const radius = 0.194;
  for (let i = 0; i < battlementCount; i++) {
    const angle = (i / battlementCount) * Math.PI * 2;
    const tooth = new THREE.BoxGeometry(0.115, 0.11, 0.082);
    tooth.rotateY(-angle);
    tooth.translate(Math.cos(angle) * radius, 0.725, Math.sin(angle) * radius);
    parts.push(tooth);
  }

  return finalizeMergedPiece(parts);
}

function buildBishopGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  // Turned body + neck collar
  parts.push(
    buildLathe([
      [0.325, 0],
      [0.33, 0.04],
      [0.305, 0.085],
      [0.315, 0.11],
      [0.24, 0.155],
      [0.185, 0.22],
      [0.132, 0.4],
      [0.105, 0.54],
      [0.185, 0.565],
      [0.188, 0.588],
      [0.11, 0.61],
    ])
  );

  // Sculpted bishop mitre shape with diagonal miter cut notch
  const mitreShape = new THREE.Shape();
  mitreShape.moveTo(0, 0);
  mitreShape.bezierCurveTo(0.16, 0.04, 0.18, 0.17, 0.11, 0.27);
  mitreShape.lineTo(0.035, 0.22); // Upper lip of miter cut
  mitreShape.lineTo(0.085, 0.14); // Inner notch vertex
  mitreShape.lineTo(0.02, 0.285); // Crown tip behind notch
  mitreShape.bezierCurveTo(-0.08, 0.31, -0.17, 0.22, -0.165, 0.11);
  mitreShape.bezierCurveTo(-0.16, 0.03, -0.09, 0.0, 0, 0);

  // Actually a lathe mitre with a prominent angled collar + sculpted finial reads cleanly from 360°!
  // Build full 3D turned mitre + distinct mitered crest ridge & orb finial
  const mitre = buildLathe([
    [0.105, 0.605],
    [0.158, 0.68],
    [0.152, 0.78],
    [0.095, 0.88],
    [0.035, 0.935],
  ]);
  parts.push(mitre);

  // Diagonal miter ring & notched sash accent for authentic silhouette
  const sash = new THREE.TorusGeometry(0.115, 0.022, 12, 24);
  sash.rotateX(Math.PI / 2 - 0.52);
  sash.translate(0.02, 0.77, 0.015);
  parts.push(sash);

  const finial = new THREE.SphereGeometry(0.052, 20, 16);
  finial.translate(0, 0.97, 0);
  parts.push(finial);

  return finalizeMergedPiece(parts);
}

function buildKnightGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  // Weighted Staunton pedestal
  parts.push(
    buildLathe([
      [0.33, 0],
      [0.336, 0.04],
      [0.308, 0.085],
      [0.318, 0.112],
      [0.252, 0.155],
      [0.215, 0.22],
      [0.195, 0.26],
    ])
  );

  // Sculpted 3D horse silhouette facing -Z (so White Knight faces Black out of the box!)
  const horseShape = new THREE.Shape();
  // Coordinates in 2D profile (x = forward toward -Z after rotation, y = height)
  horseShape.moveTo(-0.17, 0.24); // back of neck base
  horseShape.bezierCurveTo(-0.22, 0.44, -0.21, 0.66, -0.1, 0.83); // arched mane curve
  horseShape.lineTo(-0.11, 0.95); // back ear tip
  horseShape.lineTo(-0.03, 0.88); // ear valley
  horseShape.lineTo(0.04, 0.96); // front ear tip
  horseShape.lineTo(0.09, 0.85); // forehead
  horseShape.bezierCurveTo(0.19, 0.79, 0.28, 0.68, 0.31, 0.58); // bridge of nose
  horseShape.bezierCurveTo(0.32, 0.52, 0.25, 0.48, 0.18, 0.5); // muzzle & chin
  horseShape.lineTo(0.07, 0.56); // throat hollow
  horseShape.bezierCurveTo(0.14, 0.46, 0.18, 0.36, 0.17, 0.24); // muscular chest
  horseShape.closePath();

  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: 0.21,
    bevelEnabled: true,
    bevelThickness: 0.042,
    bevelSize: 0.036,
    bevelSegments: 4,
    curveSegments: 16,
  };

  const body = new THREE.ExtrudeGeometry(horseShape, extrudeSettings);
  // Center extrusion along Z, then rotate +90deg around Y so shape +X points along -Z (facing opponent)
  body.translate(0, 0, -0.105);
  body.rotateY(Math.PI / 2);
  parts.push(body);

  // Sculpted mane crest ridge along the back of the neck
  const maneShape = new THREE.Shape();
  maneShape.moveTo(-0.18, 0.27);
  maneShape.bezierCurveTo(-0.25, 0.46, -0.24, 0.67, -0.11, 0.86);
  maneShape.lineTo(-0.07, 0.82);
  maneShape.bezierCurveTo(-0.17, 0.65, -0.18, 0.46, -0.13, 0.27);
  maneShape.closePath();

  const mane = new THREE.ExtrudeGeometry(maneShape, {
    depth: 0.06,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.012,
    bevelSegments: 2,
    curveSegments: 12,
  });
  mane.translate(0, 0, -0.03);
  mane.rotateY(Math.PI / 2);
  parts.push(mane);

  // Cheekbone / jaw relief on both sides for richer 3D profile
  const cheekL = new THREE.SphereGeometry(0.075, 14, 12);
  cheekL.scale(0.65, 1.05, 1.25);
  cheekL.translate(-0.085, 0.69, -0.05);
  parts.push(cheekL);

  const cheekR = new THREE.SphereGeometry(0.075, 14, 12);
  cheekR.scale(0.65, 1.05, 1.25);
  cheekR.translate(0.085, 0.69, -0.05);
  parts.push(cheekR);

  return finalizeMergedPiece(parts);
}

function buildQueenGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  parts.push(
    buildLathe([
      [0.355, 0],
      [0.362, 0.045],
      [0.33, 0.095],
      [0.34, 0.125],
      [0.255, 0.18],
      [0.195, 0.27],
      [0.142, 0.48],
      [0.115, 0.67],
      [0.205, 0.705],
      [0.21, 0.732],
      [0.132, 0.755],
      [0.198, 0.875],
      [0.178, 0.905],
      [0.12, 0.885],
      [0.085, 0.935],
      [0.025, 0.96],
    ])
  );

  // 8 coronet crown points + pearl tips around rim
  const crownPoints = 8;
  const ringR = 0.178;
  for (let i = 0; i < crownPoints; i++) {
    const a = (i / crownPoints) * Math.PI * 2;
    const spike = new THREE.ConeGeometry(0.038, 0.095, 10);
    spike.translate(Math.cos(a) * ringR, 0.925, Math.sin(a) * ringR);
    parts.push(spike);

    const pearl = new THREE.SphereGeometry(0.024, 10, 10);
    pearl.translate(Math.cos(a) * ringR, 0.975, Math.sin(a) * ringR);
    parts.push(pearl);
  }

  // Top finial orb
  const orb = new THREE.SphereGeometry(0.055, 20, 16);
  orb.translate(0, 1.01, 0);
  parts.push(orb);

  return finalizeMergedPiece(parts);
}

function buildKingGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  parts.push(
    buildLathe([
      [0.37, 0],
      [0.378, 0.048],
      [0.345, 0.1],
      [0.355, 0.13],
      [0.265, 0.19],
      [0.205, 0.3],
      [0.15, 0.54],
      [0.125, 0.74],
      [0.22, 0.775],
      [0.225, 0.805],
      [0.142, 0.83],
      [0.21, 0.955],
      [0.175, 0.985],
      [0.095, 1.015],
      [0.045, 1.025],
    ])
  );

  // Detailed beveled Latin Cross on crown
  const crossV = new THREE.BoxGeometry(0.055, 0.21, 0.055);
  crossV.translate(0, 1.12, 0);
  parts.push(crossV);

  const crossH = new THREE.BoxGeometry(0.165, 0.052, 0.052);
  crossH.translate(0, 1.145, 0);
  parts.push(crossH);

  // Subtle rounded cap at cross base
  const collar = new THREE.CylinderGeometry(0.068, 0.088, 0.04, 18);
  collar.translate(0, 1.03, 0);
  parts.push(collar);

  return finalizeMergedPiece(parts);
}

let cachedGeometries: Record<PieceSymbol, THREE.BufferGeometry> | null = null;

export function getPieceGeometries(): Record<PieceSymbol, THREE.BufferGeometry> {
  if (!cachedGeometries) {
    cachedGeometries = {
      p: buildPawnGeometry(),
      r: buildRookGeometry(),
      n: buildKnightGeometry(),
      b: buildBishopGeometry(),
      q: buildQueenGeometry(),
      k: buildKingGeometry(),
    };
  }
  return cachedGeometries;
}
