export interface Order {
  id: string;
  fullId: string;
  customer: string;
  items: string;
  total: number;
  status: "pending" | "completed" | "cancelled" | "in_progress" | "ready" | "preparing";
  date: string;
  paymentMethod: string;
  originalStatus?: string;
}
