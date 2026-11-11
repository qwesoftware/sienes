import { Spinner } from "@/components/ui/spinner";

// What the stage shows while a run is in flight: what is happening and what comes after.
// The workspace's live region already announces the state change.
export function RunNotice({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <Spinner className="size-5 text-muted-foreground" aria-hidden />
      <h2 className="text-lg font-semibold text-balance">{title}</h2>
      <p className="max-w-md text-sm text-pretty text-muted-foreground">{detail}</p>
    </div>
  );
}
