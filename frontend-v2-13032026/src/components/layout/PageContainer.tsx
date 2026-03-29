import { cn } from "@/lib/utils";

type MaxWidth = "sm" | "md" | "lg" | "xl" | "2xl" | "7xl" | "full";

const MAX_WIDTH_CLASSES: Record<MaxWidth, string> = {
  sm:   "max-w-sm",
  md:   "max-w-2xl",
  lg:   "max-w-4xl",
  xl:   "max-w-6xl",
  "2xl":"max-w-[1400px]",
  "7xl":"max-w-7xl",
  full: "max-w-none",
};

interface PageContainerProps {
  children: React.ReactNode;
  maxWidth?: MaxWidth;
  /** Apply horizontal + vertical padding */
  padding?: boolean;
  className?: string;
  /** Whether this container is inside an AppShell */
  inAppShell?: boolean;
}

export default function PageContainer({
  children,
  maxWidth = "2xl",
  padding = true,
  className,
  inAppShell = false,
}: PageContainerProps) {
  return (
    <main
      className={cn(
        // Center & cap width
        "mx-auto w-full",
        MAX_WIDTH_CLASSES[maxWidth],
        // Padding
        padding && "px-4 py-6 md:px-6 lg:px-8",
        // Legacy support for non-AppShell layouts
        !inAppShell && [
          // Push content right of the collapsed rail on desktop
          "lg:ml-[64px]",
          // Reserve room for fixed BottomNav on mobile
          "has-bottom-nav lg:pb-0"
        ],
        className
      )}
    >
      {children}
    </main>
  );
}
