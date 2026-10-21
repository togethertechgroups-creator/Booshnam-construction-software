import React from "react";
import { cn } from "@/lib/utils";

export interface LoaderProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title" | "children"> {
  title?: string;
  subtitle?: string;
  size?: "sm" | "md" | "lg";
}

const SIZE_CONFIG = {
  sm: {
    container: "w-20 h-20",
    dim: 80,
    r1: 34,
    r2: 26,
    r3: 18,
    stroke1: 2.5,
    stroke2: 2,
    stroke3: 1.8,
    titleClass: "text-sm font-bold",
    subtitleClass: "text-xs",
    spacing: "space-y-1.5",
    maxWidth: "max-w-xs",
  },
  md: {
    container: "w-28 h-28",
    dim: 112,
    r1: 48,
    r2: 37,
    r3: 26,
    stroke1: 3,
    stroke2: 2.5,
    stroke3: 2,
    titleClass: "text-base font-bold",
    subtitleClass: "text-xs sm:text-sm",
    spacing: "space-y-2",
    maxWidth: "max-w-sm",
  },
  lg: {
    container: "w-36 h-36",
    dim: 144,
    r1: 62,
    r2: 48,
    r3: 34,
    stroke1: 3.5,
    stroke2: 3,
    stroke3: 2.5,
    titleClass: "text-lg font-bold",
    subtitleClass: "text-sm",
    spacing: "space-y-2.5",
    maxWidth: "max-w-md",
  },
} as const;

export function Loader({
  title = "Configuring your account...",
  subtitle = "Please wait while we prepare everything for you",
  size = "md",
  className,
  ...props
}: LoaderProps) {
  const config = SIZE_CONFIG[size];
  const hasText = Boolean(title || subtitle);
  const center = config.dim / 2;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-6 p-6 select-none",
        className
      )}
      {...props}
    >
      <style>{`
        @keyframes kokonut-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes kokonut-spin-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes kokonut-pulse-glow {
          0%, 100% { opacity: 0.85; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
        }
        .animate-kokonut-spin {
          animation: kokonut-spin 2.6s linear infinite;
          transform-origin: center;
        }
        .animate-kokonut-spin-fast {
          animation: kokonut-spin 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          transform-origin: center;
        }
        .animate-kokonut-reverse {
          animation: kokonut-spin-reverse 2s linear infinite;
          transform-origin: center;
        }
        .animate-kokonut-pulse {
          animation: kokonut-pulse-glow 2s ease-in-out infinite;
          transform-origin: center;
        }
      `}</style>

      {/* Concentric Rotating Gradient Rings */}
      <div className={cn("relative flex items-center justify-center", config.container)}>
        {/* Soft background ambient glow */}
        <div className="absolute inset-2 rounded-full bg-gradient-to-tr from-red-500/10 via-rose-500/15 to-transparent blur-md pointer-events-none" />

        <svg
          width={config.dim}
          height={config.dim}
          viewBox={`0 0 ${config.dim} ${config.dim}`}
          className="relative z-10 overflow-visible"
        >
          <defs>
            {/* Gradient 1: Deep brand crimson to vibrant rose */}
            <linearGradient id="kokonutGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#C61D45" stopOpacity="1" />
              <stop offset="50%" stopColor="#E11D48" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#FB7185" stopOpacity="0.1" />
            </linearGradient>

            {/* Gradient 2: Bright fiery red to soft fade */}
            <linearGradient id="kokonutGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#DC2626" stopOpacity="0.95" />
              <stop offset="60%" stopColor="#F43F5E" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#FDA4AF" stopOpacity="0.05" />
            </linearGradient>

            {/* Gradient 3: Inner vibrant core accent */}
            <linearGradient id="kokonutGrad3" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#991B1B" stopOpacity="1" />
              <stop offset="70%" stopColor="#E11D48" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#FECDD3" stopOpacity="0.2" />
            </linearGradient>
          </defs>

          {/* Background subtle guide tracks */}
          <circle
            cx={center}
            cy={center}
            r={config.r1}
            fill="none"
            stroke="#F1F5F9"
            strokeWidth={config.stroke1}
          />
          <circle
            cx={center}
            cy={center}
            r={config.r2}
            fill="none"
            stroke="#F8FAFC"
            strokeWidth={config.stroke2}
          />
          <circle
            cx={center}
            cy={center}
            r={config.r3}
            fill="none"
            stroke="#F1F5F9"
            strokeWidth={config.stroke3}
          />

          {/* Outer Rotating Concentric Arc */}
          <circle
            cx={center}
            cy={center}
            r={config.r1}
            fill="none"
            stroke="url(#kokonutGrad1)"
            strokeWidth={config.stroke1}
            strokeLinecap="round"
            strokeDasharray={`${config.r1 * 3.8} ${config.r1 * 2.5}`}
            className="animate-kokonut-spin"
          />

          {/* Middle Reverse Rotating Concentric Arc */}
          <circle
            cx={center}
            cy={center}
            r={config.r2}
            fill="none"
            stroke="url(#kokonutGrad2)"
            strokeWidth={config.stroke2}
            strokeLinecap="round"
            strokeDasharray={`${config.r2 * 2.8} ${config.r2 * 3.4}`}
            className="animate-kokonut-reverse"
          />

          {/* Inner Fast Accent Arc */}
          <circle
            cx={center}
            cy={center}
            r={config.r3}
            fill="none"
            stroke="url(#kokonutGrad3)"
            strokeWidth={config.stroke3}
            strokeLinecap="round"
            strokeDasharray={`${config.r3 * 3.2} ${config.r3 * 2.8}`}
            className="animate-kokonut-spin-fast"
          />

          {/* Center Pulsing Orb */}
          <circle
            cx={center}
            cy={center}
            r={size === "sm" ? 3.5 : size === "md" ? 5 : 6}
            fill="#C61D45"
            className="animate-kokonut-pulse"
          />
        </svg>
      </div>

      {/* Typography: Title & Subtitle */}
      {hasText && (
        <div className={cn("text-center", config.spacing, config.maxWidth)}>
          {title && (
            <h3
              className={cn(
                config.titleClass,
                "text-slate-900 leading-snug tracking-tight font-heading"
              )}
            >
              {title}
            </h3>
          )}
          {subtitle && (
            <p
              className={cn(
                config.subtitleClass,
                "text-slate-500 font-medium leading-relaxed"
              )}
            >
              {subtitle}
            </p>
          )}

          {/* Modern pulsing progress indicator */}
          <div className="w-24 h-1 bg-slate-100 rounded-full overflow-hidden mx-auto mt-3">
            <div className="w-full h-full bg-gradient-to-r from-[#C61D45] via-rose-500 to-[#C61D45] rounded-full animate-pulse" />
          </div>
        </div>
      )}
    </div>
  );
}

export default Loader;
