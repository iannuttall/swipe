import { registerBackgroundCards } from "./alpine/background-cards";
import { registerConfirmation } from "./alpine/confirmation";
import { registerNewsletter } from "./alpine/newsletter";
import type { AlpineRuntime } from "./alpine/types";

export default function setupAlpine(Alpine: AlpineRuntime) {
  registerBackgroundCards(Alpine);
  registerConfirmation(Alpine);
  registerNewsletter(Alpine);
}
