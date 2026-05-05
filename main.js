/**
 * ============================================================
 *  LUMIÈRE — LUXURY DIGITAL SHOWROOM
 *  Three.js Cinematic Engine  |  main.js
 * ============================================================
 *
 *  Sections:
 *   1. Config & Constants
 *   2. Scene Bootstrap
 *   3. Environment (floor, walls, fog)
 *   4. Lighting Rig
 *   5. Product Pedestals & Garments
 *   6. Post-Processing
 *   7. Camera System (cinematic orbit + drift)
 *   8. Raycasting & Hover
 *   9. UI Bridge
 *  10. Animation Loop
 *  11. Utility Helpers
 *  12. Init
 * ============================================================
 */

import * as THREE from 'three';
import { EffectComposer }  from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }      from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass }      from 'three/addons/postprocessing/ShaderPass.js';
import { GammaCorrectionShader } from 'three/addons/shaders/GammaCorrectionShader.js';

/* ═══════════════════════════════════════════════════
   1. CONFIG & CONSTANTS
═══════════════════════════════════════════════════ */

const IS_MOBILE = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

const GOLD    = new THREE.Color(0xc9a96e);
const IVORY   = new THREE.Color(0xf5f0e8);
const DARK    = new THREE.Color(0x0a0907);
const WARM_W  = new THREE.Color(0xfff4e0);

const CAMERA_DEFAULT = new THREE.Vector3(0, 2.8, 12);
const CAMERA_TARGET  = new THREE.Vector3(0, 1.5, 0);

const WA_NUMBER = 'XXXXXXXXXXX'; // Replace with actual WhatsApp number

/** Curated collection — 4 pieces */
const COLLECTION = [
  {
    id: 0,
    label: 'No. 01',
    name: 'Nour Al-Layl',
    origin: 'Dubai, UAE  ·  2024',
    description: 'A garment born from the silence between stars. Fluid obsidian crepe falls without apology, carrying the weight of a thousand evenings.',
    material: 'Double-faced silk crepe  ·  Hand-finished  ·  Limited to 12 pieces',
    color: 0x1a1208,
    accentColor: 0xc9a96e,
    pos: new THREE.Vector3(-6, 0, 0),
  },
  {
    id: 1,
    label: 'No. 02',
    name: 'Dhahab',
    origin: 'Dubai, UAE  ·  2024',
    description: 'Where restraint becomes poetry. Deep ivory silk is traced with the ghost of gold embroidery — a whisper, never a shout.',
    material: 'Pure silk charmeuse  ·  24-carat thread detail  ·  Atelier-made',
    color: 0x2a2318,
    accentColor: 0xe8d5a3,
    pos: new THREE.Vector3(-2, 0, 0),
  },
  {
    id: 2,
    label: 'No. 03',
    name: 'Layl',
    origin: 'Dubai, UAE  ·  2024',
    description: 'Night distilled into fabric. Midnight velvet drapes like a secret — each fold a verse in an unwritten poem of the desert dark.',
    material: 'Crushed silk velvet  ·  Bias-cut  ·  Couture construction',
    color: 0x0d0a14,
    accentColor: 0x8b7cb3,
    pos: new THREE.Vector3(2, 0, 0),
  },
  {
    id: 3,
    label: 'No. 04',
    name: 'Farida',
    origin: 'Dubai, UAE  ·  2024',
    description: 'Singular. Unmatched. Named for the jewel that stands alone. Deep tobacco with rose-gold hardware — power worn quietly.',
    material: 'Structured wool crepe  ·  Hand-pleated sleeves  ·  One piece made',
    color: 0x1c1108,
    accentColor: 0xd4956a,
    pos: new THREE.Vector3(6, 0, 0),
  },
];

/* ═══════════════════════════════════════════════════
   2. SCENE BOOTSTRAP
═══════════════════════════════════════════════════ */

let scene, camera, renderer, composer;
let clock, raycaster, mouse;
let hoveredProduct = null;
let selectedProduct = null;
let productMeshes   = [];
let pedestalMeshes  = [];
let spotlights      = [];

