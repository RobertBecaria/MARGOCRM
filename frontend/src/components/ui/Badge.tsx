import type { ReactNode } from "react";

type BadgeColor = "blue" | "green" | "red" | "orange" | "purple" | "cyan" | "pink" | "gray";

interface BadgeProps {
  color?: BadgeColor;
  children: ReactNode;
}

const colorClasses: Record<BadgeColor, string> = {
  blue: "bg-blue-500/15 text-blue-400 border border-blue-500/20",
  green: "bg-green-500/15 text-green-400 border border-green-500/20",
  red: "bg-red-500/15 text-red-400 border border-red-500/20",
  orange: "bg-orange-500/15 text-orange-400 border border-orange-500/20",
  purple: "bg-purple-500/15 text-purple-400 border border-purple-500/20",
  cyan: "bg-cyan-500/15 text-cyan-400 border border-cyan-500/20",
  pink: "bg-pink-500/15 text-pink-400 border border-pink-500/20",
  gray: "bg-white/10 text-gray-400 border border-white/10",
};

export default function Badge({ color = "gray", children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClasses[color]}`}
    >
      {children}
    </span>
  );
}
