import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressCircleProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max: number;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export function ProgressCircle({
  value,
  max,
  size = "md",
  showText = true,
  className,
  ...props
}: ProgressCircleProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const strokeWidth = size === "sm" ? 2 : size === "md" ? 3 : 4;
  const radius = size === "sm" ? 8 : size === "md" ? 12 : 16;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  
  const dimensions = {
    sm: 24,
    md: 32,
    lg: 40
  };

  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base"
  };

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center",
        className
      )}
      {...props}
    >
      <svg
        className="transform -rotate-90"
        width={dimensions[size]}
        height={dimensions[size]}
      >
        {/* Background circle */}
        <circle
          className="text-muted-foreground/20"
          fill="none"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          r={radius}
          cx={dimensions[size] / 2}
          cy={dimensions[size] / 2}
        />
        {/* Progress circle */}
        <circle
          className="text-primary transition-all duration-300 ease-in-out"
          fill="none"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          r={radius}
          cx={dimensions[size] / 2}
          cy={dimensions[size] / 2}
        />
      </svg>
      {showText && (
        <span
          className={cn(
            "absolute font-medium",
            textSizes[size]
          )}
        >
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
} 