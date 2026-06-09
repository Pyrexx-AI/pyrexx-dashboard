"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface DonutChartProps {
  title: string;
  value: string;
  subtitle: string;
  percentage: number;
}

export default function DonutChart({ title, value, subtitle, percentage }: DonutChartProps) {
  const data = [
    { name: "Filled", value: percentage, color: "#48C4C6" }, // pyrexx-blue
    { name: "Empty", value: 100 - percentage, color: "rgba(137, 82, 165, 0.1)" }, // pyrexx-purple ultra light
  ];

  return (
    <div className="bg-white dark:bg-pyrexx-darkCard p-3 md:p-5 rounded-2xl shadow-expensive dark:shadow-expensive-dark flex flex-col items-center justify-center relative w-full h-full min-h-[160px] md:min-h-[200px] transition-colors">
      <h3 className="text-[10px] md:text-sm font-bold text-slate-500 dark:text-slate-400 absolute top-3 md:top-5 left-3 md:left-5">{title}</h3>
      
      <div className="h-20 w-20 md:h-32 md:w-32 relative mt-4 md:mt-6">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              innerRadius="60%"
              outerRadius="80%"
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

        {/* Center Text Metric */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-sm md:text-2xl font-bold text-slate-800 dark:text-white tracking-tight">{value}</span>
        </div>
      </div>

      <p className="hidden md:block text-[10px] md:text-xs font-semibold text-pyrexx-purple mt-3 bg-pyrexx-blue/10 dark:bg-pyrexx-purple/20 px-3 py-1 rounded-full">
        {subtitle}
      </p>
    </div>
  );
}