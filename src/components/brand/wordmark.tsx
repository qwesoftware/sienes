import Image from "next/image";

// The Sienes logo with blue lettering, for white surfaces (435x125 source).
export function Wordmark({ height = 28, className }: { height?: number; className?: string }) {
  return (
    <Image
      src="/logo-blue.png"
      alt="Sienes, neurorehabilitación"
      width={Math.round((height * 435) / 125)}
      height={height}
      priority
      className={className}
    />
  );
}
