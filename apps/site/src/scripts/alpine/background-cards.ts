import type { AlpineRuntime } from "./types";

const GROUP_LIMITS: Record<string, number> = {
  chat: 12,
  message: 6,
  file: 5,
  terminal: 3,
  plan: 1,
};

function shuffled<T>(items: T[]) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const next = crypto.getRandomValues(new Uint32Array(1))[0] % (index + 1);
    [result[index], result[next]] = [result[next], result[index]];
  }
  return result;
}

type BackgroundState = {
  $el: HTMLElement;
  $refs: { grid: HTMLElement };
  init: () => void;
};

export function registerBackgroundCards(Alpine: AlpineRuntime) {
  Alpine.data("backgroundCards", () => ({
    init(this: BackgroundState) {
      requestAnimationFrame(() => {
        const counts: Record<string, number> = {};
        const selected = shuffled(
          Array.from(
            this.$refs.grid.querySelectorAll<HTMLElement>(
              "[data-background-card]",
            ),
          ),
        ).filter((card) => {
          const group = card.dataset.group ?? "other";
          const count = counts[group] ?? 0;
          counts[group] = count + 1;
          return count < (GROUP_LIMITS[group] ?? Number.POSITIVE_INFINITY);
        });

        this.$refs.grid.replaceChildren(...selected);
        this.$el.style.opacity = "1";
      });
    },
  }));
}
