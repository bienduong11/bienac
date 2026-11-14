import * as THREE from 'three';
import { OrbitControls } from '../libs/OrbitControls.js';

export const GLOBE_RADIUS = 100;
const MARKER_ALTITUDE = 1.8;
// Cửa sổ "vừa xảy ra" trên trục t (thanh trượt): sự kiện trong khoảng này
// so với thời điểm đang chọn sẽ phát sáng vàng và nhấp nháy.
export const HIGHLIGHT_WINDOW = 0.055;

const COLOR_ACTIVE = new THREE.Color(0xffc857);
const COLOR_PAST = new THREE.Color(0x4fc3e8);

function latLonToVector3(lat, lon, radius) {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lon + 180) * Math.PI / 180;
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

// Nội suy cầu giữa hai vector đơn vị — dùng cho camera bay theo cung tròn
// quanh địa cầu thay vì xuyên qua nó.
function slerpVec(a, b, x) {
  const dot = Math.min(Math.max(a.dot(b), -1), 1);
  const theta = Math.acos(dot) * x;
  const rel = b.clone().addScaledVector(a, -dot);
  if (rel.lengthSq() < 1e-9) return a.clone();
  rel.normalize();
  return a.clone().multiplyScalar(Math.cos(theta)).addScaledVector(rel, Math.sin(theta));
}

function createMarkerTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,.9)');
  g.addColorStop(0.5, 'rgba(255,255,255,.32)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createStars() {
  const COUNT = 2200;
  const positions = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(600 + Math.random() * 500);
    positions.set([v.x, v.y, v.z], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xa8c0dd, size: 1.6, sizeAttenuation: false,
    transparent: true, opacity: 0.75, depthWrite: false
  });
  return new THREE.Points(geo, mat);
}

function createAtmosphere() {
  const mat = new THREE.ShaderMaterial({
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      varying vec3 vNormal;
      void main() {
        float intensity = pow(0.66 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.5);
        gl_FragColor = vec4(0.32, 0.58, 1.0, 1.0) * intensity;
      }`,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false
  });
  return new THREE.Mesh(new THREE.SphereGeometry(GLOBE_RADIUS * 1.14, 64, 64), mat);
}

export async function createGlobe(container, events) {
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    45, container.clientWidth / container.clientHeight, 0.1, 3000);
  camera.position.set(0, 60, 320);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const sun = new THREE.DirectionalLight(0xffffff, 1.9);
  sun.position.set(300, 140, 320);
  scene.add(sun);

  scene.add(createStars());
  scene.add(createAtmosphere());

  const loader = new THREE.TextureLoader();
  const [dayMap, nightMap, bumpMap] = await Promise.all([
    loader.loadAsync('assets/earth-day.webp'),
    loader.loadAsync('assets/earth-night.webp'),
    loader.loadAsync('assets/earth-topology.webp')
  ]);
  dayMap.colorSpace = THREE.SRGBColorSpace;
  nightMap.colorSpace = THREE.SRGBColorSpace;
  dayMap.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(GLOBE_RADIUS, 96, 96),
    new THREE.MeshPhongMaterial({
      map: dayMap,
      bumpMap,
      bumpScale: 1.4,
      emissiveMap: nightMap,
      emissive: new THREE.Color(0xffddaa),
      emissiveIntensity: 0.28,
      specular: new THREE.Color(0x1f2a3a),
      shininess: 9
    })
  );
  scene.add(earth);

  // ----- Marker sự kiện -----
  const markerTexture = createMarkerTexture();
  const markers = events.map((ev, i) => {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: markerTexture,
      color: COLOR_PAST.clone(),
      transparent: true,
      depthWrite: false
    }));
    sprite.position.copy(latLonToVector3(ev.lat, ev.lon, GLOBE_RADIUS + MARKER_ALTITUDE));
    sprite.visible = false;
    sprite.userData = { event: ev, state: 'hidden', baseScale: 3, phase: i * 1.7 };
    scene.add(sprite);
    return sprite;
  });

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 150;
  controls.maxDistance = 520;
  controls.enablePan = false;
  controls.rotateSpeed = 0.55;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.35;

  // Người dùng tương tác thì ngừng tự xoay, rảnh 6 giây thì xoay tiếp.
  let idleTimer = null;
  controls.addEventListener('start', () => {
    controls.autoRotate = false;
    clearTimeout(idleTimer);
  });
  controls.addEventListener('end', () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { controls.autoRotate = true; }, 6000);
  });

  // Cập nhật trạng thái marker theo vị trí thanh thời gian (t ∈ [0,1]).
  // Khi có bộ lọc quốc gia, marker ngoài quốc gia đó bị làm mờ.
  let countryFilter = null;
  let lastT = 1;
  function setTime(tSel) {
    lastT = tSel;
    let happened = 0;
    for (const m of markers) {
      const { event: ev } = m.userData;
      if (ev.t > tSel + 0.0001) {
        m.visible = false;
        m.userData.state = 'hidden';
        continue;
      }
      happened++;
      m.visible = true;
      const matches = !countryFilter || ev.country === countryFilter;
      if (tSel - ev.t < HIGHLIGHT_WINDOW) {
        m.userData.state = 'active';
        m.userData.baseScale = 8;
        m.material.color.copy(COLOR_ACTIVE);
        m.material.opacity = matches ? 1 : 0.15;
      } else {
        m.userData.state = 'past';
        m.userData.baseScale = matches && countryFilter ? 4.6 : 3.6;
        m.material.color.copy(COLOR_PAST);
        m.material.opacity = !countryFilter ? 0.62 : matches ? 0.9 : 0.12;
      }
    }
    return happened;
  }

  function setCountry(country) {
    countryFilter = country;
    return setTime(lastT);
  }

  // Camera bay theo cung tròn tới vị trí lat/lon rồi dừng ở cự ly gần.
  const FLY_DISTANCE = 265;
  let fly = null;
  function flyTo(lat, lon) {
    fly = {
      from: camera.position.clone().normalize(),
      to: latLonToVector3(lat, lon, 1).normalize(),
      fromDist: camera.position.length(),
      start: performance.now(),
      dur: 1200
    };
    controls.autoRotate = false;
    clearTimeout(idleTimer);
  }

  // Nhịp đập của các marker đang "active" + tiến trình camera bay —
  // gọi mỗi khung hình.
  function updatePulse(timeS) {
    if (fly) {
      const p = Math.min((timeS * 1000 - fly.start) / fly.dur, 1);
      const e = p < 0.5 ? 2 * p * p : 1 - (2 - 2 * p) ** 2 / 2;
      const dir = slerpVec(fly.from, fly.to, e);
      const dist = fly.fromDist + (FLY_DISTANCE - fly.fromDist) * e;
      camera.position.copy(dir.multiplyScalar(dist));
      camera.lookAt(0, 0, 0);
      if (p >= 1) fly = null;
    }
    for (const m of markers) {
      if (!m.visible) continue;
      let s = m.userData.baseScale;
      if (m.userData.state === 'active') {
        s *= 1 + 0.28 * Math.sin(timeS * 4.2 + m.userData.phase);
      }
      m.scale.setScalar(s);
    }
  }

  // Trả về sự kiện dưới con trỏ (hoặc null).
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  function pick(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(markers.filter(m => m.visible), false);
    return hits.length > 0 ? hits[0].object.userData.event : null;
  }

  function resize() {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }
  window.addEventListener('resize', resize);

  return { scene, camera, renderer, controls, setTime, setCountry, flyTo, updatePulse, pick };
}
