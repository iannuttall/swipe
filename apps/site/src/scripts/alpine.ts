import { registerBackgroundCards } from "./alpine/background-cards";
import { registerNewsletter } from "./alpine/newsletter";
import type { AlpineRuntime } from "./alpine/types";

export default function setupAlpine(Alpine: AlpineRuntime) {
  registerBackgroundCards(Alpine);
  registerNewsletter(Alpine);
}
