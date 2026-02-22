export interface Fine {
  id?: number;
  payer: string;
  amount: number;
  reason?: string;
  created_at?: string; // ISO string
  paid?: boolean;
  paid_by?: string | null;
  paid_at?: string | null;
}
