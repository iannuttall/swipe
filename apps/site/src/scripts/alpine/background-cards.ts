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
  selected: HTMLElement[];
  resizeObserver?: ResizeObserver;
  fillViewport: () => void;
  init: () => void;
  destroy: () => void;
};

export function registerBackgroundCards(Alpine: AlpineRuntime) {
  Alpine.data("backgroundCards", () => ({
    selected: [] as HTMLElement[],
    resizeObserver: undefined as ResizeObserver | undefined,

    fillViewport(this: BackgroundState) {
      this.$refs.grid
        .querySelectorAll<HTMLElement>("[data-background-card-clone]")
        .forEach((card) => card.remove());

      if (this.selected.length === 0) return;

      const styles = getComputedStyle(this.$el);
      const gap = Number.parseFloat(styles.columnGap) || 12;
      const columnWidth = Number.parseFloat(styles.columnWidth) || 280;
      const contentWidth =
        this.$el.clientWidth -
        (Number.parseFloat(styles.paddingLeft) || 0) -
        (Number.parseFloat(styles.paddingRight) || 0);
      const columns = Math.max(
        1,
        Math.floor((contentWidth + gap) / (columnWidth + gap)),
      );
      const selectedHeight = this.selected.reduce(
        (height, card) => height + card.getBoundingClientRect().height + gap,
        0,
      );
      const targetHeight = columns * (this.$el.clientHeight + 160);
      const cycles = Math.max(1, Math.ceil(targetHeight / selectedHeight));

      for (let cycle = 1; cycle < cycles; cycle += 1) {
        const fragment = document.createDocumentFragment();
        for (const card of shuffled(this.selected)) {
          const clone = card.cloneNode(true) as HTMLElement;
          clone.dataset.backgroundCardClone = "";
          fragment.append(clone);
        }
        this.$refs.grid.appendChild(fragment);
      }
    },

    init(this: BackgroundState) {
      requestAnimationFrame(() => {
        const counts: Record<string, number> = {};
        this.selected = shuffled(
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

        this.$refs.grid.replaceChildren(...this.selected);
        this.fillViewport();

        this.resizeObserver = new ResizeObserver(() => {
          requestAnimationFrame(() => this.fillViewport());
        });
        this.resizeObserver.observe(this.$el);
        this.$el.style.opacity = "1";
      });
    },

    destroy(this: BackgroundState) {
      this.resizeObserver?.disconnect();
    },
  }));
}