function bootstrap() {
  clock     = new THREE.Clock();
  raycaster = new THREE.Raycaster();
  mouse     = new THREE.Vector2(-10, -10);

  /* Renderer */
  renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('canvas'),
    antialias: !IS_MOBILE,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, IS_MOBILE ? 1.5 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = !IS_MOBILE;
  renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace   = THREE.SRGBColorSpace;
  renderer.toneMapping        = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  /* Scene */
  scene = new THREE.Scene();
  scene.background = DARK;
  if (!IS_MOBILE) {
    scene.fog = new THREE.FogExp2(DARK, 0.048);
  }

  /* Camera */
  camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 120);
  camera.position.copy(CAMERA_DEFAULT);
  camera.lookAt(CAMERA_TARGET);

  buildEnvironment();
  buildLighting();
  buildCollection();
  if (!IS_MOBILE) buildPostProcessing();

  bindEvents();
  tick();
}

/* ═══════════════════════════════════════════════════
   3. ENVIRONMENT
═══════════════════════════════════════════════════ */

function buildEnvironment() {

  /* ── Floor: polished dark stone ── */
  const floorGeo  = new THREE.PlaneGeometry(80, 80, 80, 80);
  const floorMat  = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x0e0b08),
    roughness: 0.10,
    metalness: 0.08,
    envMapIntensity: 0.3,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  /* subtle grid lines etched into the floor */
  const gridHelper = new THREE.GridHelper(60, 40, new THREE.Color(0x1a1510), new THREE.Color(0x1a1510));
  gridHelper.position.y = 0.002;
  gridHelper.material.transparent = true;
  gridHelper.material.opacity = 0.35;
  scene.add(gridHelper);

  /* ── Back Wall ── */
  const wallGeo = new THREE.PlaneGeometry(50, 20);
  const wallMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x0c0a07),
    roughness: 0.85,
    metalness: 0.0,
  });
  const backWall = new THREE.Mesh(wallGeo, wallMat);
  backWall.position.set(0, 5, -12);
  backWall.receiveShadow = true;
  scene.add(backWall);

  /* Side walls (left & right) */
  [-20, 20].forEach((x, i) => {
    const sw  = new THREE.Mesh(new THREE.PlaneGeometry(30, 20), wallMat.clone());
    sw.position.set(x, 5, -2);
    sw.rotation.y = i === 0 ? Math.PI / 2 : -Math.PI / 2;
    sw.receiveShadow = true;
    scene.add(sw);
  });

  /* Ceiling — very dark, far up */
  const ceilGeo = new THREE.PlaneGeometry(50, 30);
  const ceilMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0x060504), roughness: 1 });
  const ceil = new THREE.Mesh(ceilGeo, ceilMat);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(0, 12, 0);
  scene.add(ceil);

  /* ── Gold accent strip on back wall ── */
  const stripGeo = new THREE.PlaneGeometry(48, 0.015);
  const stripMat = new THREE.MeshStandardMaterial({
    color: GOLD,
    roughness: 0.1,
    metalness: 0.9,
    emissive: GOLD,
    emissiveIntensity: 0.2,
  });
  const strip = new THREE.Mesh(stripGeo, stripMat);
  strip.position.set(0, 9.95, -11.98);
  scene.add(strip);

  /* Matching floor strip */
  const fStrip = new THREE.Mesh(new THREE.PlaneGeometry(48, 0.012), stripMat.clone());
  fStrip.rotation.x = -Math.PI / 2;
  fStrip.position.set(0, 0.003, -11.5);
  scene.add(fStrip);
}

/* ═══════════════════════════════════════════════════
   4. LIGHTING RIG
═══════════════════════════════════════════════════ */

