import type { AlpineRuntime } from "./types";

type LogoScope = {
  $el: HTMLElement;
  cleanup?: () => void;
};

const viewBox = {
  x: 412.736,
  y: 308.963,
  width: 675.611,
  height: 501.047,
};

const bayer8 = buildBayerMatrix();
let logoId = 0;

type HoverStyle = {
  cell: number;
  radius: number;
  strength: number;
  phaseMs: number;
  seed: number;
  rowGlitch: number;
  follow: number;
};

const hoverStyles = {
  pink: {
    cell: 17,
    radius: 148,
    strength: 0.58,
    phaseMs: 148,
    seed: 17,
    rowGlitch: 2.8,
    follow: 0.24,
  },
  middle: {
    cell: 13,
    radius: 128,
    strength: 0.68,
    phaseMs: 96,
    seed: 41,
    rowGlitch: 1.8,
    follow: 0.72,
  },
  cyan: {
    cell: 11,
    radius: 140,
    strength: 0.54,
    phaseMs: 72,
    seed: 73,
    rowGlitch: 3.4,
    follow: 0.4,
  },
} satisfies Record<string, HoverStyle>;

export function registerSwipeLogo(Alpine: AlpineRuntime) {
  Alpine.data("swipeLogo", () => ({
    init(this: LogoScope) {
      this.cleanup = mountLogo(this.$el);
    },
    destroy(this: LogoScope) {
      this.cleanup?.();
    },
  }));
}

