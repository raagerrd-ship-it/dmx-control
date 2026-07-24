import logoLight from "@/assets/logo-light.png";
import logoDark from "@/assets/logo-dark.png";

/**
 * Dahlsjö Pulse-logotyp.
 * - `logo-light.png`: svart bläck på transparent (för ljusa bakgrunder).
 * - `logo-dark.png`:  vitt bläck på transparent (för mörka bakgrunder).
 *
 * Appen körs i mörkt tema, så vi visar den ljusa (vita) varianten som
 * standard. Om `.dark`-klassen någon gång tas bort byter vi automatiskt
 * till den svarta varianten via en overlay-teknik med `hidden`/`block`.
 */
export function BrandLogo({ className = "h-10 w-auto" }: { className?: string }) {
  return (
    <>
      <img
        src={logoDark}
        alt="Dahlsjö Pulse"
        className={`${className} hidden dark:block`}
        draggable={false}
      />
      <img
        src={logoLight}
        alt="Dahlsjö Pulse"
        className={`${className} block dark:hidden`}
        draggable={false}
      />
    </>
  );
}
