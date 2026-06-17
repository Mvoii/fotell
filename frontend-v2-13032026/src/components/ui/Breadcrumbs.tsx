"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbsProps {
  /**
   * Optional custom labels for specific path segments.
   * Key should be the exact path segment (e.g., '123-abc').
   */
  customLabels?: Record<string, string>;
  className?: string;
  /**
   * The root label (usually an icon)
   */
  rootLabel?: React.ReactNode;
  /**
   * The path the root element navigates to.
   * Default is '/dashboard'.
   */
  rootPath?: string;
}

export function Breadcrumbs({
  customLabels = {},
  className,
  rootLabel = <Home className="h-4 w-4" />,
  rootPath = "/dashboard",
}: BreadcrumbsProps) {
  const pathname = usePathname();

  if (!pathname || pathname === "/" || pathname === rootPath) {
    return null;
  }

  // Remove leading/trailing slashes and split
  const segments = pathname.split("/").filter((segment) => segment !== "");

  // Format segment function
  const formatSegment = (segment: string) => {
    if (customLabels[segment]) {
      return customLabels[segment];
    }
    // Replace hyphens with spaces and capitalize words
    return segment
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center space-x-1 text-sm text-muted-foreground", className)}>
      <Link
        href={rootPath}
        className="flex items-center hover:text-foreground transition-colors"
        aria-label="Home"
      >
        {rootLabel}
      </Link>

      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1;
        // Construct the href for the current segment
        const href = "/" + segments.slice(0, index + 1).join("/");
        const title = formatSegment(segment);

        return (
          <React.Fragment key={href}>
            <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
            {isLast ? (
              <span
                className="font-medium text-foreground"
                aria-current="page"
              >
                {title}
              </span>
            ) : (
              <Link
                href={href}
                className="truncate hover:text-foreground transition-colors"
              >
                {title}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
