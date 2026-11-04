import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CameraModel } from './model';
import { SHOWCASE_SCORE } from './explosion';
import type { PresetName, ViewMode } from './types';
import './styles.css';

let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let model: CameraModel;
let assembly = 0;
let aperture = 1.8;
let selectedId: string | null = null;
let mode: ViewMode = 'materials';
let playing = false;
let showcase = false;
let playTween: { from: number; to: number; start: number; duration: number } | null = null;
let showcaseStartTime = 0;
let showcaseFrameId = 0;
let poseTween: { fromPos: THREE.Vector3; toPos: THREE.Vector3; fromTarget: THREE.Vector3; toTarget: THREE.Vector3; start: number; duration: number } | null = null;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let isPointerDown = false;
let clickDistanceSq = 0;
let reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let canvasElement: HTMLCanvasElement;

const posPresets: Record<PresetName, { pos: [number,number,number]; target: [number,number,number] }> = {
  hero: { pos: [3.56, 1.77, 5.94], target: [0, 0.16, 0.15] },
  front: { pos: [0, 0.16, 6.0], target: [0, 0.16, 0.15] },
  rear: { pos: [0, 0.16, -5.5], target: [0, 0.16, 0.00] },
  exploded: { pos: [4.32, 2.62, 7.94], target: [0.4, 0.4, 0] },
  lens: { pos: [3.12, 1.55, 6.66], target: [0, 0.16, 2.60] },
  sensor: { pos: [2.5, 1.3, 3.5], target: [0, 0.16, 0.30] },
};

// DOM helpers
function getEl<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? ''));
}

