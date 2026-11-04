import * as THREE from 'three';
import { ring } from './geometry';

/** A schematic overlapping iris, evaluated from an assembled aperture setting. */
export class Iris {
  readonly group = new THREE.Group();
  private blades: THREE.Mesh[] = [];
  private current = 1.8;
  private target = 1.8;

  constructor() {
    this.group.add(ring(0.72, 0.58, 0.035, new THREE.MeshStandardMaterial({ color: '#42474b', metalness: 0.9, roughness: 0.3 })));
    const shape = new THREE.Shape();
    shape.moveTo(0.07, 0);
    shape.absarc(0, 0, 0.07, 0, Math.PI / 4, false);
    shape.lineTo(0.8 * Math.cos(Math.PI / 4), 0.8 * Math.sin(Math.PI / 4));
    shape.absarc(0, 0, 0.8, Math.PI / 4, 0, true);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.008, bevelEnabled: false, curveSegments: 10 });
    geo.translate(0, 0, 0.005);
    for (let i = 0; i < 9; i++) {
      const material = new THREE.MeshStandardMaterial({ color: i % 2 ? '#424442' : '#555954', metalness: 0.85, roughness: 0.42, side: THREE.DoubleSide });
      const blade = new THREE.Mesh(geo, material);
      blade.position.z = i * 0.009;
      this.group.add(blade); this.blades.push(blade);
    }
    this.set(1.8);
  }

  set(f: number) { this.current = this.target = f; this.updateGeometry(); }

  update(dt: number) {
    const next = THREE.MathUtils.damp(this.current, this.target, 12, dt);
    if (Math.abs(next - this.current) > 0.001) { this.current = next; this.updateGeometry(); }
  }

  private updateGeometry() {
    const r = 0.105 + (16 - this.current) / 14.2 * 0.445;
    for (let i = 0; i < this.blades.length; i++) {
      const a = i / this.blades.length * Math.PI * 2 + 0.16;
      const pivot = 0.80 + (0.66 - r) * 0.30;
      this.blades[i].position.set(Math.cos(a) * pivot, Math.sin(a) * pivot, i * 0.009);
      this.blades[i].rotation.z = a + Math.acos(THREE.MathUtils.clamp(r / 0.8, 0.02, 0.98)) + 0.10;
    }
  }

  get fNumber() { return this.target; }
  get isAnimating() { return Math.abs(this.current - this.target) > 0.02; }
}
