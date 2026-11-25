import Image from "next/image"

import { cn } from "@/lib/utils"

type BrandLogoProps = {
  // "dark" for light backgrounds, "light" for the black brand panel.
  tone?: "dark" | "light"
  size?: "sm" | "md"
  className?: string
}

// Amagi logo (public/amagi-logo-white.svg) with the product name beside it.
export default function BrandLogo({ tone = "dark", size = "md", className }: BrandLogoProps) {
  const isLight = tone === "light"
  const isSmall = size === "sm"

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* The supplied Amagi mark is white, so it sits on a navy tile. */}
      <div
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#0a0f34]",
          isLight && "p-1 ring-1 ring-white/20",
          isSmall ? "size-11" : "size-12"
        )}
      >
        <Image
          src="/amagi-logo-white.svg"
          alt="Amagi"
          width={125}
          height={35}
          preload
          unoptimized
          className="h-full w-full p-1 object-contain"
        />
      </div>
      <div className="min-w-0 flex flex-col justify-center h-full">
        <p
          className={cn(
            "truncate font-bold",
            isSmall ? "text-base" : "text-lg",
            isLight ? "text-white" : "text-zinc-950 dark:text-zinc-100"
          )}
        >
          Multimedia Console
        </p>
      </div>
    </div>
  )
}