function buildLighting() {

  /* Very low ambient — barely there */
  const ambient = new THREE.AmbientLight(0x1a1208, 0.18);
  scene.add(ambient);

  /* Hemisphere — warm ceiling, cold ground */
  const hemi = new THREE.HemisphereLight(0x3d2a10, 0x0a0907, 0.25);
  scene.add(hemi);

  /* Per-product spotlights */
  COLLECTION.forEach((piece, i) => {
    const spot = new THREE.SpotLight(WARM_W, IS_MOBILE ? 50 : 85, 28, Math.PI / 8, 0.55, 1.8);
    spot.position.set(piece.pos.x, 11, piece.pos.z + 1.5);
    spot.target.position.copy(piece.pos).setY(1.8);
    spot.castShadow = !IS_MOBILE;
    if (!IS_MOBILE) {
      spot.shadow.mapSize.set(1024, 1024);
      spot.shadow.bias = -0.001;
      spot.shadow.camera.near = 1;
      spot.shadow.camera.far  = 30;
    }
    scene.add(spot);
    scene.add(spot.target);
    spotlights.push(spot);

    /* Accent fill — coloured by piece */
    const fill = new THREE.PointLight(piece.accentColor, IS_MOBILE ? 4 : 8, 6, 2);
    fill.position.set(piece.pos.x, 0.1, piece.pos.z - 0.5);
    scene.add(fill);
  });

  /* Dramatic back-rim light along wall */
  const rimBar = new THREE.RectAreaLight(0xfff0d0, 2.5, 40, 0.5);
  rimBar.position.set(0, 5, -11.5);
  rimBar.lookAt(0, 5, 0);
  scene.add(rimBar);

  /* Soft key from camera direction */
  const keyLight = new THREE.DirectionalLight(0xffeedd, 0.4);
  keyLight.position.set(0, 8, 14);
  keyLight.castShadow = false;
  scene.add(keyLight);
}

/* ═══════════════════════════════════════════════════
   5. PRODUCT PEDESTALS & GARMENTS
═══════════════════════════════════════════════════ */

function buildCollection() {
  COLLECTION.forEach((piece) => {
    const group = new THREE.Group();
    group.position.copy(piece.pos);
    group.userData = { ...piece, isProduct: true, baseY: 0 };

    /* Pedestal */
    const pedGeo = new THREE.CylinderGeometry(0.45, 0.55, 0.12, 64);
    const pedMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x1c1610),
      roughness: 0.35,
      metalness: 0.55,
    });
    const ped = new THREE.Mesh(pedGeo, pedMat);
    ped.position.y = 0.06;
    ped.receiveShadow = true;
    ped.castShadow    = true;
    group.add(ped);
    pedestalMeshes.push(ped);

    /* Pedestal base ring */
    const ringGeo = new THREE.TorusGeometry(0.52, 0.012, 16, 80);
    const ringMat = new THREE.MeshStandardMaterial({
      color: GOLD,
      roughness: 0.12,
      metalness: 0.92,
      emissive: GOLD,
      emissiveIntensity: 0.05,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.001;
    group.add(ring);

    /* Abstract garment form — elegant draped shape */
    const garmentGroup = buildGarmentForm(piece);
    garmentGroup.position.y = 0.12;
    group.add(garmentGroup);

    /* Halo glow plane (billboarded later) */
    const haloGeo = new THREE.PlaneGeometry(1.6, 3.2);
    const haloMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(piece.accentColor),
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.position.y = 1.6;
    halo.rotation.y = Math.PI / 6;
    group.add(halo);
    group.userData.halo = halo;

    scene.add(group);
    productMeshes.push(group);
  });
}

/**
 * Build an elegant abstract abaya silhouette using tapered geometry.
 * Pure geometry — no textures needed for this atmosphere.
 */
