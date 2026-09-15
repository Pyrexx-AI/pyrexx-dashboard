"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { useEffect, useState, useId } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface DonutChartProps {
  title: string;
  value: string;
  subtitle: string;
  percentage: number;
  trend?: { direction: "up" | "down" | "flat"; label: string };
}

export default function DonutChart({ title, value, subtitle, percentage, trend }: DonutChartProps) {
  const [mounted, setMounted] = useState(false);
  const chartId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  const pct = Math.min(100, Math.max(0, percentage));
  const data = [{ name: title, value: pct }, { name: "rest", value: 100 - pct }];

  const TrendIcon = trend?.direction === "up" ? TrendingUp : trend?.direction === "down" ? TrendingDown : Minus;
  const trendColor = trend?.direction === "up" ? "var(--success-text)" : trend?.direction === "down" ? "var(--error-text)" : "var(--text-muted)";
  const trendBg = trend?.direction === "up" ? "var(--success-surface)" : trend?.direction === "down" ? "var(--error-surface)" : "var(--bg-sunken)";

  return (
    <div
      className="card flex flex-col items-center p-3 md:p-5 gap-2 md:gap-3 w-full"
      role="figure"
      aria-labelledby={`donut-title-${chartId}`}
      aria-describedby={`donut-sub-${chartId}`}
    >
      <p
        id={`donut-title-${chartId}`}
        className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-center leading-tight"
        style={{ color: "var(--text-muted)" }}
      >
        {title}
      </p>
      <div className="relative w-16 h-16 md:w-24 md:h-24 flex-shrink-0">
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <Pie
                data={data}
                innerRadius="60%"
                outerRadius="90%"
                startAngle={90}
                endAngle={-270}
                dataKey="value"
                stroke="none"
                cornerRadius={4}
                isAnimationActive={false}
              >
                <Cell key="fill" fill="#48C4C6" />
                <Cell key="rest" fill="var(--bg-sunken)" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full rounded-full" style={{ border: "4px solid var(--bg-sunken)" }} aria-hidden="true" />
        )}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span
            className="font-extrabold leading-none text-[10px] md:text-lg"
            style={{ color: "var(--text-primary)" }}
            aria-hidden="true"
          >
            {value}
          </span>
        </div>
      </div>
      <p
        id={`donut-sub-${chartId}`}
        className="text-[9px] md:text-[10px] font-semibold px-2 md:px-3 py-0.5 md:py-1 rounded-full text-center leading-snug"
        style={{ background: "var(--purple-surface)", color: "var(--purple-text)" }}
      >
        {subtitle}
      </p>
      {trend && (
        <div
          className="flex items-center gap-1 px-2 py-0.5 rounded-full"
          style={{ background: trendBg }}
          aria-label={`Trend: ${trend.label}`}
        >
          <TrendIcon size={9} style={{ color: trendColor }} aria-hidden="true" />
          <span className="text-[9px] font-semibold" style={{ color: trendColor }}>{trend.label}</span>
        </div>
      )}
    </div>
  );
}