import {
  ShaderMount,
  ditheringFragmentShader,
  getShaderColorFromString,
  DitheringShapes,
  DitheringTypes,
  ShaderFitOptions,
  defaultPatternSizing,
  type DitheringShape,
} from "@paper-design/shaders";

/**
 * Vanilla mount for the animated dithering shader.
 *
 * The markup ships a CSS dot pattern that stands in for the shader, so the
 * strip still reads correctly before hydration, without WebGL, and with
 * JavaScript off. The pattern is cleared only once a mount succeeds.
 */

type DitherElement = HTMLElement & { paperShaderMount?: ShaderMount };

/** Shapes that stay legible in a 20px strip. */
const SHAPES: DitheringShape[] = ["simplex", "warp", "wave", "ripple"];

const MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const COLOR_QUERY = "(prefers-color-scheme: dark)";

const mounted = new Set<DitherElement>();

function hashString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Custom properties resolve against the element itself, so a strip inside the
 * inverted hero card picks up that card's palette rather than the page's.
 */
function readColor(element: HTMLElement, property: string, fallback: string) {
  const raw = getComputedStyle(element).getPropertyValue(property).trim();
  return getShaderColorFromString(raw || fallback);
}

function colorsFor(element: DitherElement) {
  const { ditherBack = "--bg", ditherFront = "--fg" } = element.dataset;
  return {
    u_colorBack: readColor(element, ditherBack, "#ffffff"),
    u_colorFront: readColor(element, ditherFront, "#0f1115"),
  };
}

function prefersReducedMotion() {
  return window.matchMedia(MOTION_QUERY).matches;
}

function mount(element: DitherElement, index: number) {
  if (mounted.has(element) || element.paperShaderMount) return;

  // Seeded per element so no two strips drift in lockstep, but stable across
  // reloads — a random seed would make every refresh look like a new page.
  const seed = hashString(element.dataset.ditherSeed ?? `dither-${index}`);
  const shape = element.dataset.ditherShape as DitheringShape | undefined;
  const pxSize = Number(element.dataset.ditherPxSize ?? 3);
  const sizing = defaultPatternSizing;

  // A strip is only ~20px tall, so at scale ~1 it samples a nearly uniform
  // slice of the noise field and renders as a solid bar. Zooming out fits
  // several periods across the strip, which guarantees a visible density ramp
  // whatever the seed happens to be.
  const scale = Number(element.dataset.ditherScale ?? 3.1 + (seed % 12) / 10);

  const uniforms = {
    ...colorsFor(element),
    u_shape: DitheringShapes[shape && shape in DitheringShapes ? shape : SHAPES[seed % SHAPES.length]],
    u_type: DitheringTypes["4x4"],
    u_pxSize: pxSize,
    u_fit: ShaderFitOptions[sizing.fit],
    u_scale: scale,
    u_rotation: seed % 360,
    u_originX: sizing.originX,
    u_originY: sizing.originY,
    u_offsetX: ((seed % 200) - 100) / 100,
    u_offsetY: (((seed >> 3) % 200) - 100) / 100,
    u_worldWidth: sizing.worldWidth,
    u_worldHeight: sizing.worldHeight,
  };

  const speed = prefersReducedMotion() ? 0 : 0.22 + (seed % 17) / 100;

  let shader: ShaderMount;
  try {
    shader = new ShaderMount(element, ditheringFragmentShader, uniforms, undefined, speed);
  } catch {
    // No WebGL2, or context creation refused. The CSS pattern stays.
    return;
  }

  element.paperShaderMount = shader;
  mounted.add(element);

  // Swap the fallback pattern for the canvas on the next frame so the strip is
  // never blank between the pattern clearing and the first shader paint.
  requestAnimationFrame(() => {
    element.dataset.ditherReady = "";
  });
}

function refreshColors() {
  for (const element of mounted) {
    element.paperShaderMount?.setUniforms(colorsFor(element));
  }
}

function refreshMotion() {
  const reduced = prefersReducedMotion();
  for (const element of mounted) {
    const seed = hashString(element.dataset.ditherSeed ?? "dither");
    element.paperShaderMount?.setSpeed(reduced ? 0 : 0.22 + (seed % 17) / 100);
  }
}

function disposeAll() {
  for (const element of mounted) {
    element.paperShaderMount?.dispose();
    delete element.paperShaderMount;
    delete element.dataset.ditherReady;
  }
  mounted.clear();
}

export default function setupDither() {
  const mountAll = () => {
    document
      .querySelectorAll<DitherElement>("[data-dither]")
      .forEach((element, index) => mount(element, index));
  };

  mountAll();

  window.matchMedia(COLOR_QUERY).addEventListener("change", refreshColors);
  window.matchMedia(MOTION_QUERY).addEventListener("change", refreshMotion);

  // Astro view transitions replace the document body wholesale; without this the
  // old WebGL contexts leak and browsers cap how many can be live at once.
  document.addEventListener("astro:before-swap", disposeAll);
  document.addEventListener("astro:page-load", mountAll);
}