function buildGarmentForm(piece) {
  const group = new THREE.Group();

  /* Main body — tall tapered prism, abaya silhouette */
  const bodyGeo = buildAbaySilhouette();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(piece.color),
    roughness: 0.72,
    metalness: 0.04,
    side: THREE.DoubleSide,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.castShadow    = true;
  body.receiveShadow = true;
  group.add(body);

  /* Collar / neckline detail */
  const collarGeo = new THREE.TorusGeometry(0.16, 0.018, 12, 40, Math.PI);
  const collarMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(piece.accentColor),
    roughness: 0.2,
    metalness: 0.8,
    emissive: new THREE.Color(piece.accentColor),
    emissiveIntensity: 0.15,
  });
  const collar = new THREE.Mesh(collarGeo, collarMat);
  collar.position.set(0, 2.88, 0.01);
  collar.rotation.x = -Math.PI / 2;
  group.add(collar);

  /* Sleeve hint — thin planes extending outward */
  [-1, 1].forEach((side) => {
    const sleeveGeo = new THREE.PlaneGeometry(0.6, 0.04, 1, 12);
    // taper sleeve tip
    const pos = sleeveGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const norm = (x / 0.3) * side;
      pos.setY(i, pos.getY(i) - norm * 0.08);
    }
    pos.needsUpdate = true;
    const sleeveMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(piece.color),
      roughness: 0.68,
      metalness: 0.06,
      side: THREE.DoubleSide,
    });
    const sleeve = new THREE.Mesh(sleeveGeo, sleeveMat);
    sleeve.position.set(side * 0.42, 2.0, 0.0);
    sleeve.rotation.z = side * -0.18;
    sleeve.castShadow = true;
    group.add(sleeve);
  });

  /* Gold hem accent line */
  const hemGeo = new THREE.TorusGeometry(0.36, 0.008, 8, 60, Math.PI * 2);
  const hemMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(piece.accentColor),
    roughness: 0.15,
    metalness: 0.95,
    emissive: new THREE.Color(piece.accentColor),
    emissiveIntensity: 0.08,
  });
  const hem = new THREE.Mesh(hemGeo, hemMat);
  hem.rotation.x = Math.PI / 2;
  hem.position.y = 0.015;
  group.add(hem);

  return group;
}

/** Custom BufferGeometry for an abaya-like silhouette */
function buildAbaySilhouette() {
  const shape = new THREE.Shape();

  // Shoulder width: 0.34, hem width: 0.38, height: 2.9
  shape.moveTo(0, 0);
  shape.lineTo(-0.38, 0);
  shape.bezierCurveTo(-0.40, 0.6, -0.36, 1.2, -0.34, 1.7);
  shape.bezierCurveTo(-0.48, 1.75, -0.48, 1.85, -0.34, 1.9);
  shape.lineTo(-0.22, 2.6);
  shape.bezierCurveTo(-0.18, 2.82, -0.08, 2.9, 0, 2.9);
  shape.bezierCurveTo(0.08, 2.9, 0.18, 2.82, 0.22, 2.6);
  shape.lineTo(0.34, 1.9);
  shape.bezierCurveTo(0.48, 1.85, 0.48, 1.75, 0.34, 1.7);
  shape.bezierCurveTo(0.36, 1.2, 0.40, 0.6, 0.38, 0);
  shape.lineTo(0, 0);

  const extrudeSettings = {
    depth: 0.08,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.012,
    bevelThickness: 0.01,
    curveSegments: 24,
  };

  return new THREE.ExtrudeGeometry(shape, extrudeSettings);
}

/* ═══════════════════════════════════════════════════
   6. POST-PROCESSING
═══════════════════════════════════════════════════ */

function buildPostProcessing() {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.22,  // strength — very subtle
    0.55,  // radius
    0.88   // threshold
  );
  composer.addPass(bloom);

  const gamma = new ShaderPass(GammaCorrectionShader);
  composer.addPass(gamma);
}

/* ═══════════════════════════════════════════════════
   7. CAMERA SYSTEM — CINEMATIC ORBIT + DRIFT
═══════════════════════════════════════════════════ */

const camState = {
  // Orbit
  theta: 0,      // horizontal angle
  phi:   0.12,   // vertical tilt
  radius: 12,
  targetTheta: 0,
  targetPhi:   0.12,
  targetRadius: 12,

  // Drift (subtle idling)
  driftTime: 0,

  // Focus mode
  focusTarget: null,
  focusPos:    new THREE.Vector3(),
  isFocused:   false,

  // Auto-orbit enable
  autoOrbit:   true,
  autoSpeed:   0.04,

  // Mouse interaction
  isDragging:  false,
  lastMouseX:  0,
  lastMouseY:  0,
  touchStartX: 0,
  touchStartY: 0,
};

