import React from "react";
import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export interface ProductData {
  name: string;
  sales: number;
}

export interface ProductsBarChartProps {
  data: ProductData[];
  title?: string;
}

const colors = ["#fbbf24", "#60a5fa", "#34d399", "#f87171", "#a78bfa"];

export default function ProductsBarChart({
  data,
  title,
}: ProductsBarChartProps) {
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
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-[300px]">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Sin productos vendidos
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Los productos más vendidos aparecerán aquí cuando tengas ventas
            </p>
          </div>
        </div>
      ) : (
        <div className="animate-fade-in">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="currentColor"
                className="text-gray-200 dark:text-gray-700"
              />
              <XAxis
                dataKey="name"
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
                  borderRadius: "12px",
                  fontSize: "12px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  color: isDark ? "#f9fafb" : "#111827",
                }}
                formatter={(value: number | undefined) => [
                  `${value ?? 0} unidades`,
                  "Vendidos",
                ]}
              />
              <Bar
                dataKey="sales"
                radius={[8, 8, 0, 0]}
                animationDuration={1500}
                animationEasing="ease-in-out"
              >
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={colors[index % colors.length]}
                    className="hover:opacity-80 transition-opacity cursor-pointer"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