function mountLogo(element: HTMLElement) {
  const id = logoId++;
  element.innerHTML = template(id);

  const pinkMask = element.querySelector<SVGPathElement>(".sw-mask-pink")!;
  const cyanMask = element.querySelector<SVGPathElement>(".sw-mask-cyan")!;
  const overlapMask = element.querySelector<SVGPathElement>(".sw-mask-over")!;
  const cyanDither = element.querySelector<SVGPathElement>(
    ".sw-cyan-dither",
  )!;

  const full = `M${viewBox.x},${viewBox.y}h${viewBox.width}v${viewBox.height}h-${viewBox.width}z`;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cell = 8;
  const band = 105;
  const tilt = 0.79;
  const line = 7;
  const rag = 90;
  const seed = 11;
  const animationFrames: number[] = [];
  const timers: number[] = [];
  let hoverFrame: number | undefined;
  let hoverPoint: { x: number; y: number } | undefined;
  let layerPoints:
    | Record<keyof typeof hoverStyles, { x: number; y: number }>
    | undefined;
  let hoverRenderedAt = 0;
  let interactiveReady = false;

  const threshold = (column: number, row: number) =>
    ((bayer8[row & 7]?.[column & 7] ?? 0) + 0.5) / 64 * 0.97;

  function middleFrame(progress: number) {
    if (progress >= 1) {
      overlapMask.setAttribute("d", full);
      return;
    }
    const firstColumn = Math.floor(147.7 / cell);
    const lastColumn = Math.ceil(530.9 / cell);
    const rows = Math.ceil(viewBox.height / cell);
    const start = 147.7;
    const end = 530.9 + tilt * viewBox.height;
    const front = start - band + progress * (end - start + 2 * band);
    const solidTo = front - band;
    let path = "";

    if (solidTo > 0) {
      const top = Math.max(0, Math.min(solidTo, viewBox.width));
      const bottom = Math.max(0, Math.min(solidTo - tilt * viewBox.height, viewBox.width));
      path += `M${viewBox.x},${viewBox.y}L${viewBox.x + top},${viewBox.y}L${viewBox.x + bottom},${viewBox.y + viewBox.height}L${viewBox.x},${viewBox.y + viewBox.height}z`;
    }

    for (let column = firstColumn; column <= lastColumn; column++) {
      for (let row = 0; row < rows; row++) {
        const position = column * cell + tilt * (row * cell);
        if (
          position + cell * (1 + tilt) < solidTo ||
          position > front
        ) continue;
        const opacity = (front - position) / band;
        if (opacity > 0 && threshold(column, row) < opacity) {
          path += `M${viewBox.x + column * cell},${viewBox.y + row * cell}h${cell + 0.6}v${cell + 0.6}h-${cell + 0.6}z`;
        }
      }
    }
    overlapMask.setAttribute("d", path);
  }

  function wingsFrame(progress: number) {
    if (progress >= 1) {
      pinkMask.setAttribute("d", full);
      cyanMask.setAttribute("d", full);
      return;
    }
    const rows = Math.ceil(viewBox.height / line);
    const front = progress * (533 + rag);
    let pinkPath = "";
    let cyanPath = "";

    for (let row = 0; row < rows; row++) {
      const offset = hashRandom(1, row, seed) * rag;
      const y = viewBox.y + row * line;
      const height = line + 0.6;
      const reach = Math.max(0, front - offset);
      if (reach <= 0) continue;

      const pinkEnd = Math.max(0, 533 - reach);
      pinkPath += `M${viewBox.x + pinkEnd},${y}h${533 - pinkEnd + 4}v${height}h-${533 - pinkEnd + 4}z`;
      const cyanStart = Math.min(viewBox.width, 142.4 + reach);
      cyanPath += `M${viewBox.x + 138.4},${y}h${cyanStart - 142.4 + 4}v${height}h-${cyanStart - 142.4 + 4}z`;
    }

    pinkMask.setAttribute("d", pinkPath);
    cyanMask.setAttribute("d", cyanPath);
  }

  function animate(
    duration: number,
    easing: (progress: number) => number,
    frame: (progress: number) => void,
    done?: () => void,
  ) {
    const started = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - started) / duration, 1);
      frame(easing(progress));
      if (progress < 1) animationFrames.push(requestAnimationFrame(tick));
      else done?.();
    };
    tick(started);
  }

  function finish() {
    animationFrames.forEach(cancelAnimationFrame);
    timers.forEach(clearTimeout);
    overlapMask.setAttribute("d", full);
    pinkMask.setAttribute("d", full);
    cyanMask.setAttribute("d", full);
  }

  if (reducedMotion) {
    finish();
    return () => {};
  }

  animate(780, (progress) => progress, middleFrame, () => {
    timers.push(
      window.setTimeout(
        () =>
          animate(680, easeInOut, wingsFrame, () => {
            interactiveReady = true;
            startHoverLoop();
          }),
        140,
      ),
    );
  });

  const hoverCapable = matchMedia("(hover: hover) and (pointer: fine)").matches;

  function setHoverPoint(event: PointerEvent) {
    if (!hoverCapable || event.pointerType === "touch") return;
    const bounds = element.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    hoverPoint = {
      x:
        viewBox.x +
        ((event.clientX - bounds.left) / bounds.width) * viewBox.width,
      y:
        viewBox.y +
        ((event.clientY - bounds.top) / bounds.height) * viewBox.height,
    };
    layerPoints ??= {
      pink: { ...hoverPoint },
      middle: { ...hoverPoint },
      cyan: { ...hoverPoint },
    };
    startHoverLoop();
  }

  function clearHover() {
    hoverPoint = undefined;
    layerPoints = undefined;
    if (hoverFrame !== undefined) {
      cancelAnimationFrame(hoverFrame);
      hoverFrame = undefined;
    }
    if (interactiveReady) {
      for (const mask of [pinkMask, overlapMask, cyanMask]) {
        mask.setAttribute("fill-rule", "nonzero");
        mask.setAttribute("d", full);
      }
      cyanDither.setAttribute("d", "");
    }
  }

  function startHoverLoop() {
    if (
      !interactiveReady ||
      !hoverPoint ||
      hoverFrame !== undefined
    ) return;
    hoverFrame = requestAnimationFrame(renderHover);
  }

  function renderHover(now: number) {
    hoverFrame = undefined;
    if (!interactiveReady || !hoverPoint) return;

    if (now - hoverRenderedAt >= 58) {
      hoverRenderedAt = now;
      layerPoints ??= {
        pink: { ...hoverPoint },
        middle: { ...hoverPoint },
        cyan: { ...hoverPoint },
      };
      const layers = [
        { mask: pinkMask, point: layerPoints.pink, style: hoverStyles.pink },
        {
          mask: overlapMask,
          point: layerPoints.middle,
          style: hoverStyles.middle,
        },
        { mask: cyanMask, point: layerPoints.cyan, style: hoverStyles.cyan },
      ];

      for (const layer of layers) {
        layer.point.x +=
          (hoverPoint.x - layer.point.x) * layer.style.follow;
        layer.point.y +=
          (hoverPoint.y - layer.point.y) * layer.style.follow;
        const dither = hoverMask(
          layer.point,
          now,
          full,
          threshold,
          layer.style,
        );
        const { mask } = layer;
        mask.setAttribute("fill-rule", "evenodd");
        mask.setAttribute("d", dither.mask);
        if (mask === cyanMask) {
          cyanDither.setAttribute("d", dither.pixels);
        }
      }
    }

    hoverFrame = requestAnimationFrame(renderHover);
  }

  if (hoverCapable) {
    element.addEventListener("pointerenter", setHoverPoint);
    element.addEventListener("pointermove", setHoverPoint);
    element.addEventListener("pointerleave", clearHover);
  }

  return () => {
    animationFrames.forEach(cancelAnimationFrame);
    timers.forEach(clearTimeout);
    clearHover();
    element.removeEventListener("pointerenter", setHoverPoint);
    element.removeEventListener("pointermove", setHoverPoint);
    element.removeEventListener("pointerleave", clearHover);
  };
}