// UI construction
function buildUI() {
  const app = getEl('app');
  app.innerHTML = `
    <div class="app-shell mode-materials" data-assembled="true">
      <div class="view-container" id="viewContainer">
        <canvas id="scene" aria-label="Interactive 3D camera model"></canvas>
        <div class="loading-indicator" id="loading">Loading…</div>
      </div>

      <header class="top-bar">
        <h1 class="wordmark">EXPLODE<span class="accent">ANYTHING</span></h1>
        <div class="header-right" id="headerActions">
          <button class="btn btn-ghost btn-sm" id="presentBtn" aria-label="Enter presentation mode" title="Presentation mode (hides panels)">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M3 1h10a1 1 0 011 1v8a1 1 0 01-1 1H9v1h1a1 1 0 110 2H6a1 1 0 110-2h1v-1H3a1 1 0 01-1-1V2a1 1 0 011-1z"/></svg>
          </button>
          <button class="btn btn-ghost btn-sm" id="showcaseBtn" aria-label="Play 20-second showcase">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M4 2l8 6-8 6V2z"/></svg>
            Showcase
          </button>
          <div class="header-badge" id="assemblyBadge">0%</div>
        </div>
        <div class="presentation-bar" id="presentationBar" style="display:none">
          <span class="presentation-label">Presentation</span>
          <button class="btn btn-ghost btn-sm" id="exitPresent">Exit</button>
        </div>
      </header>

      <aside class="title-block" id="titleBlock">
        <p class="eyebrow">Inside a mirrorless camera</p>
        <h2>Pull it apart.<br><span class="dim">Discover what makes<br>the image.</span></h2>
        <p class="note">Conceptual assembly. Geometry and optical behavior are simplified.</p>
      </aside>

      <aside class="inspector" id="inspector">
        <div class="inspector-section bordered" id="inspectionPanel">
          <div class="panel-heading">
            <span class="dot"></span><span>Inspect</span>
            <span class="inspection-header-actions"><button id="clearSelBtn" aria-label="Clear selection" title="Clear selection (Escape)">✕</button></div>
          </div>
          <div class="inspection-content" id="inspectionContent">
            <div class="inspection-default">Hover a part to see its name.<br>Click to select.</div>
          </div>
        </div>

        <div class="inspector-section">
          <div class="section-label">Mechanisms</div>
          <div class="mech-group">
            <div class="mech-label">APERTURE <span class="sr-only">Simplified visualization</span></div>
            <div class="aperture-display" id="apertureDisplay">f/1.8</div>
            <div class="range-row">
              <span class="range-value">f/1.8</span>
              <input type="range" min="1.8" max="16" step="0.1" value="1.8" id="apertureInput" aria-label="Aperture f-stop" class="range-input">
              <span class="range-value">f/16</span>
            </div>
            <div class="mech-label" style="font-size:10px;opacity:.5">Simplified visualization</div>

            <button class="btn btn-ghost btn-sm" id="shutterBtn" style="margin-top:12px;width:100%;font-size:11px;">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 100 14A7 7 0 008 1z"/><circle cx="8" cy="8" r="2.5" fill="#151719"/></svg>
              Release shutter
            </button>
            <button class="btn btn-ghost btn-sm" id="sensorFocusBtn" style="margin-top:6px;width:100%;font-size:10px;">Sensor detail preset</button>

            <div style="margin-top:12px;">
              <label for="lightRayToggle" style="font-size:10px;display:flex;align-items:center;gap:6px;cursor:pointer;">
                <input type="checkbox" id="lightRayToggle" style="accent-color:var(--accent);">
                <span class="mech-label" style="margin:0;font-size:10px;">Light-path rays <span style="opacity:.5">(schematic)</span></span>
              </label>
            </div>
          </div>
        </div>

        <div class="inspector-section">
          <div class="section-label">Parts</div>
          <div class="parts-list" id="partsList"></div>
        </div>
      </aside>

      <nav class="view-controls" id="viewControls">
        <span class="section-label" style="margin:0 0 4px;align-self:flex-start">View</span>
        <div class="preset-row">
          <button class="btn-preset active" data-preset="hero">Hero</button>
          <button class="btn-preset" data-preset="front">Front</button>
          <button class="btn-preset" data-preset="rear">Rear</button>
          <button class="btn-preset" data-preset="exploded">Exploded</button>
          <button class="btn-preset" data-preset="lens">Lens detail</button>
        </div>
        <div class="mode-row">
          <button class="btn-mode active" data-mode="materials">Materials</button>
          <button class="btn-mode" data-mode="technical">Technical</button>
          <button class="btn-mode" data-mode="xray">X-ray</button>
        </div>
      </nav>

      <footer class="assembly-bar" id="assemblyBar">
        <div class="assembly-readout">
          <span class="section-label" style="margin:0;white-space:nowrap">Assembly</span>
          <span class="assembly-percent" id="assemblyPercent">0<small>%</small></span>
        </div>
        <div class="assembly-slider">
          <div class="assembly-track" id="assemblyTrack">
            <div class="assembly-fill" id="assemblyFill"></div>
          </div>
          <input type="range" min="0" max="100" step="0.5" value="0" id="assemblyInput" aria-label="Assembly slider" aria-valuetext="0 percent assembled">
          <div class="assembly-marks" style="position:relative;height:14px;margin-top:2px">
            <span style="position:absolute;left:0">0</span>
            <span style="position:absolute;left:20%">20</span>
            <span style="position:absolute;left:40%">40</span>
            <span style="position:absolute;left:60%">60</span>
            <span style="position:absolute;left:80%">80</span>
            <span style="position:absolute;right:0">100</span>
          </div>
        </div>
        <div class="transport-btns">
          <button class="transport-btn" id="explodeBtn" aria-label="Fully explode">◈ Explode</button>
          <button class="transport-btn" id="assembleBtn" aria-label="Fully assemble">◆ Assemble</button>
          <button class="transport-btn play-btn" id="playBtn" aria-label="Play / Pause">
            <svg id="playIcon" width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M4 2l8 6-8 6V2z"/></svg>
            <svg id="pauseIcon" width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style="display:none"><path d="M3 2h3v12H3zm7 0h3v12h-3z"/></svg>
          </button>
          <button class="transport-btn" id="resetBtn" aria-label="Reset to assembled">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M13.5 8a5.5 5.5 0 11-1.6-3.9L13 5.1V1h-2v2.1A7 7 0 1015 8h-1.5z"/></svg>
          </button>
        </div>
      </footer>

      <div class="labels-layer" id="labelsLayer" aria-live="polite"></div>
      <div class="showcase-indicator" id="showcaseIndicator" style="display:none">
        <span class="live-dot"></span> Showcase <span id="showcaseTimer">20</span>s <button id="cancelShowcase" aria-label="Cancel showcase">✕</button>
      </div>
    </div>
  `;

  // mobile panel toggle
  const mToggle = document.createElement('button');
  mToggle.className = 'mobile-panel-toggle';
  mToggle.textContent = 'Details ↑';
  mToggle.setAttribute('aria-label', 'Show details panel');
  mToggle.setAttribute('aria-expanded', 'false');
  mToggle.addEventListener('click', () => {
    const inspector = getEl('inspector');
    const expanded = inspector.classList.toggle('expanded');
    mToggle.textContent = expanded ? 'Hide ↓' : 'Details ↑';
    mToggle.setAttribute('aria-expanded', String(expanded));
    mToggle.setAttribute('aria-label', expanded ? 'Hide details panel' : 'Show details panel');
  });
  app.appendChild(mToggle);

  canvasElement = getEl<HTMLCanvasElement>('scene');
  getEl('loading').style.display = 'none';
  document.getElementById('boot-loading')?.remove();
}

