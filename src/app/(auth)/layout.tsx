import { Wordmark } from "@/components/brand/wordmark";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center">
          <Wordmark />
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </main>
  );
}
