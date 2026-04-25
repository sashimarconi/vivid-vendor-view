export type OrderStatus = "pending" | "paid" | "expired";

export type StatusFilter = "all" | OrderStatus;

export type DateFilter = "all" | "today" | "week" | "month";

export interface AdminOrderRecord {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_document: string;
  customer_cep?: string | null;
  customer_address?: string | null;
  customer_number?: string | null;
  customer_complement?: string | null;
  customer_neighborhood?: string | null;
  customer_city?: string | null;
  customer_state?: string | null;
  customer_ip?: string | null;
  customer_user_agent?: string | null;
  payment_status: string;
  payment_method: string;
  total: number;
  subtotal: number;
  shipping_cost: number | null;
  shipping_option_id: string | null;
  bumps_total: number | null;
  product_variant: string | null;
  quantity: number;
  transaction_id: string | null;
  pix_expires_at: string | null;
  pix_copy_paste: string | null;
  pix_qr_code: string | null;
  paid_at?: string | null;
  created_at: string;
  updated_at: string;
  pix_copied: boolean | null;
  product_id: string | null;
  selected_bumps?: any;
  utm_params?: any;
  product?: { title: string | null } | null;
  shipping_option?: { name: string | null } | null;
  variant_name?: string | null;
}

export interface OrderStats {
  total: number;
  paid: number;
  pending: number;
  copied: number;
}