function updateCamera(dt) {
  const c = camState;
  c.driftTime += dt;

  if (c.isFocused && c.focusTarget) {
    /* Smooth cinematic zoom toward product */
    camera.position.lerp(c.focusPos, dt * 1.4);
    const lookAt = c.focusTarget.position.clone().add(new THREE.Vector3(0, 1.5, 0));
    const cur = new THREE.Vector3();
    camera.getWorldDirection(cur);
    const desired = lookAt.clone().sub(camera.position).normalize();
    cur.lerp(desired, dt * 1.4);
    camera.lookAt(camera.position.clone().add(cur));
    return;
  }

  /* Auto-orbit drift */
  if (c.autoOrbit && !c.isDragging) {
    c.targetTheta += c.autoSpeed * dt;
  }

  /* Breathing drift on phi */
  const breathe = Math.sin(c.driftTime * 0.18) * 0.018;
  const targetPhi = c.targetPhi + breathe;

  /* Smooth damping — heavy, premium feel */
  const damp = IS_MOBILE ? 2.8 : 2.2;
  c.theta  += (c.targetTheta - c.theta) * dt * damp;
  c.phi    += (targetPhi      - c.phi)  * dt * damp;
  c.radius += (c.targetRadius - c.radius) * dt * damp;

  /* Clamp phi to avoid flipping */
  c.phi = Math.max(-0.08, Math.min(0.42, c.phi));
  c.radius = Math.max(6, Math.min(20, c.radius));

  /* Convert spherical to Cartesian — orbit around center */
  const x = c.radius * Math.sin(c.theta) * Math.cos(c.phi);
  const y = 2.8 + c.radius * Math.sin(c.phi);
  const z = c.radius * Math.cos(c.theta) * Math.cos(c.phi);

  camera.position.set(x, y, z);

  /* Subtle lateral drift on lookAt */
  const driftX = Math.sin(c.driftTime * 0.12) * 0.08;
  camera.lookAt(driftX, 1.5, 0);
}

/* ═══════════════════════════════════════════════════
   8. RAYCASTING & HOVER
═══════════════════════════════════════════════════ */

function checkRaycast() {
  raycaster.setFromCamera(mouse, camera);

  /* Collect all meshes inside product groups */
  const allMeshes = [];
  productMeshes.forEach(g => g.traverse(ch => { if (ch.isMesh) allMeshes.push(ch); }));

  const hits = raycaster.intersectObjects(allMeshes);

  let newHover = null;
  if (hits.length > 0) {
    let obj = hits[0].object;
    // walk up to the product group
    while (obj.parent && !obj.userData.isProduct) obj = obj.parent;
    if (obj.userData.isProduct) newHover = obj;
  }

  if (newHover !== hoveredProduct) {
    /* Un-hover previous */
    if (hoveredProduct) {
      animateHoverOut(hoveredProduct);
      document.body.classList.remove('hovering');
    }
    hoveredProduct = newHover;
    if (hoveredProduct) {
      animateHoverIn(hoveredProduct);
      document.body.classList.add('hovering');
    }
  }
}

function animateHoverIn(group) {
  if (!group.userData.halo) return;
  group.userData.halo.material.opacity = 0.045;
  // intensify its spotlight slightly
  const spot = spotlights[group.userData.id];
  if (spot) spot.intensity = IS_MOBILE ? 70 : 115;
}

function animateHoverOut(group) {
  if (!group.userData.halo) return;
  group.userData.halo.material.opacity = 0.0;
  const spot = spotlights[group.userData.id];
  if (spot) spot.intensity = IS_MOBILE ? 50 : 85;
}

/* ═══════════════════════════════════════════════════
   9. UI BRIDGE
═══════════════════════════════════════════════════ */

