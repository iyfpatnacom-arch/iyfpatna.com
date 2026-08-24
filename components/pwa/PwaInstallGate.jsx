import { getFlag } from "@/lib/flags";
import { PwaInstallPrompt } from "./PwaInstallPrompt";

export async function PwaInstallGate() {
  const enabled = await getFlag("pwa.installPromptEnabled", false);
  if (!enabled) return null;
  return <PwaInstallPrompt />;
}
