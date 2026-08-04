import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const logoSourcePath = join(
  root,
  "apps/site/src/scripts/alpine/swipe-logo.ts",
);
const staticAvatarPath = join(root, "apps/site/public/swipe-avatar.png");
const animatedAvatarPath = join(root, "apps/site/public/swipe-avatar.gif");
const faviconPath = join(root, "apps/site/public/favicon.png");

const viewBox = {
  x: 412.736,
  y: 308.963,
  width: 675.611,
  height: 501.047,
};
const framesPerSecond = 25;
const animationDurationMs = 1600;
const animationFrameCount = animationDurationMs / (1000 / framesPerSecond);
const frameDelayCs = 100 / framesPerSecond;
const visibleDelayCs = 3000;
const hiddenDelayCs = 200;
const full = `M${viewBox.x},${viewBox.y}h${viewBox.width}v${viewBox.height}h-${viewBox.width}z`;
const bayer8 = buildBayerMatrix();

const source = readFileSync(logoSourcePath, "utf8");
const templateStart = source.indexOf("function template(id: number): string {");
const svgStart = source.indexOf("return `", templateStart) + "return `".length;
const svgEnd = source.indexOf("`;", svgStart);

if (templateStart < 0 || svgStart < 0 || svgEnd < 0) {
  throw new Error(`Could not extract the logo SVG from ${logoSourcePath}`);
}

const sourceSvg = source.slice(svgStart, svgEnd).replaceAll("${id}", "0").trim();
const workDir = mkdtempSync(join(tmpdir(), "swipe-avatar-"));

try {
  execFileSync("magick", [
    faviconPath,
    "-resize",
    "400x400",
    "-gravity",
    "center",
    "-background",
    "none",
    "-extent",
    "512x512",
    staticAvatarPath,
  ]);

  const entryFrames = [];
  for (let frame = 0; frame <= animationFrameCount; frame += 1) {
    const elapsedMs = frame * (1000 / framesPerSecond);
    const overlapProgress = Math.min(elapsedMs / 780, 1);
    const wingsProgress =
      elapsedMs < 920 ? 0 : Math.min((elapsedMs - 920) / 680, 1);
    const paths = {
      overlap: middleFrame(overlapProgress),
      ...wingsFrame(easeInOut(wingsProgress)),
    };
    const svg = avatarSvg(sourceSvg, paths);
    const svgPath = join(workDir, `frame-${String(frame).padStart(3, "0")}.svg`);
    const pngPath = join(workDir, `frame-${String(frame).padStart(3, "0")}.png`);
    writeFileSync(svgPath, svg);
    execFileSync("/usr/bin/sips", [
      "-s",
      "format",
      "png",
      svgPath,
      "--out",
      pngPath,
    ], { stdio: "ignore" });
    entryFrames.push(pngPath);
  }

  const fullFrame = entryFrames.at(-1);
  const blankFrame = entryFrames[0];
  const exitFrames = entryFrames.slice(0, -1).reverse();
  const gifArgs = [
    "-delay",
    String(frameDelayCs),
    "-dispose",
    "background",
    ...entryFrames,
    "-delay",
    String(visibleDelayCs),
    "-dispose",
    "background",
    fullFrame,
    "-delay",
    String(frameDelayCs),
    "-dispose",
    "background",
    ...exitFrames,
    "-delay",
    String(hiddenDelayCs),
    "-dispose",
    "background",
    blankFrame,
    "-loop",
    "0",
    "-layers",
    "OptimizeTransparency",
    animatedAvatarPath,
  ];
  execFileSync("magick", gifArgs);
  console.log(animatedAvatarPath);
} finally {
  if (process.env.SWIPE_AVATAR_KEEP_FRAMES === "1") {
    console.log(workDir);
  } else {
    rmSync(workDir, { recursive: true, force: true });
  }
}