function openProductPanel(piece) {
  const panel = document.getElementById('product-panel');
  const c = camState;

  /* Populate */
  document.getElementById('panel-number').textContent      = piece.label;
  document.getElementById('panel-name').textContent        = piece.name;
  document.getElementById('panel-origin').textContent      = piece.origin;
  document.getElementById('panel-description').textContent = piece.description;
  document.getElementById('panel-material').textContent    = piece.material;

  /* WhatsApp link */
  const encoded = encodeURIComponent(`I am interested in this piece: ${piece.name}`);
  document.getElementById('request-btn').href = `https://wa.me/${WA_NUMBER}?text=${encoded}`;

  /* Show panel */
  panel.classList.add('visible');

  /* Ambient dot */
  document.querySelectorAll('.ambient-dot').forEach((d, i) => {
    d.classList.toggle('active', i === piece.id);
  });

  /* Cinematic zoom */
  const target = productMeshes[piece.id];
  if (target) {
    const zoomPos = target.position.clone().add(new THREE.Vector3(2.5, 2.0, 5.5));
    c.focusPos.copy(zoomPos);
    c.focusTarget = target;
    c.isFocused   = true;
    c.autoOrbit   = false;
  }

  selectedProduct = piece;
}

function closeProductPanel() {
  const panel = document.getElementById('product-panel');
  panel.classList.remove('visible');

  const c = camState;
  c.isFocused = false;
  c.focusTarget = null;
  c.autoOrbit = true;

  /* Return to default orbit smoothly */
  c.targetRadius = 12;
  c.targetPhi    = 0.12;

  document.querySelectorAll('.ambient-dot').forEach(d => d.classList.remove('active'));
  selectedProduct = null;
}

/* ═══════════════════════════════════════════════════
   10. ANIMATION LOOP
═══════════════════════════════════════════════════ */

function tick() {
  requestAnimationFrame(tick);

  const dt = Math.min(clock.getDelta(), 0.05); // cap at 50ms
  const t  = clock.getElapsedTime();

  /* Animate product breathing */
  productMeshes.forEach((group, i) => {
    const phase    = i * (Math.PI * 2 / COLLECTION.length);
    const bobSpeed = 0.55;
    const bobAmt   = 0.022;
    group.position.y = Math.sin(t * bobSpeed + phase) * bobAmt;

    /* Very subtle rotation sway */
    group.rotation.y = Math.sin(t * 0.28 + phase) * 0.04;

    /* Halo billboard — face camera */
    if (group.userData.halo) {
      group.userData.halo.lookAt(camera.position);
    }
  });

  /* Animate spot flicker (imperceptible — just alive) */
  spotlights.forEach((sp, i) => {
    const flicker = 1 + Math.sin(t * 3.7 + i * 1.3) * 0.008;
    sp.intensity *= flicker;
    sp.intensity  = sp.intensity; // trigger update
  });

  /* Camera */
  updateCamera(dt);

  /* Raycasting every other frame for performance */
  if (Math.round(t * 60) % 2 === 0) checkRaycast();

  /* Render */
  if (composer && !IS_MOBILE) {
    composer.render();
  } else {
    renderer.render(scene, camera);
  }
}

/* ═══════════════════════════════════════════════════
   11. UTILITY HELPERS & EVENT BINDING
═══════════════════════════════════════════════════ */

