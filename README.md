# Explode Anything

An interactive, procedural Three.js exhibit of an unbranded mirrorless camera and detachable 50 mm prime lens. Drag to orbit, separate the assembly, inspect individual parts, operate a schematic aperture and shutter, and compare material, technical, and X-ray presentations.

## Run locally

Use a current Node.js release supported by Vite 7 (Node.js 20.19+ or 22.12+).

```sh
npm install
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`.

```sh
npm run build       # TypeScript check and production build
npm run preview     # Serve the production build locally
```

Dependencies are pinned in `package.json` and `package-lock.json`. No backend, account, API key, model download, or runtime AI request is used. The interface requests Google Fonts stylesheets but falls back to system sans-serif fonts if they are unavailable.

## Controls

- Drag to orbit; scroll or pinch to zoom.
- Use **Assembly** for reversible, staged disassembly. **Explode**, **Assemble**, **Play / Pause**, and **Reset** are always in the bottom bar.
- Hover to identify a part; click a mesh or a categorized parts-list entry to select it. **Escape** clears selection.
- **Focus part** temporarily isolates the selected persistent object. **Show full assembly / Show all parts**, another preset, or manual assembly input restores the scene.
- Choose Hero, Front, Rear, Exploded, or Lens detail. **Sensor detail** in the inspector isolates the sensor PCB, sensor, and shutter.
- Adjust **Aperture** from f/1.8 to f/16, release the animated shutter, or toggle schematic light-path rays.
- Switch between **Materials**, **Technical**, and **X-ray**.
- **Play showcase** runs a 20-second scripted sequence in the real scene. It never autostarts and can be cancelled by its close button or visitor input.
- The monitor button enters a clean presentation layout with a visible **Exit** control.
- On narrow screens, **Details** opens a collapsible inspector above the usable assembly slider.

Reduced-motion preferences remove transition durations. Pixel ratio is capped at 2. Graphics and event resources are released on final page exit.

## Architecture

| File | Responsibility |
| --- | --- |
| `src/main.ts` | HTML interface, renderer and orbit controls, interaction wiring, selection/isolation, animation loop, showcase, resize handling, and WebGL fallback. |
| `src/model.ts` | Component registry, procedural camera construction, assembled/exploded transforms, bounds calculation, material modes, shutter, rays, and disposal. |
| `src/geometry.ts` | Rounded/extruded shells, annular rings, curved optical surfaces, dials, screw heads, and deterministic canvas textures. |
| `src/iris.ts` | Nine overlapping schematic aperture blades and f-stop interpolation. |
| `src/framing.ts` | Projection-based camera fitting. Each preset targets component bounds; the exploded preset measures the complete assembly at 100%. Manual slider input refits while preserving the orbit direction. |
| `src/explosion.ts` | Repeatable 20-second showcase score. |
| `src/types.ts` | Shared component, category, view-mode, and pose definitions. |
| `src/styles.css` | Desktop/mobile grid layout, inspector, controls, presentation mode, focus states, and reduced-motion rules. |
| `scripts/browser-check.mjs` | Real Chromium interaction checks and PNG capture. |

Each of the 36 registered components has a stable ID, parent assembly, display name, description, category, local stage/duration, persistent object group, assembled position/quaternion, exploded offset, and target rotation. Explosion evaluates those definitions from the requested percentage instead of accumulating transforms.

The renderer uses Three.js's official `RoomEnvironment` processed through `PMREMGenerator`, supplemented by neutral key/fill/rim lights and a soft ground shadow. Materials distinguish graphite, textured rubber, brushed metal, machined rings, PCB surfaces, coated glass, and sensor reflections. Focus-ring and dial ribs use instanced geometry. No downloaded model, rendered-object image, or video substitutes for the scene.

## Component inventory

| Category | Count | Registered IDs |
| --- | ---: | --- |
| Body | 12 | `frontShell`, `rearShell`, `topPlate`, `bottomPlate`, `grip`, `evf`, `shutterButton`, `modeDial`, `controlDial`, `hotShoe`, `batteryDoor`, `chassis` |
| Lens / Optics | 13 | `lensRearMount`, `lensBarrel`, `focusRing`, `aperture`, `lensFrontRing`, `element1`–`element6`, `spacer1`, `spacer2` |
| Electronics | 6 | `rearLCD`, `battery`, `mainPCB`, `sensorPCB`, `sensor`, `shutter` |
| Hardware | 5 | `lensMount`, `screw1`–`screw4` |

The camera front is +Z, up is +Y, and the lens optical axis is Z. The reflective sensor sits immediately behind the focal-plane shutter, the sensor and main boards fit within the body, and all six optical elements stay coaxial during disassembly.

## Verification

Run with the dev server listening on port 5173:

```sh
npx playwright install chromium
npm run test:browser
```

`BASE_URL` and `SCREENSHOTS` environment variables can override the server URL and capture directory. The script uses Chromium WebGL through ANGLE/SwiftShader and writes `screenshots/results.json` plus the PNG set.

Verified in that headless Chromium pass:

- **45 checks passed**, with no reported page errors or browser-console errors.
- All six presets and their active controls: Hero, Front, Rear, Exploded, Lens detail, and Sensor detail.
- 100% explosion completes every component's stage; restoring assembly produces **zero measured transform error** against the initial snapshot.
- Slider input, midpoint and fractional values, reversal, playback cancellation, Explode, Assemble, and Reset.
- Selection from the parts list and canvas, clear selection, and drag-without-selection.
- Aperture at f/1.8, f/8, and f/16; one-part isolation and restoration of all 36 parts.
- Visible shutter open/close state, three-part sensor isolation, and schematic-ray toggle.
- Material, Technical, and X-ray state and active buttons.
- Showcase start, cancellation, and full 20-second completion back at assembled Hero.
- Presentation enter/exit and a deliberately simulated WebGL initialization failure with a visible error message.
- Full-width 390 × 844 mobile canvas, usable bottom slider, collapsed/expanded inspector, and no horizontal overflow; desktop layout at 1440 × 900 and 1280 × 800.

The generated screenshots were opened and visually reviewed, including assembled, half/full explosion, front/rear, lens/aperture, shutter, display modes, mobile, presentation, and fallback. The production build also passes. Vite reports a non-fatal warning that the main JavaScript chunk exceeds 500 kB, primarily because Three.js is included.

No FPS claim is made: these checks exercise correctness and appearance in software-rendered Chromium, not a representative hardware performance benchmark.

## Known simplifications and limits

- This is an educational concept, not a manufacturer-specific teardown or dimensionally validated CAD assembly.
- The lens uses six illustrative curved glass elements. Transmission, coatings, iris motion, and internal groups are visual approximations, not a validated 50 mm optical prescription.
- Light paths are schematic lines aimed approximately at the sensor plane; they are not refracted or occluded like a physical ray tracer.
- The shutter uses representative moving plates rather than a mechanically exact multi-curtain mechanism. Its dwell is intentionally visible for learning.
- PCB details, chips, contacts, markings, screws, and battery construction are representative rather than engineering-accurate. The rear LCD is a dark display surface, not a simulated camera operating system.
- Technical edges and X-ray transparency are display aids, not CAD topology or volumetric imaging.
- Bounds fitting conservatively includes per-part bounding corners, so some exploded angles intentionally retain extra canvas margin.
- Mobile layout was checked in a Chromium viewport, not on a physical touch device. WebGL is required; the fallback explains the failure rather than providing a separate 2D exhibit.