function buildPartsList() {
  const list = getEl('partsList');
  const categories: Record<string, string> = { Body: 'Body', Optics: 'Lens / Optics', Electronics: 'Electronics', Hardware: 'Hardware' };
  const order = ['Body', 'Optics', 'Electronics', 'Hardware'] as const;
  order.forEach(cat => {
    const group = document.createElement('details');
    group.className = 'part-category';
    group.innerHTML = `<summary><span class="cat-caret">▼</span><span>${categories[cat]}</span><span class="cat-count">${model.components.filter(c => c.category === cat).length}</span></summary>`;
    const ul = document.createElement('div'); ul.style.padding = '4px 0 6px';
    model.components.filter(c => c.category === cat).forEach(c => {
      const btn = document.createElement('button');
      btn.className = 'part-item'; btn.dataset.id = c.id;
      btn.innerHTML = `${escapeHtml(c.name)}<span class="part-item-dot" style="display:none">●</span>`;
      btn.addEventListener('click', () => selectPart(c.id));
      ul.appendChild(btn);
    });
    group.appendChild(ul);
    list.appendChild(group);
  });
}

function initScene() {
  const container = getEl('viewContainer');
  const rect = container.getBoundingClientRect();
  renderer = new THREE.WebGLRenderer({ antialias: window.devicePixelRatio <= 2, canvas: canvasElement, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(rect.width, rect.height);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  renderer.setClearColor('#151719', 0);

  scene = new THREE.Scene();
  // environment
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color('#2d2e37');
  const pointLight1 = new THREE.Mesh(new THREE.SphereGeometry(3, 16, 16), new THREE.MeshBasicMaterial({ color: '#ffeedd' }));
  pointLight1.position.set(6, 8, 6); envScene.add(pointLight1);
  const pointLight2 = new THREE.Mesh(new THREE.SphereGeometry(2, 16, 16), new THREE.MeshBasicMaterial({ color: '#ddeeff' }));
  pointLight2.position.set(-4, 4, 5); envScene.add(pointLight2);
  const envTarget = pmrem.fromScene(envScene, 0.025, 0.1, 100);
  scene.environment = envTarget.texture;
  scene.environmentIntensity = 0.95;
  scene.add(new THREE.AmbientLight('#dfdde0', 0.55));

  // Key light
  const key = new THREE.SpotLight('#fff5e8', 110, 20, Math.PI * 0.28, 0.6, 1.0);
  key.position.set(6, 8, 5);
  key.target.position.set(0, 0, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 0.1;
  key.shadow.camera.far = 20;
  scene.add(key); scene.add(key.target);

  // Fill light
  const fill = new THREE.DirectionalLight('#dde8ff', 0.8);
  fill.position.set(-4, 5, 4); scene.add(fill);

  // Rim light
  const rim = new THREE.DirectionalLight('#e0f0ff', 0.55);
  rim.position.set(-3, 6, -4); scene.add(rim);

  // Ground shadow
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshStandardMaterial({ color: '#131315', metalness: 0.1, roughness: 0.6 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -2.2;
  ground.receiveShadow = true;
  scene.add(ground);

  model = new CameraModel();
  scene.add(model.root);

  camera = new THREE.PerspectiveCamera(30, rect.width / rect.height, 0.1, 100);
  camera.position.set(3.56, 1.77, 5.94);
  camera.lookAt(0, 0.16, 0.15);

  controls = new OrbitControls(camera, canvasElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.rotateSpeed = 0.55;
  controls.minDistance = 2.5;
  controls.maxDistance = 18;
  controls.maxPolarAngle = Math.PI * 0.55;
  controls.target.set(0, 0.16, 0.15);
  controls.enablePan = true;
  controls.update();

  controls.addEventListener('start', () => {
    // Pause showcase on user input
    if (showcase) cancelShowcase();
    poseTween = null;
  });

  // Lighting across the view
  startRender();
}

function startRender() {
  let t = 0;
  function animate(now: number) {
    requestAnimationFrame(animate);
    t += 0.016;
    if (poseTween) {
      const alpha = Math.min(1, (now - poseTween.start) / poseTween.duration);
      const ease = 1 - Math.pow(1 - alpha, 3);
      camera.position.lerpVectors(poseTween.fromPos, poseTween.toPos, ease);
      controls.target.lerpVectors(poseTween.fromTarget, poseTween.toTarget, ease);
      camera.lookAt(controls.target);
      if (alpha >= 1) { poseTween = null; }
    }
    if (playTween) {
      const alpha = Math.min(1, (now - playTween.start) / playTween.duration);
      const ease = alpha < 0.5 ? 2 * alpha * alpha : 1 - Math.pow(-2 * alpha + 2, 2) / 2;
      assembly = Math.round(playTween.from + (playTween.to - playTween.from) * ease);
      updateAssembly(assembly);
      if (alpha >= 1) { playTween = null; playing = false; updatePlayBtn(); }
    }
    model.iris.update(0.016);
    model.animateShutter(0.016);
    if (model.rayGroup.visible) {
      model.updateRays(0.016, t);
    }
    controls.update();
    renderer.render(scene, camera);
    updateLabelPosition();
  }
  requestAnimationFrame(animate);
}

function updateAssembly(value: number) {
  assembly = value;
  for (const c of model.components) {
    model.setExplosion(c.id, value, undefined, false);
  }
  model.iris.update(0.0);
  // update fill
  const fill = getEl('assemblyFill');
  fill.style.width = `${value}%`;
  const slider = getEl<HTMLInputElement>('assemblyInput');
  slider.value = String(value);
  slider.setAttribute('aria-valuetext', `${value} percent assembled`);
  const badge = getEl('assemblyBadge');
  badge.textContent = `${value}%`;
  const pctDisplay = getEl('assemblyPercent');
  pctDisplay.innerHTML = `${value}<small>%</small>`;
  badge.classList.toggle('animated', value > 0);
  // update shell data-attr to control UI visibility
  const shell = document.querySelector('.app-shell')!;
  shell.setAttribute('data-assembled', value <= 0.5 ? 'true' : 'false');
}

function setExplodeTarget(target: number, durationMs = 800) {
  cancelPlayTween();
  playTween = {
    from: assembly, to: target,
    start: performance.now(), duration: reducedMotion ? 0.1 : durationMs,
  };
  playing = true;
  updatePlayBtn();
}

function cancelPlayTween() {
  playTween = null;
  updatePlayBtn();
}

function updatePlayBtn() {
  const btn = getEl('playBtn');
  const play = getEl('playIcon');
  const pause = getEl('pauseIcon');
  const isShowingPlay = !playTween && !playing;
  play.style.display = isShowingPlay ? 'inline' : 'none';
  pause.style.display = isShowingPlay ? 'none' : 'inline';
  btn.setAttribute('aria-label', isShowingPlay ? 'Play animation' : 'Pause animation');
}

function selectPart(id: string | null) {
  selectedId = id;
  const content = getEl('inspectionContent');
  if (!id) {
    content.innerHTML = '<div class="inspection-default">Hover a part to see its name.<br>Click to select.</div>';
    model.iris.group.visible = true;
  } else {
    const c = model.components.find(c => c.id === id);
    if (!c) { content.innerHTML = ''; return; }
    content.innerHTML = `
      <div class="inspection-name">${escapeHtml(c.name)}</div>
      <div class="inspection-category">${escapeHtml(c.category)}</div>
      <div class="inspection-description">${escapeHtml(c.description)}</div>
    `;
    if (c.iris) {
      // show iris
      model.root.traverse(obj => {
        obj.userData._scaleBefore = obj.visible;
        obj.visible = true;
      });
    }
  }
  // update parts list selection
  document.querySelectorAll('.part-item').forEach(btn => {
    const isSelected = btn.getAttribute('data-id') === id;
    btn.classList.toggle('selected', isSelected);
    (btn.querySelector('.part-item-dot') as HTMLElement).style.display = isSelected ? 'inline' : 'none';
  });
}

// Label positioning
function updateLabelPosition() {
  const container = getEl('labelsLayer');
  if (!selectedId) { container.innerHTML = ''; return; }
  const comp = model.components.find(c => c.id === selectedId);
  if (!comp) { container.innerHTML = ''; return; }
  const target = comp.selectRoot ?? comp.group;
  const worldPos = new THREE.Vector3();
  target.getWorldPosition(worldPos);
  const v = worldPos.clone().project(camera);
  const rect = canvasElement.getBoundingClientRect();
  const parentRect = getEl('viewContainer').getBoundingClientRect();
  const x = (v.x * 0.5 + 0.5) * rect.width + (rect.left - parentRect.left);
  const y = (-v.y * 0.5 + 0.5) * rect.height + (rect.top - parentRect.top);
  if (Math.abs(v.x) > 1 || Math.abs(v.y) > 1 || v.z > 1) {
    container.innerHTML = '';
    return;
  }
  // only show one label
  if (container.children.length === 0) {
    const label = document.createElement('div');
    label.className = 'parts-label'; label.id = 'partLabel';
    label.innerHTML = `<span>${escapeHtml(comp.name)}</span><span class="category">${escapeHtml(comp.category)}</span>`;
    container.appendChild(label);
  }
  const lbl = container.firstElementChild as HTMLElement;
  if (lbl.dataset.partId !== selectedId) {
    lbl.innerHTML = `<span>${escapeHtml(comp.name)}</span><span class="category">${escapeHtml(comp.category)}</span>`;
    lbl.dataset.partId = selectedId;
  }
  lbl.style.left = `${x + 18}px`;
  lbl.style.top = `${y - 30}px`;
}

// Pose transition
function goToPose(preset: PresetName, durationMs = 900) {
  const p = posPresets[preset];
  if (!p) return;
  poseTween = {
    fromPos: camera.position.clone(), toPos: new THREE.Vector3(...p.pos),
    fromTarget: controls.target.clone(), toTarget: new THREE.Vector3(...p.target),
    start: performance.now(), duration: reducedMotion ? 60 : durationMs,
  };
  // Update UI
  document.querySelectorAll('.btn-preset').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-preset') === preset);
  });
}

// Showcase
function startShowcase() {
  cancelShowcase();
  showcase = true; showcaseStartTime = performance.now();
  getEl('showcaseIndicator').style.display = 'flex';
  let priorEventTime = -1;
  const timerEl = getEl('showcaseTimer');
  function update(now: number) {
    if (!showcase) return;
    const elapsed = (now - showcaseStartTime) / 1000;
    timerEl.textContent = String(Math.ceil(Math.max(0, 20 - elapsed)));
    if (elapsed >= 20) {
      cancelShowcase(); selectPart(null); setExplodeTarget(0, 1200); goToPose('hero', 1000);
      return;
    }
    for (const action of SHOWCASE_SCORE) {
      if (action.at > priorEventTime && action.at <= elapsed) {
        switch (action.type) {
          case 'pose': goToPose(action.preset as PresetName, 800); break;
          case 'assembly': setExplodeTarget(action.to, action.duration * 1000); break;
          case 'aperture': model.iris.set(action.value); aperture = action.value; updateApertureDisplay(); break;
          case 'shutter': model.releaseShutter(); break;
          case 'rays': model.rayGroup.visible = action.value; break;
          case 'select': selectPart(action.id); break;
        }
        priorEventTime = action.at;
      }
    }
    showcaseFrameId = requestAnimationFrame(update);
  }
  showcaseFrameId = requestAnimationFrame(update);
}

function cancelShowcase() {
  showcase = false;
  getEl('showcaseIndicator').style.display = 'none';
  cancelAnimationFrame(showcaseFrameId);
}

function updateApertureDisplay() {
  const el = getEl('apertureDisplay');
  const display = aperture < 10 ? aperture.toFixed(1) : aperture.toFixed(0);
  el.textContent = `f/${display}`;
  getEl('apertureInput').setAttribute('aria-valuetext', `f/${display}`);
}

function setMode(m: ViewMode) {
  mode = m;
  model.applyViewMode(m);
  document.querySelectorAll('.btn-mode').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-mode') === m);
  });
  const shell = document.querySelector('.app-shell') as HTMLElement;
  shell.className = `app-shell mode-${m}${showcase ? ' showcase-active' : ''}`;
  shell.setAttribute('data-assembled', assembly <= 0.5 ? 'true' : 'false');
}

// Raycast picker
const clickableObjects: THREE.Object3D[] = [];
function buildClickables() {
  model.getAllInteractables().forEach(obj => {
    obj.traverse(child => {
      if (child instanceof THREE.Mesh) clickableObjects.push(child);
    });
  });
}

function handleClick(event: MouseEvent | TouchEvent) {
  if (showcase) { cancelShowcase(); return; }
  if (playing || playTween) { cancelPlayTween(); }
  const rect = canvasElement.getBoundingClientRect();
  const clientX = 'changedTouches' in event ? event.changedTouches[0].clientX : event.clientX;
  const clientY = 'changedTouches' in event ? event.changedTouches[0].clientY : event.clientY;
  mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(clickableObjects, false);
  if (hits.length > 0) {
    // Walk up to find which component owns this mesh
    function findId(obj: THREE.Object3D): string | null {
      for (const c of model.components) {
        if (c.selectRoot === obj || c.group === obj) return c.id;
      }
      if (obj.parent && obj.parent !== model.root) return findId(obj.parent);
      return null;
    }
    const id = findId(hits[0].object);
    if (id) { selectPart(id); return; }
  }
  selectPart(null);
}

let hoveredId: string | null = null;
let lastHoverTs = 0;

function handlePointerMove(event: PointerEvent) {
  const now = performance.now();
  if (now - lastHoverTs < 50) return;
  lastHoverTs = now;
  if (isPointerDown) return;
  const rect = canvasElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(clickableObjects, false);
  function findId(obj: THREE.Object3D): string | null {
    for (const c of model.components) {
      if (c.selectRoot === obj || c.group === obj) return c.id;
    }
    if (obj.parent && obj.parent !== model.root) return findId(obj.parent);
    return null;
  }
  const id = hits.length > 0 ? findId(hits[0].object) : null;
  if (id !== hoveredId) {
    if (hoveredId) {
      // remove outline (placeholder: reset emissive)
      model.components.forEach(c => {
        c.group.traverse(obj => { if (obj instanceof THREE.Mesh && (obj.material as THREE.MeshStandardMaterial).emissive) (obj.material as THREE.MeshStandardMaterial).emissive.setScalar(0); });
      });
    }
    hoveredId = id;
    if (id) {
      canvasElement.style.cursor = 'pointer';
      // Show subtle highlight
      const comp = model.components.find(c => c.id === id);
      comp?.group.traverse(obj => {
        if (obj instanceof THREE.Mesh) {
          const mat = obj.material as THREE.MeshStandardMaterial;
          if (mat.emissive) mat.emissive.setHex(0x342a18);
        }
      });
      // Also show label
      if (!selectedId) {
        getEl('inspectionContent').innerHTML = `<div class="inspection-name">${escapeHtml(comp?.name ?? id)}</div><div class="inspection-category">${escapeHtml(comp?.category ?? '')}</div><div class="inspection-description">${escapeHtml(comp?.description ?? '')}</div>`;
      }
    } else {
      canvasElement.style.cursor = 'auto';
      if (!selectedId) {
        getEl('inspectionContent').innerHTML = '<div class="inspection-default">Hover a part to see its name.<br>Click to select.</div>';
      }
    }
  }
}

// Wire events
function wireEventListeners() {
  // assembly slider
  const assemblyInput = getEl<HTMLInputElement>('assemblyInput');
  assemblyInput.addEventListener('input', () => {
    if (showcase) cancelShowcase();
    cancelPlayTween();
    updateAssembly(Number(assemblyInput.value));
  });

  // explode / assemble / play / reset
  getEl('explodeBtn').addEventListener('click', () => { setExplodeTarget(100, 1800); });
  getEl('assembleBtn').addEventListener('click', () => { setExplodeTarget(0, 1500); });
  getEl('playBtn').addEventListener('click', () => { playing ? cancelPlayTween() : setExplodeTarget(assembly >= 100 ? 0 : 100, 1600); });
  getEl('resetBtn').addEventListener('click', () => {
    cancelShowcase(); cancelPlayTween();
    updateAssembly(0); selectPart(null); setMode('materials');
    model.iris.set(1.8); aperture = 1.8; updateApertureDisplay();
    model.rayGroup.visible = false;
    goToPose('hero', 700);
  });

  // showcase
  getEl('showcaseBtn').addEventListener('click', startShowcase);
  getEl('showcaseBtn').setAttribute('aria-label', 'Play 20-second showcase');
  getEl('cancelShowcase').addEventListener('click', cancelShowcase);

  // presentation
  getEl('presentBtn').addEventListener('click', () => {
    const shell = document.querySelector('.app-shell')!;
    shell.classList.add('presentation');
    getEl('presentationBar').style.display = 'flex';
    getEl('headerActions').style.display = 'none';
  });
  getEl('exitPresent').addEventListener('click', () => {
    const shell = document.querySelector('.app-shell')!;
    shell.classList.remove('presentation');
    getEl('presentationBar').style.display = 'none';
    getEl('headerActions').style.display = 'flex';
  });

  // view presets
  let readingPresets = document.querySelectorAll<HTMLButtonElement>('.btn-preset');
  readingPresets.forEach(btn => {
    btn.addEventListener('click', () => goToPose(btn.getAttribute('data-preset') as PresetName, 900));
  });

  // view modes
  document.querySelectorAll('.btn-mode').forEach(btn => {
    btn.addEventListener('click', () => setMode(btn.getAttribute('data-mode') as ViewMode));
  });

  // aperture
  const apertureSlider = getEl<HTMLInputElement>('apertureInput');
  apertureSlider.addEventListener('input', () => {
    if (showcase) cancelShowcase();
    aperture = Number(apertureSlider.value);
    updateApertureDisplay();
    model.iris.set(aperture);
  });

  // shutter release
  getEl('shutterBtn').addEventListener('click', () => {
    model.releaseShutter();
  });

  // sensor focus preset
  getEl('sensorFocusBtn').addEventListener('click', () => {
    goToPose('sensor', 700);
    selectPart('sensor');
  });

  // clear selection
  getEl('clearSelBtn').addEventListener('click', () => selectPart(null));

  // light rays
  const rayToggle = getEl<HTMLInputElement>('lightRayToggle');
  rayToggle.addEventListener('change', () => {
    if (showcase) cancelShowcase();
    model.rayGroup.visible = rayToggle.checked;
  });

  // escape = clear selection
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      selectPart(null);
      cancelShowcase();
      const shell = document.querySelector('.app-shell')!;
      if (shell.classList.contains('presentation')) {
        shell.classList.remove('presentation');
        getEl('presentationBar').style.display = 'none';
        getEl('headerActions').style.display = 'flex';
      }
    }
  });

  // canvas click/touch
  let tapPos = { x: 0, y: 0 };
  canvasElement.addEventListener('pointerdown', (e) => { isPointerDown = true; clickDistanceSq = 0; tapPos = { x: e.clientX, y: e.clientY }; });
  canvasElement.addEventListener('pointermove', (e) => {
    if (isPointerDown) { clickDistanceSq = Math.pow(e.clientX - tapPos.x, 2) + Math.pow(e.clientY - tapPos.y, 2); handlePointerMove(e); }
  });
  canvasElement.addEventListener('pointerup', (e) => {
    isPointerDown = false;
    if (clickDistanceSq < 36) handleClick(e);
    clickDistanceSq = 0;
  });
  canvasElement.addEventListener('pointerleave', () => {
    isPointerDown = false;
  });
  canvasElement.addEventListener('touchstart', (e) => {
    tapPos = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    clickDistanceSq = 0;
  }, { passive: true });
  canvasElement.addEventListener('touchend', (e) => {
    if (clickDistanceSq < 36) handleClick(e);
    clickDistanceSq = 0;
  });

  // resize
  const ro = new ResizeObserver(() => {
    const container = getEl('viewContainer');
    const rect = container.getBoundingClientRect();
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
    renderer.setSize(rect.width, rect.height);
  });
  ro.observe(getEl('viewContainer'));

  // reduced motion
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  mq.addEventListener('change', (e) => { reducedMotion = e.matches; });
}

