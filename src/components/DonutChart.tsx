"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { useEffect, useRef, useState } from "react";

interface DonutChartProps {
  title: string;
  value: string;
  subtitle: string;
  percentage: number;
}

// FIX [15]: Exported so aria-labelledby can reference a unique ID per chart instance
let chartIdCounter = 0;

export default function DonutChart({
  title,
  value,
  subtitle,
  percentage,
}: DonutChartProps) {
  const [mounted, setMounted] = useState(false);
  // FIX [15]: Stable unique ID for accessibility
  const chartId = useRef(`donut-${++chartIdCounter}`).current;

  useEffect(() => {
    // Short rAF delay avoids SSR hydration mismatch while keeping near-instant paint
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const clampedPct = Math.min(100, Math.max(0, percentage));
  const data = [
    { name: title, value: clampedPct, color: "#48C4C6" },
    { name: "Remaining", value: 100 - clampedPct, color: "rgba(137,82,165,0.12)" },
  ];

  return (
    // FIX [21]: canonical --radius-card token via rounded-2xl (consistent with cards)
    <div
      className="
        bg-white dark:bg-pyrexx-darkCard
        p-3 md:p-5
        rounded-2xl
        shadow-card dark:shadow-card-dark
        flex flex-col items-center justify-center
        relative w-full
        aspect-square md:aspect-auto md:min-h-[210px]
      "
      role="figure"
      aria-labelledby={`${chartId}-title`}
      aria-describedby={`${chartId}-subtitle`}
    >
      {/* Title */}
      <h3
        id={`${chartId}-title`}
        className="text-[10px] md:text-xs font-bold text-slate-500 dark:text-slate-400 absolute top-3 left-3 md:top-4 md:left-4 uppercase tracking-wide"
      >
        {title}
      </h3>

      {/* Chart ring */}
      <div className="h-[68px] w-[68px] md:h-28 md:w-28 relative mt-5 shrink-0">
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                innerRadius="64%"
                outerRadius="94%"
                startAngle={90}
                endAngle={-270}
                dataKey="value"
                stroke="none"
                cornerRadius={6}
                isAnimationActive={true}
                animationBegin={0}
                animationDuration={700}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        ) : (
          // FIX [9]: Placeholder ring prevents layout shift before Recharts mounts
          <div className="w-full h-full rounded-full border-4 border-pyrexx-blue/10" />
        )}

        {/* Center value */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span
            className="text-[10px] md:text-xl font-extrabold text-slate-800 dark:text-white tracking-tight leading-none"
            aria-hidden="true"
          >
            {value}
          </span>
        </div>
      </div>

      {/* FIX [23]: subtitle visible on all screen sizes (removed hidden md:block) */}
      <p
        id={`${chartId}-subtitle`}
        className="mt-3 text-[9px] md:text-xs font-semibold text-pyrexx-purple bg-pyrexx-purple/10 px-2 md:px-3 py-0.5 md:py-1 rounded-full text-center leading-snug"
      >
        {subtitle}
      </p>
    </div>
  );
}
