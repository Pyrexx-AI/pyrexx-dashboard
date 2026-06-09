"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { useState, useEffect } from "react";

interface DonutChartProps {
  title: string;
  value: string;
  subtitle: string;
  percentage: number;
}

export default function DonutChart({ title, value, subtitle, percentage }: DonutChartProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const data = [
    { name: "Filled", value: percentage, color: "#48C4C6" }, // pyrexx-blue
    { name: "Empty", value: 100 - percentage, color: "rgba(137, 82, 165, 0.1)" }, // pyrexx-purple ultra light
  ];

  return (
    <div className="bg-white dark:bg-pyrexx-darkCard p-2 md:p-5 rounded-[1.25rem] shadow-expensive dark:shadow-expensive-dark flex flex-col items-center justify-center relative w-full aspect-square md:aspect-auto md:min-h-[220px]">
      <h3 className="text-[10px] md:text-sm font-bold text-slate-500 dark:text-slate-400 absolute top-3 left-3 md:top-5 md:left-5">{title}</h3>
      
      <div className="h-16 w-16 md:h-32 md:w-32 relative mt-5 shrink-0">
        {mounted && (
          <ResponsiveContainer width="100%" height="100%" minWidth={64} minHeight={64}>
            <PieChart>
              <Pie
                data={data}
                innerRadius="65%"
                outerRadius="95%"
                startAngle={90}
                endAngle={-270}
                dataKey="value"
                stroke="none"
                cornerRadius={8}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xs md:text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight leading-none">{value}</span>
        </div>
      </div>
      <p className="hidden md:block text-xs font-semibold text-pyrexx-purple mt-4 bg-pyrexx-purple/10 px-3 py-1 rounded-full">
        {subtitle}
      </p>
    </div>
  );
}