// Expose minimal debug
(window as unknown as Record<string, unknown>).__EA = {
  get state() {
    return {
      assembly, aperture: `f/${aperture.toFixed(1)}`,
      parts: model.components.length,
      selected: selectedId, mode, playing,
      showcase, sensorExposed: false,
      assembledError: model.components.reduce((s, c) => s + Math.abs((c.group.userData._stage as number) ?? 0), 0),
      drawCalls: renderer?.info?.render?.calls ?? 0,
      triangles: renderer?.info?.render?.triangles ?? 0,
      motionReduced: reducedMotion,
    };
  },
  setAssembly(v: number) { cancelPlayTween(); updateAssembly(v); },
  select(id: string | null) { selectPart(id); },
  setMode(m: string) { if (['materials', 'technical', 'xray'].includes(m)) setMode(m as ViewMode); },
  reset() {
    cancelShowcase(); cancelPlayTween();
    updateAssembly(0); selectPart(null);
    model.iris.set(1.8); aperture = 1.8; updateApertureDisplay();
    goToPose('hero', 400);
  },
};

// Bootstrap
buildUI();
// build after model is created so parts list can read components
// we defer buildPartsList after model is queried
try {
  initScene();
  buildClickables();
  buildPartsList();
  wireEventListeners();
} catch (err) {
  getEl('loading').textContent = 'WebGL initialization failed. Please enable hardware acceleration in your browser.';
  console.error(err);
}
