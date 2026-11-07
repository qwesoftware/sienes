import { Wordmark } from "@/components/brand/wordmark";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 p-4">
      <Wordmark height={44} />
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
