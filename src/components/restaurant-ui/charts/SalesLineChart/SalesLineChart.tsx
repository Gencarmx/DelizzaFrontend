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
  return (
    <div className="bg-white rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100">
      {title && (
        <h3 className="text-lg font-bold text-gray-900 mb-4">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            stroke="#9ca3af"
            style={{ fontSize: "12px" }}
          />
          <YAxis stroke="#9ca3af" style={{ fontSize: "12px" }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(value: number | undefined) => [`${value ?? 0}`, "Ventas"]}
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
