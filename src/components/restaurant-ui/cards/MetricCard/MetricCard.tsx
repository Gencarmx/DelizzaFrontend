import type { ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

export interface MetricCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  subtitle?: string;
}

export default function MetricCard({
  title,
  value,
  icon,
  trend,
  subtitle,
}: MetricCardProps) {
  return (
    <div className="group bg-white rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 flex flex-col gap-3 hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:border-amber-200 transition-all duration-300 hover:-translate-y-1 cursor-pointer">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-600 font-medium mb-1 transition-colors group-hover:text-gray-700">
            {title}
          </p>
          <h3 className="text-2xl font-bold text-gray-900 transition-transform group-hover:scale-105">
            {value}
          </h3>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1 transition-colors group-hover:text-gray-600">
              {subtitle}
            </p>
          )}
        </div>
        <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-amber-200 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
          {icon}
        </div>
      </div>
      {trend && (
        <div className="flex items-center gap-1 animate-fade-in">
          {trend.isPositive ? (
            <TrendingUp className="w-4 h-4 text-green-500 animate-bounce-subtle" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-500 animate-bounce-subtle" />
          )}
          <span
            className={`text-sm font-semibold ${
              trend.isPositive ? "text-green-500" : "text-red-500"
            }`}
          >
            {trend.isPositive ? "+" : ""}
            {trend.value}%
          </span>
          <span className="text-xs text-gray-500 ml-1">vs mes anterior</span>
        </div>
      )}
    </div>
  );
}