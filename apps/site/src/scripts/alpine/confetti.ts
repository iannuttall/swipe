import confetti from "canvas-confetti";

const count = 200;
const defaults = {
  colors: ["#ff4fa3", "#4548e9", "#6bd5ea"],
  disableForReducedMotion: true,
  origin: { y: 0.7 },
  ticks: 260,
} satisfies confetti.Options;

function fire(particleRatio: number, options: confetti.Options) {
  confetti({
    ...defaults,
    ...options,
    particleCount: Math.floor(count * particleRatio),
  });
}

export function burstConfetti() {
  fire(0.25, {
    spread: 26,
    startVelocity: 55,
  });
  fire(0.2, {
    spread: 60,
  });
  fire(0.35, {
    decay: 0.91,
    scalar: 0.8,
    spread: 100,
  });
  fire(0.1, {
    decay: 0.92,
    scalar: 1.2,
    spread: 120,
    startVelocity: 25,
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 45,
  });
}
