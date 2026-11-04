import * as THREE from 'three';
import { box, shell, cylinder, ring, lathe, torus, textPlane, gripTexture, brushedTexture, screw, pcbTexture } from './geometry';
import type { Component } from './types';
import { Iris } from './iris';

export class CameraModel {
  readonly root = new THREE.Group();
  components: Component[] = [];
  iris = new Iris();
  shutters: THREE.Mesh[] = [];
  shutterHousing: THREE.Mesh | null = null;
  glassElements: THREE.Mesh[] = [];
  rayGroup = new THREE.Group();

  private materials: Record<string, THREE.Material> = {};
  private _ep = new THREE.Vector3();
  private _eq = new THREE.Quaternion();



  private _es = new THREE.Vector3(1,1,1);


  constructor() {
    this.buildMaterials();
    this.buildCamera();
    for (const c of this.components) {
      c.group.updateMatrixWorld(true);
      this.setExplosion(c.id, 0, 0, false);
    }
  }

  private mat(key: string, m: THREE.Material) {
    this.materials[key] = m;
    return m;
  }

  private buildMaterials() {
    this.mat('graphite', new THREE.MeshStandardMaterial({ color: '#282526', metalness: 0.45, roughness: 0.72 }));
    this.mat('grip', new THREE.MeshStandardMaterial({ color: '#1d1919', metalness: 0.18, roughness: 0.92, map: gripTexture() }));
    this.mat('brushed', new THREE.MeshStandardMaterial({ color: '#b0aba5', metalness: 0.85, roughness: 0.38, map: brushedTexture() }));
    this.mat('darkMetal', new THREE.MeshStandardMaterial({ color: '#54585b', metalness: 0.90, roughness: 0.30 }));
    this.mat('silver', new THREE.MeshStandardMaterial({ color: '#d5cec6', metalness: 0.92, roughness: 0.22 }));
    this.mat('plastic', new THREE.MeshStandardMaterial({ color: '#1a1c1d', metalness: 0.05, roughness: 0.70 }));
    this.mat('glass', new THREE.MeshPhysicalMaterial({ color: '#ffffff', metalness: 0, roughness: 0.0, transmission: 0.6, thickness: 2.5, clearcoat: 1, clearcoatRoughness: 0, envMapIntensity: 1.2, opacity: 0.85, transparent: true }));
    this.mat('sensorFace', new THREE.MeshStandardMaterial({ color: '#8899bb', metalness: 0.95, roughness: 0.1 }));
    this.mat('pcb', new THREE.MeshStandardMaterial({ color: '#1f4136', metalness: 0.4, roughness: 0.55, map: pcbTexture() }));
    this.mat('shutter', new THREE.MeshStandardMaterial({ color: '#4f4c42', metalness: 0.82, roughness: 0.30, side: THREE.DoubleSide }));
    this.mat('amber', new THREE.MeshStandardMaterial({ color: '#c78a3a', metalness: 0.7, roughness: 0.35 }));
    this.mat('lensBody', new THREE.MeshStandardMaterial({ color: '#252328', metalness: 0.35, roughness: 0.65 }));
    this.mat('gold', new THREE.MeshStandardMaterial({ color: '#c7a86e', metalness: 0.92, roughness: 0.2 }));
    this.mat('blackMatte', new THREE.MeshStandardMaterial({ color: '#131214', metalness: 0.1, roughness: 0.88 }));
    this.mat('lcdOff', new THREE.MeshStandardMaterial({ color: '#0e0e0f', metalness: 0.25, roughness: 0.3 }));
    this.mat('bak', new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.0, roughness: 1, opacity: 0.0, transparent: true, depthWrite: false }));

    this.mat('tech', new THREE.MeshStandardMaterial({ color: '#e6ddd0', metalness: 0.08, roughness: 0.60 }));
    this.mat('techDark', new THREE.MeshStandardMaterial({ color: '#7a706a', metalness: 0.05, roughness: 0.70 }));
    this.mat('techWire', new THREE.MeshBasicMaterial({ color: '#52493d', transparent: true, opacity: 0.7 }));
    this.mat('ray', new THREE.MeshBasicMaterial({ color: '#dca46c', transparent: true, opacity: 0.6 }));

    this.mat('xrayShell', new THREE.MeshPhysicalMaterial({ color: '#282526', metalness: 0.45, roughness: 0.72, transparent: true, opacity: 0.22, depthWrite: true }));
  }

  private addComp(c: Component) {
    this.components.push(c);
    this.root.add(c.group);
    c.group.userData._stage = 0;
  }

  private buildCamera() {
    const M = (k: string) => this.materials[k];

    // -- Front Body Shell --
    {
      const g = shell(4.9, 3.7, 0.48, { x: 0, y: 0.16, r: 1.05 }, M('graphite'));
      g.position.z = 0;
      g.castShadow = true;
      g.receiveShadow = true;
      const c: Component = {
        id: 'frontShell', name: 'Front Body Shell', description: 'The magnesium-alloy front panel that forms the forward face and lens mount surround. Lightweight and rigid, with grip texture on the right-hand face.',
        category: 'Body', parent: '', group: new THREE.Group(), stage: 1, duration: 0.5, selectRoot: g,
      };
      c.group.add(g);
      // Mount flange
      c.group.add(ring(1.35, 1.05, 0.045, M('darkMetal'), [0, 0.16, 0.210]));
      // Grip texture plane
      const gp = box(1.3, 3.1, 0.04, M('grip'), 0.04, [2.05, -0.03, -0.23]);
      c.group.add(gp);
      c.group.userData._ap = [0, 0, 0]; c.group.userData._aq = [0.044, 0, 0, 0.999];
      this.addComp(c);
    }

    // -- Rear Body Shell --
    {
      const g = shell(4.9, 3.7, 0.48, { x: 0, y: -0.08, r: 0.60 }, M('graphite'));
      g.position.z = 0;
      g.castShadow = true;
      const c: Component = {
        id: 'rearShell', name: 'Rear Body Shell', description: 'The rear panel with a large recess to house the tilting LCD screen and thumb grip on the upper right.',
        category: 'Body', parent: '', group: new THREE.Group(), stage: 2, duration: 0.8, selectRoot: g,
      };
      c.group.add(g);
      // Thumb rest
      c.group.add(box(1.1, 1.8, 0.10, M('grip'), 0.04, [2.0, 0.3, -0.24]));
      c.group.userData._ap = [0, 0, -0.26]; c.group.userData._aq = [0.18, 0.15, 0, 0.972];
      this.addComp(c);
    }

    // -- Top Plate --
    {
      const c: Component = {
        id: 'topPlate', name: 'Top Plate', description: 'Die-cast top cover carrying the shutter release, mode dial, and hot shoe. Finished in machined silver.',
        category: 'Body', parent: '', group: new THREE.Group(), stage: 2, duration: 1.0, selectRoot: undefined,
      };
      const top = box(4.95, 0.70, 1.0, M('silver'), 0.04, [0, 2.0, -0.10]);
      c.group.add(top);
      c.group.userData._ap = [0, 0.04, 0]; c.group.userData._aq = [0.35, 0, 0, 0.937];
      this.addComp(c);
    }

    // -- Bottom Plate --
    {
      const c: Component = {
        id: 'bottomPlate', name: 'Bottom Plate', description: 'Base panel with tripod socket and battery compartment lid.',
        category: 'Body', parent: '', group: new THREE.Group(), stage: 2, duration: 0.8, selectRoot: undefined,
      };
      const bot = box(4.95, 0.30, 1.1, M('graphite'), 0.03, [0, -1.95, -0.10]);
      c.group.add(bot);
      // Tripod socket
      c.group.add(ring(0.45, 0.30, 0.02, M('darkMetal'), [0, -2.1, -0.80]));
      c.group.userData._ap = [0, -0.04, 0]; c.group.userData._aq = [0.28, 0, 0, 0.961];
      this.addComp(c);
    }

    // -- Grip --
    {
      const c: Component = {
        id: 'grip', name: 'Textured Grip', description: 'Leather-textured rubber grip for secure one-handed holding.',
        category: 'Body', parent: '', group: new THREE.Group(), stage: 1, duration: 0.4, selectRoot: undefined,
      };
      const gMat = M('grip') as THREE.MeshStandardMaterial;
      const grip = box(1.5, 2.4, 0.12, gMat, 0.06, [2.15, -0.08, 0]);
      c.group.add(grip);
      c.group.userData._ap = [0.45, 0, 0]; c.group.userData._aq = [0, 0, 0, 1];
      this.addComp(c);
    }

    // -- Rear LCD and Frame --
    {
      const c: Component = {
        id: 'rearLCD', name: 'Rear LCD', description: '3-inch 2.36-million-dot LCD with adjustable tilt.',
        category: 'Electronics', parent: '', group: new THREE.Group(), stage: 4, duration: 1.0, selectRoot: undefined,
      };
      // Screen
      c.group.add(box(2.4, 1.8, 0.06, M('lcdOff'), 0.03, [0, -0.08, -0.08]));
      c.group.add(box(2.6, 1.9, 0.05, M('plastic'), 0.04, [0, -0.08, -0.03]));
      // Label
      const label = textPlane('3.0" LCD — 2.36 M-dot', 1.6, 0.3, { color: '#f3ede2', fontSize: 18, align: 'center', background: 'transparent' });
      label.position.set(0, -1.25, 0.85); label.rotation.x = -0.40; c.group.add(label);
      c.group.userData._ap = [0, 0.04, -0.80]; c.group.userData._aq = [0.52, 0, 0, 0.854];
      this.addComp(c);
    }

    // -- EVF Unit --
    {
      const c: Component = {
        id: 'evf', name: 'Viewfinder Housing', description: 'Electronic viewfinder with high-resolution OLED micro-display and comfortable rubber eyecup.',
        category: 'Body', parent: '', group: new THREE.Group(), stage: 5, duration: 1.2, selectRoot: undefined,
      };
      const housing = box(1.5, 1.1, 1.1, M('graphite'), 0.05, [0, 0.6, 0.0]);
      c.group.add(housing);
      // Eyecup
      c.group.add(torus(0.34, 0.065, M('blackMatte'), [0, 0.52, 0.56]));
      c.group.add(cylinder(0.34, 0.28, 0.32, M('blackMatte'), [0, 0.52, 0.38]));
      c.group.userData._ap = [0, 0.25, 0.30]; c.group.userData._aq = [0.14, 0, 0.10, 0.985];
      this.addComp(c);
    }

    // -- Shutter Button --
    {
      const c: Component = {
        id: 'shutterButton', name: 'Shutter Button', description: 'Machined metal release button with a two-step travel.',
        category: 'Body', parent: '', group: new THREE.Group(), stage: 1, duration: 0.8, selectRoot: undefined,
      };
      c.group.add(cylinder(0.13, 0.17, 0.14, M('brushed'), [2.75, 2.125, 0.34]));
      c.group.add(cylinder(0.12, 0.12, 0.09, M('silver'), [2.75, 2.125, 0.48]));
      c.group.userData._ap = [0.15, 0.04, 0]; c.group.userData._aq = [0, 0, 0, 1];
      this.addComp(c);
    }

    // -- Mode Dial --
    {
      const c: Component = {
        id: 'modeDial', name: 'Mode Dial', description: 'Programmable top dial for exposure control and creative modes.',
        category: 'Body', parent: '', group: new THREE.Group(), stage: 1, duration: 0.6, selectRoot: undefined,
      };
      c.group.add(cylinder(0.32, 0.35, 0.22, M('darkMetal'), [-1.8, 2.10, -0.24]));
      c.group.add(cylinder(0.33, 0.33, 0.035, M('brushed'), [-1.8, 2.10, -0.125]));
      c.group.add(box(0.14, 0.04, 0.05, M('amber'), 0.015, [-1.72, 2.24, -0.24]));
      { const p = textPlane('PASM', 0.28, 0.06, { fontSize: 16, color: '#eee' }); c.group.add(p); }
      c.group.userData._ap = [0, 0.18, -0.14]; c.group.userData._aq = [0, 0, 0, 1];
      this.addComp(c);
    }

    // -- Control Dial --
    {
      const c: Component = {
        id: 'controlDial', name: 'Control Dial', description: 'Quick-access rear dial for exposure compensation and aperture.',
        category: 'Body', parent: '', group: new THREE.Group(), stage: 1, duration: 0.5, selectRoot: undefined,
      };
      c.group.add(cylinder(0.31, 0.31, 0.09, M('darkMetal'), [2.1, 0.75, -0.22]));
      c.group.add(cylinder(0.32, 0.32, 0.015, M('brushed'), [2.1, 0.75, -0.17]));
      c.group.userData._ap = [0.18, 0.02, -0.06]; c.group.userData._aq = [0, 0, 0, 1];
      this.addComp(c);
    }

    // -- Hot Shoe --
    {
      const c: Component = {
        id: 'hotShoe', name: 'Hot Shoe', description: 'Multi-interface shoe for external flash and microphone attachments.',
        category: 'Body', parent: '', group: new THREE.Group(), stage: 4, duration: 0.7, selectRoot: undefined,
      };
      c.group.add(box(0.90, 0.07, 0.45, M('silver'), 0.015, [0, 2.39, -0.04]));
      c.group.add(box(0.30, 0.02, 0.15, M('gold'), 0.005, [0, 2.44, 0.0]));
      c.group.userData._ap = [0, 0.18, 0]; c.group.userData._aq = [0, 0, 0, 1];
      this.addComp(c);
    }

    // -- Battery and Battery Door --
    {
      const c: Component = {
        id: 'battery', name: 'Battery & Door', description: 'Lithium-ion cell and the spring-loaded bottom cover.',
        category: 'Body', parent: '', group: new THREE.Group(), stage: 4, duration: 1.2, selectRoot: undefined,
      };
      c.group.add(box(1.0, 0.34, 0.44, M('darkMetal'), 0.03, [0, -1.95, -0.14]));
      c.group.add(box(1.25, 0.065, 0.70, M('graphite'), 0.02, [0, -2.12, -0.10]));
      c.group.add(cylinder(0.10, 0.10, 0.02, M('silver'), [0.6, -2.12, 0.10]));
      c.group.userData._ap = [0.0, -0.55, 0.02]; c.group.userData._aq = [0.70, 0, 0, 0.714];
      this.addComp(c);
    }

    // -- Mounting Screws --
    {
      const positions: [number, number, number][] = [[-1.90, 1.45, 0.0], [1.90, 1.45, 0.0], [-1.90, -1.45, 0.0], [1.90, -1.45, 0.0]];
      for (let i = 0; i < positions.length; i++) {
        const c: Component = {
          id: `screw${i + 1}`, name: `Mounting Screw`, description: 'Stainless steel screw anchoring body shell to internal chassis.',
          category: 'Hardware', parent: '', group: new THREE.Group(), stage: 0.5, duration: 0.3, selectRoot: undefined,
        };
        const dark = M('blackMatte');
        const s = screw(M('silver'), dark, 1);
        s.position.set(...positions[i]);
        c.group.add(s);
        c.group.userData._ap = [0.0, 0.0, 0.25 + i * 0.08];
        c.group.userData._aq = [0, 0, 0, 1];
        this.addComp(c);
      }
    }

    // -- Main Chassis --
    {
      const c: Component = {
        id: 'chassis', name: 'Metal Chassis', description: 'Internal magnesium-alloy frame for mounting sensor, shutter, and electronics.',
        category: 'Body', parent: '', group: new THREE.Group(), stage: 3, duration: 0.9, selectRoot: undefined,
      };
      const frame = box(3.8, 2.4, 0.18, M('darkMetal'), 0.03, [0, -0.20, -0.07]);
      c.group.add(frame);
      // Openings
      for (const pos of [[0, -0.20, -0.07], [0, 0.60, -0.07], [0, -1.0, -0.07]]) {
        const hole = ring(0.7, 0.45, 0.2, M('darkMetal'), pos);
        c.group.add(hole);
      }
      c.group.userData._ap = [0.55, 0, 0];
      c.group.userData._aq = [0, 0, 0, 1];
      this.addComp(c);
    }

    // -- Main PCB --
    {
      const c: Component = {
        id: 'mainPCB', name: 'Main PCB', description: 'Primary circuit board carrying processor, memory, and image-processing silicon.',
        category: 'Electronics', parent: '', group: new THREE.Group(), stage: 4, duration: 1.4, selectRoot: undefined,
      };
      const board = box(3.0, 2.0, 0.05, M('pcb'), 0.02, [0, -0.18, 0.12]);
      c.group.add(board);
      // BGA processor
      c.group.add(box(0.7, 0.7, 0.035, M('graphite'), 0.03, [0, 0, 0.10]));
      // Connectors
      c.group.add(box(1.4, 0.12, 0.035, M('darkMetal'), 0.02, [0, -0.70, 0.10]));
      c.group.add(box(0.5, 0.12, 0.035, M('darkMetal'), 0.02, [0.7, 0.10, 0.10]));
      const label = textPlane('DIGITAL ENGINE — GENERIC IMAGE PROCESSOR', 2.0, 0.16, { fontSize: 18, color: '#d5d0a0' });
      label.position.set(0, 0.50, 0.20); label.rotation.x = -0.18; c.group.add(label);
      c.group.userData._ap = [-0.30, -0.77, 0.70]; c.group.userData._aq = [0, 0.18, 0, 0.984];
      this.addComp(c);
    }

    // -- Sensor PCB --
    {
      const c: Component = {
        id: 'sensorPCB', name: 'Sensor PCB', description: 'Dedicated board carrying the image sensor and analog-to-digital conversion layer.',
        category: 'Electronics', parent: '', group: new THREE.Group(), stage: 4, duration: 1.1, selectRoot: undefined,
      };
      c.group.add(box(1.5, 1.0, 0.04, M('pcb'), 0.02, [0, -0.18, 0.27]));
      c.group.add(box(1.2, 1.0, 0.02, M('darkMetal'), 0.02, [0, -0.18, 0.30]));
      c.group.userData._ap = [-0.12, -0.82, 0.55]; c.group.userData._aq = [0, -0.14, 0, 0.990];
      this.addComp(c);
    }

    // -- Image Sensor --
    {
      const c: Component = {
        id: 'sensor', name: 'Image Sensor', description: 'A 24-megapixel back-illuminated CMOS sensor on adhesive-mounted carrier.',
        category: 'Electronics', parent: '', group: new THREE.Group(), stage: 5, duration: 1.3, selectRoot: undefined,
      };
      // Sensor face
      c.group.add(box(1.16, 0.78, 0.004, M('sensorFace'), 0.0, [0, -0.18, 0.34]));
      // Carrier
      c.group.add(box(1.3, 0.9, 0.05, M('darkMetal'), 0.04, [0, -0.18, 0.30]));
      c.group.userData._ap = [0, -0.95, 2.15]; c.group.userData._aq = [0, 0, 0, 1];
      this.addComp(c);
    }

    // -- Focal Plane Shutter --
    {
      const c: Component = {
        id: 'shutter', name: 'Shutter Assembly', description: 'Electromagnetic focal-plane shutter with carbon-film blades and low-vibration drive.',
        category: 'Electronics', parent: '', group: new THREE.Group(), stage: 5, duration: 1.1, selectRoot: undefined,
      };
      const housing = box(1.25, 0.85, 0.18, M('darkMetal'), 0.02, [0, -0.18, 0.26]);
      c.group.add(housing);
      this.shutterHousing = housing;
      // Shutter blades
      for (let b = 0; b < 5; b++) {
        const blade = box(1.1, 0.16, 0.008, M('shutter'), 0.005, [0, -0.18 + (b - 2) * 0.17, 0.28 + (b % 2) * 0.016]);
        c.group.add(blade); this.shutters.push(blade);
      }
      c.group.userData._ap = [0, -0.60, 1.30]; c.group.userData._aq = [0, 0, 0, 1];
      this.addComp(c);
    }

    // -- Lens Mount with Bass --
    {
      const c: Component = {
        id: 'lensMount', name: 'Lens Mount Ring', description: 'Stainless-steel E/M mount ring with bayonet tabs and electrical contacts.',
        category: 'Body', parent: '', group: new THREE.Group(), stage: 2, duration: 0.9, selectRoot: undefined,
      };
      c.group.add(ring(1.25, 1.04, 0.065, M('silver'), [0, 0.16, 0.260]));
      // Bayonet tabs
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
        c.group.add(box(0.22, 0.14, 0.028, M('darkMetal'), 0.01, [Math.cos(a) * 1.10, 0.16 + Math.sin(a) * 1.10, 0.24]));
      }
      // Contacts
      for (let i = -2; i <= 2; i++) {
        c.group.add(box(0.08, 0.045, 0.015, M('gold'), 0.01, [0.95, 0.16, 0.26 + i * 0.07]));
      }
      c.group.userData._ap = [0.0, 0, 0.25]; c.group.userData._aq = [0, 0, 0, 1];
      this.addComp(c);
    }

    // -- Lens Group Assembly --
    this.buildLens();

    // -- Ray visualization --
    this.buildRayPaths();
  }

  private buildLens() {
    const M = (k: string) => this.materials[k];
    const opticalAxisZ = 2.70;

    // -- Rear Mount Ring --
    {
      const c: Component = {
        id: 'lensRearMount', name: 'Lens Rear Mount', description: 'Metal locking ring with bayonet lugs that couple to the camera bayonet.',
        category: 'Optics', parent: '', group: new THREE.Group(), stage: 1, duration: 0.6, selectRoot: undefined,
      };
      c.group.add(ring(1.1, 0.96, 0.14, M('darkMetal'), [0, 0.16, 0.78]));
      c.group.userData._ap = [0.0, 0, 0.55]; c.group.userData._aq = [0, 0, 0, 1];
      this.addComp(c);
    }

    // -- Lens Outer Barrel / housing --
    {
      const c: Component = {
        id: 'lensBarrel', name: 'Lens Barrel', description: 'Machined aluminum barrel that houses the focusing helicoid and optical groups.',
        category: 'Optics', parent: '', group: new THREE.Group(), stage: 3, duration: 0.8, selectRoot: undefined,
      };
      c.group.add(cylinder(1.12, 1.32, 1.04, M('lensBody'), [0, 0.16, 1.36]));
      c.group.add(ring(1.14, 1.1, 0.04, M('brushed'), [0, 0.16, 0.9]));
      c.group.userData._ap = [0.0, 0, 1.35]; c.group.userData._aq = [0, 0, 0, 1];
      this.addComp(c);
    }

    // -- Focus Ring (ridged) --
    {
      const c: Component = {
        id: 'focusRing', name: 'Focus Ring', description: 'Knurled manual focus ring with hard stops at infinity and minimum focus.',
        category: 'Optics', parent: '', group: new THREE.Group(), stage: 5, duration: 0.7, selectRoot: undefined,
      };
      const profile: [number, number][] = [];
      for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        const y = -0.48 + t * 0.96;
        const r = 1.24 + (i % 2 ? 0.0 : 0.035);
        profile.push([r, y]);
      }
      c.group.add(lathe(profile, M('brushed'), 72));
      c.group.position.set(0, 0.16, 1.85);
      c.group.rotation.x = Math.PI / 2;
      c.group.userData._ap = [0.0, 0, 0.20]; c.group.userData._aq = [0, 0, 0, 1];
      this.addComp(c);
    }

    // -- Aperture Assembly (Iris) --
    {
      const c: Component = {
        id: 'aperture', name: 'Aperture Assembly', description: 'Overlapping iris blades made from beryllium copper, controlling the light path through the optical groups.',
        category: 'Optics', parent: '', group: new THREE.Group(), stage: 5, duration: 1.1, selectRoot: undefined, iris: true,
      };
      c.group.add(this.iris.group);
      c.group.position.set(0, 0.16, opticalAxisZ);
      c.group.userData._ap = [0, 0, 0.22]; c.group.userData._aq = [0, 0, 0, 1];
      this.addComp(c);
    }

    // -- Front Retaining Ring --
    {
      const c: Component = {
        id: 'lensFrontRing', name: 'Front Retaining Ring', description: 'Filter-thread retaining ring that secures the front-most optical element.',
        category: 'Optics', parent: '', group: new THREE.Group(), stage: 3, duration: 0.5, selectRoot: undefined,
      };
      c.group.add(ring(1.27, 1.16, 0.055, M('brushed'), [0, 0.16, opticalAxisZ + 0.44]));
      c.group.add(ring(1.30, 1.24, 0.035, M('lensBody'), [0, 0.16, opticalAxisZ + 0.40]));
      c.group.userData._ap = [0.0, 0, 0.28]; c.group.userData._aq = [0, 0, 0, 1];
      this.addComp(c);
    }

    // -- Optical elements (curved, mounted) --
    const elementPositions: [number, number, number, number][] = [
      // z offset, radius, thickness, curvature
      [0.50, 1.0, 0.10, 2.85],
      [0.86, 0.82, 0.12, 2.25],
      [1.20, 1.0, 0.10, 2.65],
      [1.52, 0.76, 0.10, 2.35],
      [1.82, 0.90, 0.08, 2.35],
      [2.10, 0.68, 0.10, 2.55],
    ];
    for (let i = 0; i < elementPositions.length; i++) {
      const [, lensRadius, thickness, zOff] = elementPositions[i];
      const c: Component = {
        id: `element${i + 1}`, name: `Lens Element ${i + 1}`, description: `Precision-ground optical glass, element ${i + 1} of ${elementPositions.length}. Simplified geometry.`,
        category: 'Optics', parent: '', group: new THREE.Group(), stage: 5, duration: 0.9, selectRoot: undefined,
      };
      const glassMat = (M('glass') as THREE.MeshPhysicalMaterial).clone();
      glassMat.color.setHSL(0.48 + i * 0.025, 0.18, 0.92 + Math.random() * 0.05);
      glassMat.name = `glass-${i}`;
      const shape = new THREE.SphereGeometry(lensRadius, 32, 16, 0, Math.PI * 2, 0, 0.5);
      const lens = new THREE.Mesh(shape, glassMat);
      lens.scale.set(1, 1, thickness / (lensRadius * 0.5));
      lens.position.set(0, 0.16, opticalAxisZ + zOff * 0.5);
      c.group.add(lens);
      this.glassElements.push(lens);
      // Spacer
      if (i < elementPositions.length - 1) {
        const spacer = ring(lensRadius + 0.05, lensRadius - 0.08, 0.04, M('darkMetal'), [0, 0.16, opticalAxisZ + (zOff * 0.5 + 0.10)]);
        c.group.add(spacer);
      }
      c.group.userData._ap = [0, 0, 0.55 + i * 0.14]; c.group.userData._aq = [0, 0, 0, 1];
      this.addComp(c);
    }
  }

  private buildRayPaths() {
    this.rayGroup = new THREE.Group();
    const mat = this.materials['ray'];
    for (let i = 0; i < 7; i++) {
      const geo = new THREE.CylinderGeometry(0.009, 0.009, 3.4, 6);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = Math.PI / 2;
      mesh.position.set(0, 0.16, 1.8);
      mesh.userData._origPos = mesh.position.clone();
      mesh.userData._angle = (i / 7 - 0.5) * 0.26;
      this.rayGroup.add(mesh);
    }
    this.root.add(this.rayGroup);
    this.rayGroup.visible = false;
  }

  updateRays(_dt: number, time: number) {
    if (!this.rayGroup.visible) return;
    const assemblyPct = (this.components[0]?.group.userData._stage as number) ?? 0;
    const sensorZ = -0.10 + (2.15) * assemblyPct;
    for (const mesh of this.rayGroup.children as THREE.Mesh[]) {
      const angle = mesh.userData._angle as number;
      const t = time * 2.3 + (angle * 5);
      const p = (t % 1.0);
      const x = Math.sin(angle) * p * 1.3;
      const y = 0.16 + Math.cos(angle * 1.7) * p * 0.12;
      const sz = 1.8 + (sensorZ - 1.8) * p;
      mesh.position.set(x, y, sz);
      mesh.rotation.x = Math.PI / 2;
      mesh.rotation.z = angle * 0.2 * p;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = (1 - Math.abs(p - 0.5) * 2) * 0.5;
    }
  }

  getAllInteractables(): THREE.Object3D[] {
    return this.components.map(c => c.selectRoot ?? c.group).filter(Boolean);
  }

  setExplosion(id: string, value: number, _time?: number, _animate = true) {
    const comp = this.components.find(c => c.id === id);
    if (!comp) return;
    const group = comp.group;
    // Assembled position will be comp.group.position at stage 0. At stage 1, it'll move by _ap/_aq.
    // We parse the stored userData. At 0, we're assembled. At 100, we're exploded.
    const _t = comp.stage / 100 * value;
    if (!group.userData._origP) {
      group.userData._origP = group.position.clone();
      group.userData._origQ = group.quaternion.clone();
    }
    group.userData._stage = _t;
    // Parse assembly pose from userData
    const ap = group.userData._ap as number[];
    const aq = group.userData._aq as number[];
    // Store original position/quaternion on first call
    const origP = group.userData._origP as THREE.Vector3;
    const origQ = group.userData._origQ as THREE.Quaternion;
    this._ep.set(ap[0], ap[1], ap[2]);
    this._eq.set(aq[0], aq[1], aq[2], aq[3]);
    // Short-circuit if already at right stage
    if (group.userData._current !== undefined && Math.abs((group.userData._current as number) - _t) < 0.0005) return;
    group.userData._current = _t;
    // Assembled = original transform, sits at _t=0. Exploded = offset by _ep at _t=1.
    group.position.copy(origP).add(this._ep.clone().multiplyScalar(_t));
    group.quaternion.copy(origQ).slerp(this._eq, _t);
    group.scale.copy(this._es);
  }

  interpolateExplosion(factor: number) {
    for (const c of this.components) {
      this.setExplosion(c.id, factor, undefined, false);
    }
  }

  snapshotExplosion() {
    return this.components.reduce<Record<string, { p: THREE.Vector3; q: THREE.Quaternion }>>((acc, c) => {
      acc[c.id] = { p: c.group.position.clone(), q: c.group.quaternion.clone() };
      return acc;
    }, {});
  }

  restoreExplosion(from: Record<string, { p: THREE.Vector3; q: THREE.Quaternion }>, toFactor: number, alpha: number) {
    // We set by interpolation. We'll use the factor in setExplosion.
    for (const c of this.components) {
      if (from[c.id]) {
        const currentFactor = THREE.MathUtils.lerp(
          (c.group.userData._stage as number) ?? 0, toFactor, alpha
        );
        this.setExplosion(c.id, currentFactor / Math.max(0.001, c.stage / 100), undefined, false);
      }
    }
  }

  animateShutter(_dt: number) {
    // Expose sensor: move blades apart
    const dwell = 0.3;
    const dur = 0.5;
    const target = 0.35;
    if (!this.root.userData._shutterTime) return;
    const elapsed = (performance.now() - (this.root.userData._shutterTime as number)) / 1000;
    if (elapsed > dur + dwell + dur) return; // done
    for (let i = 0; i < this.shutters.length; i++) {
      const blade = this.shutters[i];
      if (elapsed < dur * 0.5) {
        blade.position.y = this.bladeBaseY(i) + (elapsed / (dur * 0.5)) * target;
      } else if (elapsed < dur * 0.5 + dwell) {
        blade.position.y = this.bladeBaseY(i) + target;
      } else {
        const t = (elapsed - dur * 0.5 - dwell) / (dur * 0.5);
        blade.position.y = this.bladeBaseY(i) + (1 - t) * target;
      }
    }
  }

  releaseShutter() {
    this.root.userData._shutterTime = performance.now();
  }

  private bladeBaseY(i: number) { return -0.18 + (i - 2) * 0.17; }

  triggerApertureChange(targetVal: number) { this.iris.set(targetVal); }
  applyViewMode(mode: 'materials' | 'technical' | 'xray') {
    this.components.forEach(c => {
      c.group.traverse(obj => {
        if (!(obj instanceof THREE.Mesh)) return;
        // x-ray: outer shells transparent
        if (mode === 'xray') {
          if (['frontShell', 'rearShell'].includes(c.id)) {
            obj.material = this.materials['xrayShell'];
          }
          if (c.id === 'lensBarrel') {
            obj.material = this.materials['xrayShell'];
          }
        } else {
          // Restore: this is simplified to avoid full material book-keeping complexity
          // For a full implementation we'd store original materials per mesh
        }
      });
    });
  }
}
