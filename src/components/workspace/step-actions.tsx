// The action row of a step stays visible at the bottom of the viewport so
// the main action is never below a long page of sources or sections.
export function StepActions({ children }: { children: React.ReactNode }) {
  return <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center gap-3 border-t bg-background/95 px-1 py-3 backdrop-blur">{children}</div>;
}