function hoverMask(
  point: { x: number; y: number },
  now: number,
  full: string,
  threshold: (column: number, row: number) => number,
  style: HoverStyle,
) {
  const { cell, radius } = style;
  const firstColumn = Math.floor((point.x - viewBox.x - radius) / cell);
  const lastColumn = Math.ceil((point.x - viewBox.x + radius) / cell);
  const firstRow = Math.floor((point.y - viewBox.y - radius) / cell);
  const lastRow = Math.ceil((point.y - viewBox.y + radius) / cell);
  const phase = Math.floor(now / style.phaseMs);
  let pixels = "";

  for (let row = firstRow; row <= lastRow; row += 1) {
    const rowGlitch =
      (hashRandom(phase + style.seed, row, style.seed) - 0.5) *
      cell *
      style.rowGlitch;
    for (let column = firstColumn; column <= lastColumn; column += 1) {
      const x = viewBox.x + column * cell;
      const y = viewBox.y + row * cell;
      const dx = x + cell / 2 + rowGlitch - point.x;
      const dy = y + cell / 2 - point.y;
      const distance = Math.hypot(dx, dy) / radius;
      if (distance >= 1) continue;

      const strength = (1 - distance) * style.strength;
      const flicker =
        0.72 +
        hashRandom(column + style.seed, row, phase + style.seed) * 0.28;
      if (
        threshold(column + phase + style.seed, row + style.seed) >=
        strength * flicker
      ) continue;

      const size = cell + 0.8;
      pixels += `M${x},${y}h${size}v${size}h-${size}z`;
    }
  }

  return { mask: full + pixels, pixels };
}

function buildBayerMatrix(): number[][] {
  let matrix = [[0]];
  for (let iteration = 1; iteration <= 3; iteration++) {
    const size = matrix.length;
    const next = Array.from({ length: size * 2 }, () =>
      Array<number>(size * 2).fill(0),
    );
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const value = (matrix[y]?.[x] ?? 0) * 4;
        if (next[y]) {
          next[y][x] = value;
          next[y][x + size] = value + 2;
        }
        if (next[y + size]) {
          next[y + size][x] = value + 3;
          next[y + size][x + size] = value + 1;
        }
      }
    }
    matrix = next;
  }
  return matrix;
}

function hashRandom(column: number, row: number, seed: number): number {
  let hash =
    column * 73_856_093 ^
    row * 19_349_663 ^
    (seed | 0) * 83_492_791;
  hash = Math.imul(hash ^ (hash >>> 13), 0x5bd1e995);
  hash ^= hash >>> 15;
  return (hash >>> 0) / 4_294_967_296;
}

function easeInOut(progress: number): number {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - (-2 * progress + 2) ** 3 / 2;
}

