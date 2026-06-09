"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface DonutChartProps {
  title: string;
  value: string;
  subtitle: string;
  percentage: number;
}

export default function DonutChart({ title, value, subtitle, percentage }: DonutChartProps) {
  // Chart data: First object is the filled portion (Pastel Blue), second is the empty track (Light Grey)
  const data = [
    { name: "Filled", value: percentage, color: "#AEC6CF" },
    { name: "Empty", value: 100 - percentage, color: "#F1F5F9" },
  ];

  return (
    <div className="bg-white p-6 rounded-3xl shadow-expensive flex flex-col items-center justify-center relative w-full h-full min-h-[240px]">
      <h3 className="text-sm font-semibold text-slate-500 absolute top-6 left-6">{title}</h3>
      
      <div className="h-36 w-36 relative mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              innerRadius={55}
              outerRadius={70}
              startAngle={90}
              endAngle={-270}
              dataKey="value"
              stroke="none"
              cornerRadius={10} // Rounds the edges of the donut stroke for a modern look
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center Text Metric */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-slate-800 tracking-tight">{value}</span>
        </div>
      </div>

      <p className="text-xs font-medium text-pastel-dark mt-4 bg-pastel-light px-3 py-1 rounded-full">
        {subtitle}
      </p>
    </div>
  );
}