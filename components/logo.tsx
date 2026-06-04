import Link from "next/link";
import Image from "next/image";
import { cn } from "@/utils/lib";

export function Logo({
  className,
  textColor = "text-gray-900",
  size = "default",
  iconOnly = false,
}: {
  className?: string
  textColor?: string
  size?: "default" | "lg"
  iconOnly?: boolean
}) {
  const iconSize = size === "lg" ? 44 : 32
  const textClass =
    size === "lg"
      ? "text-xl flex font-extrabold"
      : "text-lg hidden md:flex sm:text-2xl font-extrabold"

  return (
    <Link
      href="/"
      aria-label="Access Oxbridge"
      className={cn("col-span-1 flex items-center justify-center transition-opacity gap-2.5", className)}
    >
      <Image
        src="/logo.png"
        alt="Access Oxbridge"
        width={iconSize}
        height={iconSize}
        className="shrink-0 [mix-blend-mode:screen]"
      />
      {!iconOnly && (
        <h1
          className={cn(
            textClass,
            "tracking-tight text-center whitespace-nowrap",
            textColor
          )}
        >
          Access Oxbridge
        </h1>
      )}
    </Link>
  )
}