function template(id: number): string {
  return `
    <svg viewBox="412.736 308.963 675.611 501.047" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="sw-gp${id}" x1="63%" y1="0%" x2="63%" y2="100%">
          <stop stop-color="#FC7ADC" offset="0"/><stop stop-color="#FD30F8" offset="1"/>
        </linearGradient>
        <linearGradient id="sw-gc${id}" x1="36%" y1="0%" x2="36%" y2="100%">
          <stop stop-color="#42F8FD" offset="0"/><stop stop-color="#43D8F7" offset="1"/>
        </linearGradient>
        <mask id="sw-mp${id}"><path class="sw-mask-pink" fill="#fff" d=""/></mask>
        <mask id="sw-mc${id}"><path class="sw-mask-cyan" fill="#fff" d=""/></mask>
        <mask id="sw-mo${id}"><path class="sw-mask-over" fill="#fff" d=""/></mask>
        <clipPath id="sw-cc${id}"><path d="M800 309H1070L848 623H579z M795 496H1065L843 810H574z"/></clipPath>
      </defs>
      <g mask="url(#sw-mp${id})"><path d="M643.076,315.506 C646.350996,311.372656 651.335469,308.963 656.609,308.963 L928.032,308.963 C934.654485,308.963 940.693531,312.750628 943.5762,318.712802 C946.458869,324.674976 945.677113,331.760663 941.564,336.951 L719.951,616.634 C716.676004,620.767344 711.691531,623.177 706.418,623.177 L434.995,623.177 C428.372515,623.177 422.333469,619.389372 419.4508,613.427198 C416.568131,607.465024 417.349887,600.379337 421.463,595.189 L643.076,315.506 Z" fill="url(#sw-gp${id})"/><path d="M638.082,502.34 C641.356996,498.206656 646.341469,495.797 651.615,495.797 L923.038,495.797 C929.660665,495.797 935.700062,499.584099 938.582983,505.546352 C941.465903,511.508605 940.684225,518.594521 936.571,523.785 L714.957,803.468 C711.682222,807.601069 706.69818,810.011 701.425,810.011 L430.001,810.011 C423.378515,810.011 417.339469,806.223372 414.4568,800.261198 C411.574131,794.299024 412.355887,787.213337 416.469,782.023 L638.082,502.34 Z" fill="url(#sw-gp${id})"/></g>
      <g mask="url(#sw-mc${id})"><path d="M786.125,315.506 C789.399778,311.372931 794.38382,308.963 799.657,308.963 L1071.081,308.963 C1077.70348,308.963 1083.74253,312.750628 1086.6252,318.712802 C1089.50787,324.674976 1088.72611,331.760663 1084.613,336.951 L862.999,616.634 C859.724222,620.767069 854.74018,623.177 849.467,623.177 L578.044,623.177 C571.421335,623.177 565.381938,619.389901 562.499017,613.427648 C559.616097,607.465395 560.397775,600.379479 564.511,595.189 L786.125,315.506 Z" fill="url(#sw-gc${id})"/><path d="M781.131,502.34 C784.405778,498.206931 789.38982,495.797 794.663,495.797 L1066.087,495.797 C1072.70948,495.797 1078.74853,499.584628 1081.6312,505.546802 C1084.51387,511.508976 1083.73211,518.594663 1079.619,523.785 L858.005,803.468 C854.730222,807.601069 849.74618,810.011 844.473,810.011 L573.05,810.011 C566.427335,810.011 560.387938,806.223901 557.505017,800.261648 C554.622097,794.299395 555.403775,787.213479 559.517,782.023 L781.131,502.34 Z" fill="url(#sw-gc${id})"/></g>
      <g mask="url(#sw-mo${id})"><path d="M786.125,315.506 C789.399778,311.372931 794.38382,308.963 799.657,308.963 L928.032,308.963 C934.654485,308.963 940.693531,312.750628 943.5762,318.712802 C946.458869,324.674976 945.677113,331.760663 941.564,336.951 L719.951,616.634 C716.676004,620.767344 711.691531,623.177 706.418,623.177 L578.044,623.177 C571.421335,623.177 565.381938,619.389901 562.499017,613.427648 C559.616097,607.465395 560.397775,600.379479 564.511,595.189 L786.125,315.506 Z M781.131,502.34 C784.405778,498.206931 789.38982,495.797 794.663,495.797 L923.038,495.797 C929.660665,495.797 935.700062,499.584099 938.582983,505.546352 C941.465903,511.508605 940.684225,518.594521 936.571,523.785 L714.957,803.468 C711.682222,807.601069 706.69818,810.011 701.425,810.011 L573.05,810.011 C566.427335,810.011 560.387938,806.223901 557.505017,800.261648 C554.622097,794.299395 555.403775,787.213479 559.517,782.023 L781.131,502.34 Z M638.082,502.34 C641.356996,498.206656 646.341469,495.797 651.615,495.797 L923.038,495.797 C929.660665,495.797 935.700062,499.584099 938.582983,505.546352 C941.465903,511.508605 940.684225,518.594521 936.571,523.785 L862.999,616.634 C859.724222,620.767069 854.74018,623.177 849.467,623.177 L578.044,623.177 C571.421335,623.177 565.381938,619.389901 562.499017,613.427648 C559.616097,607.465395 560.397775,600.379479 564.511,595.189 L638.082,502.34 Z" fill="#4548E9" fill-rule="nonzero"/></g>
      <path class="sw-cyan-dither" clip-path="url(#sw-cc${id})" fill="#4548E9" d=""/>
    </svg>
  `;
}
