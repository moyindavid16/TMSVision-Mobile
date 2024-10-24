
// Import the native module. On web, it will be resolved to Tmsvision.web.ts
// and on native platforms to Tmsvision.ts
import TmsvisionModule from "./TmsvisionModule";

export function getTheme(): string {
  return TmsvisionModule.getTheme();
}
