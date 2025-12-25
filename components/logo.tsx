import Link from "next/link";
import Image from "next/image";
import { cn } from "@/utils/lib";

export function Logo({ className }: { className?: string }) {
    return (
        <Link
          href="/"
          aria-label="Access Oxbridge"
          className={cn("col-span-1 flex items-center justify-center transition-opacity gap-2", className)}
        >
          <Image src="/logo.webp" alt="Access Oxbridge" width={32} height={32} />
          <h1 className={`text-lg hidden md:flex sm:text-2xl tracking-tighter text-center whitespace-nowrap`}>
            Access Oxbridge
          </h1>
        </Link>
    )
}