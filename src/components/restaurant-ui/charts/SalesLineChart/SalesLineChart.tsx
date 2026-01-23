import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export interface SalesData {
  date: string;
  sales: number;
}

export interface SalesLineChartProps {
  data: SalesData[];
  title?: string;
}

export default function SalesLineChart({ data, title }: SalesLineChartProps) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };

    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 dark:border-gray-700">
      {title && (
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          {title}
        </h3>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="currentColor"
            className="text-gray-200 dark:text-gray-700"
          />
          <XAxis
            dataKey="date"
            stroke="currentColor"
            className="text-gray-400 dark:text-gray-500"
            style={{ fontSize: "12px" }}
          />
          <YAxis
            stroke="currentColor"
            className="text-gray-400 dark:text-gray-500"
            style={{ fontSize: "12px" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? "#1f2937" : "#fff",
              border: `1px solid ${isDark ? "#374151" : "#e5e7eb"}`,
              borderRadius: "8px",
              fontSize: "12px",
              color: isDark ? "#f9fafb" : "#111827",
            }}
            formatter={(value: number | undefined) => [
              `${value ?? 0}`,
              "Ventas",
            ]}
          />
          <Line
            type="monotone"
            dataKey="sales"
            stroke="#fbbf24"
            strokeWidth={3}
            dot={{ fill: "#fbbf24", r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
