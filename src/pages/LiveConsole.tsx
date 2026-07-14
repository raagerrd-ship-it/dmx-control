import { LiveAnalysisPanel } from "@/components/LiveAnalysisPanel";
import { MicCalibration } from "@/components/MicCalibration";

/**
 * Fokuserad Live-analys-konsol — serveras på /app/live och öppnas från
 * DMX-controllern när MODE = Smart. Bara Essentia-panelen + mikrofonkalibrering,
 * inget annat brus.
 */
export default function LiveConsole() {
  return (
    <main className="mx-auto max-w-md min-h-full flex flex-col">
      <header className="px-5 pt-6 pb-4">
        <h1 className="text-xl font-bold">Live-analys</h1>
        <p className="text-sm text-muted-foreground">
          Mobilen analyserar musiken och driver Smart-läget på riggen.
        </p>
      </header>
      <div className="px-5 pb-8 space-y-4">
        <LiveAnalysisPanel />
        <MicCalibration />
      </div>
    </main>
  );
}
