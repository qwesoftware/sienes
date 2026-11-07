import { Wordmark } from "@/components/brand/wordmark";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
      <Wordmark />
      <h1 className="text-center text-xl font-medium text-foreground">
        Asistente de resumen de historia clínica
      </h1>
    </main>
  );
}
