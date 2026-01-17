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
    <div className="group bg-white rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:border-amber-100 transition-all duration-300">
      {title && (
        <h3 className="text-lg font-bold text-gray-900 mb-4 group-hover:text-amber-700 transition-colors">
          {title}
        </h3>
      )}
      <div className="animate-fade-in">
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
                borderRadius: "12px",
                fontSize: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
              formatter={(value: number | undefined) => [`$${value ?? 0}`, "Ventas"]}
            />
            <Line
              type="monotone"
              dataKey="sales"
              stroke="#fbbf24"
              strokeWidth={3}
              dot={{ fill: "#fbbf24", r: 4 }}
              activeDot={{ r: 6, stroke: "#f59e0b", strokeWidth: 2 }}
              animationDuration={1500}
              animationEasing="ease-in-out"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}