function bindEvents() {

  /* Resize */
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (composer) composer.setSize(window.innerWidth, window.innerHeight);
  });

  /* Mouse move — cursor + orbit drag */
  window.addEventListener('mousemove', (e) => {
    mouse.set(
      (e.clientX / window.innerWidth)  * 2 - 1,
      -(e.clientY / window.innerHeight) * 2 + 1
    );

    /* Custom cursor */
    document.getElementById('cursor').style.left      = e.clientX + 'px';
    document.getElementById('cursor').style.top       = e.clientY + 'px';
    document.getElementById('cursor-ring').style.left = e.clientX + 'px';
    document.getElementById('cursor-ring').style.top  = e.clientY + 'px';

    /* Orbit drag */
    if (camState.isDragging && !camState.isFocused) {
      const dx = e.clientX - camState.lastMouseX;
      const dy = e.clientY - camState.lastMouseY;
      camState.targetTheta -= dx * 0.008;
      camState.targetPhi   -= dy * 0.005;
      camState.lastMouseX   = e.clientX;
      camState.lastMouseY   = e.clientY;
      camState.autoOrbit    = false;
    }
  });

  window.addEventListener('mousedown', (e) => {
    camState.isDragging = true;
    camState.lastMouseX = e.clientX;
    camState.lastMouseY = e.clientY;
  });

  window.addEventListener('mouseup', () => {
    camState.isDragging = false;
    setTimeout(() => { if (!selectedProduct) camState.autoOrbit = true; }, 3000);
  });

  /* Click — product select */
  window.addEventListener('click', () => {
    if (hoveredProduct) {
      openProductPanel(hoveredProduct.userData);
    }
  });

  /* Wheel — zoom */
  window.addEventListener('wheel', (e) => {
    if (!camState.isFocused) {
      camState.targetRadius += e.deltaY * 0.012;
    }
  }, { passive: true });

  /* Touch */
  window.addEventListener('touchstart', (e) => {
    camState.isDragging  = true;
    camState.autoOrbit   = false;
    camState.touchStartX = e.touches[0].clientX;
    camState.touchStartY = e.touches[0].clientY;
    camState.lastMouseX  = e.touches[0].clientX;
    camState.lastMouseY  = e.touches[0].clientY;

    mouse.set(
      (e.touches[0].clientX / window.innerWidth)  * 2 - 1,
      -(e.touches[0].clientY / window.innerHeight) * 2 + 1
    );
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    const tx = e.touches[0].clientX;
    const ty = e.touches[0].clientY;
    mouse.set(
      (tx / window.innerWidth)  * 2 - 1,
      -(ty / window.innerHeight) * 2 + 1
    );
    if (camState.isDragging && !camState.isFocused) {
      const dx = tx - camState.lastMouseX;
      const dy = ty - camState.lastMouseY;
      camState.targetTheta -= dx * 0.006;
      camState.targetPhi   -= dy * 0.004;
      camState.lastMouseX   = tx;
      camState.lastMouseY   = ty;
    }
  }, { passive: true });

  window.addEventListener('touchend', (e) => {
    camState.isDragging = false;
    /* Tap detection */
    const dx = Math.abs(e.changedTouches[0].clientX - camState.touchStartX);
    const dy = Math.abs(e.changedTouches[0].clientY - camState.touchStartY);
    if (dx < 10 && dy < 10 && hoveredProduct) {
      openProductPanel(hoveredProduct.userData);
    }
    setTimeout(() => { if (!selectedProduct) camState.autoOrbit = true; }, 3000);
  });

  /* Panel close */
  document.getElementById('panel-close').addEventListener('click', (e) => {
    e.stopPropagation();
    closeProductPanel();
  });

  /* Ambient dots */
  document.querySelectorAll('.ambient-dot').forEach((dot, i) => {
    dot.addEventListener('click', (e) => {
      e.stopPropagation();
      openProductPanel(COLLECTION[i]);
    });
  });

  /* Enter button */
  document.getElementById('enter-btn').addEventListener('click', () => {
    const veil = document.getElementById('intro-veil');
    veil.classList.add('hidden');
    setTimeout(() => veil.remove(), 2000);
  });
}

/* ── Loading simulation ── */
function simulateLoad(onDone) {
  const bar = document.getElementById('loading-bar');
  let pct = 0;
  const iv = setInterval(() => {
    pct += Math.random() * 18 + 6;
    if (pct >= 100) {
      pct = 100;
      clearInterval(iv);
      setTimeout(onDone, 300);
      setTimeout(() => {
        const wrap = document.getElementById('loading-bar-wrap');
        if (wrap) wrap.style.opacity = '0';
      }, 800);
    }
    bar.style.width = pct + '%';
  }, 120);
}

/* ═══════════════════════════════════════════════════
   12. INIT
═══════════════════════════════════════════════════ */

simulateLoad(() => {
  bootstrap();

  /* Piece counter display */
  document.getElementById('piece-counter').querySelector('span').textContent =
    `${COLLECTION.length} pieces · Exclusive`;
});