function middleFrame(progress) {
  if (progress >= 1) return full;

  const cell = 8;
  const band = 105;
  const tilt = 0.79;
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
    const bottom = Math.max(
      0,
      Math.min(solidTo - tilt * viewBox.height, viewBox.width),
    );
    path += `M${viewBox.x},${viewBox.y}L${viewBox.x + top},${viewBox.y}L${viewBox.x + bottom},${viewBox.y + viewBox.height}L${viewBox.x},${viewBox.y + viewBox.height}z`;
  }

  for (let column = firstColumn; column <= lastColumn; column += 1) {
    for (let row = 0; row < rows; row += 1) {
      const position = column * cell + tilt * (row * cell);
      if (position + cell * (1 + tilt) < solidTo || position > front) continue;
      const opacity = (front - position) / band;
      if (opacity > 0 && threshold(column, row) < opacity) {
        path += `M${viewBox.x + column * cell},${viewBox.y + row * cell}h${cell + 0.6}v${cell + 0.6}h-${cell + 0.6}z`;
      }
    }
  }
  return path;
}

function wingsFrame(progress) {
  if (progress >= 1) return { pink: full, cyan: full };

  const line = 7;
  const rag = 90;
  const seed = 11;
  const rows = Math.ceil(viewBox.height / line);
  const front = progress * (533 + rag);
  let pink = "";
  let cyan = "";

  for (let row = 0; row < rows; row += 1) {
    const offset = hashRandom(1, row, seed) * rag;
    const y = viewBox.y + row * line;
    const height = line + 0.6;
    const reach = Math.max(0, front - offset);
    if (reach <= 0) continue;

    const pinkEnd = Math.max(0, 533 - reach);
    pink += `M${viewBox.x + pinkEnd},${y}h${533 - pinkEnd + 4}v${height}h-${533 - pinkEnd + 4}z`;
    const cyanStart = Math.min(viewBox.width, 142.4 + reach);
    cyan += `M${viewBox.x + 138.4},${y}h${cyanStart - 142.4 + 4}v${height}h-${cyanStart - 142.4 + 4}z`;
  }

  return { pink, cyan };
}

function avatarSvg(svg, paths) {
  const scale = 400 / viewBox.width;
  const renderedHeight = viewBox.height * scale;
  const offsetY = (512 - renderedHeight) / 2;
  const nested = svg
    .replace(
      /^<svg viewBox="[^"]+"/,
      `<svg x="56" y="${offsetY}" width="400" height="${renderedHeight}" viewBox="${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}"`,
    )
    .replace('class="sw-mask-pink" fill="#fff" d=""', `class="sw-mask-pink" fill="#fff" d="${paths.pink}"`)
    .replace('class="sw-mask-cyan" fill="#fff" d=""', `class="sw-mask-cyan" fill="#fff" d="${paths.cyan}"`)
    .replace('class="sw-mask-over" fill="#fff" d=""', `class="sw-mask-over" fill="#fff" d="${paths.overlap}"`);

  return `<svg viewBox="0 0 512 512" width="512" height="512" xmlns="http://www.w3.org/2000/svg">
    <rect width="512" height="512" fill="#fff"/>
    ${nested}
  </svg>`;
}

function threshold(column, row) {
  return (((bayer8[row & 7]?.[column & 7] ?? 0) + 0.5) / 64) * 0.97;
}

function buildBayerMatrix() {
  let matrix = [[0]];
  for (let iteration = 1; iteration <= 3; iteration += 1) {
    const size = matrix.length;
    const next = Array.from({ length: size * 2 }, () =>
      Array(size * 2).fill(0),
    );
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const value = (matrix[y]?.[x] ?? 0) * 4;
        next[y][x] = value;
        next[y][x + size] = value + 2;
        next[y + size][x] = value + 3;
        next[y + size][x + size] = value + 1;
      }
    }
    matrix = next;
  }
  return matrix;
}

function hashRandom(column, row, seed) {
  let hash =
    (column * 73_856_093) ^
    (row * 19_349_663) ^
    ((seed | 0) * 83_492_791);
  hash = Math.imul(hash ^ (hash >>> 13), 0x5bd1e995);
  hash ^= hash >>> 15;
  return (hash >>> 0) / 4_294_967_296;
}

function easeInOut(progress) {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - (-2 * progress + 2) ** 3 / 2;
}
