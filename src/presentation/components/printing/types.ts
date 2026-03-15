export interface OrderDeliveryAddress {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country?: string;
  recipientName?: string;
  recipientPhone?: string;
}

export interface Order {
  id: string;
  fullId: string;
  customer: string;
  customerPhone?: string;
  items: string;
  total: number;
  status: "pending" | "completed" | "cancelled" | "in_progress" | "ready" | "preparing";
  date: string;
  paymentMethod: string;
  originalStatus?: string;
  deliveryType?: string;
  deliveryAddress?: OrderDeliveryAddress | null;
}
