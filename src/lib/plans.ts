export type PlanType = 'free' | 'pro' | 'enterprise';

export interface PlanInfo {
  name: string;
  type: PlanType;
  description: string;
  badge: string;
  color: string;
  transactionFeePercent: number;
  monthlyPrice: number;
}

export const PLANS: Record<PlanType, PlanInfo> = {
  free: {
    name: 'Free',
    type: 'free',
    description: 'Para começar a vender sem mensalidade',
    badge: 'Gratuito',
    color: 'muted',
    transactionFeePercent: 2.5,
    monthlyPrice: 0,
  },
  pro: {
    name: 'Pro',
    type: 'pro',
    description: 'Para vendedores em crescimento',
    badge: 'Pro',
    color: 'void-cyan',
    transactionFeePercent: 2.0,
    monthlyPrice: 147,
  },
  enterprise: {
    name: 'Enterprise',
    type: 'enterprise',
    description: 'Menor taxa, suporte prioritário',
    badge: 'Enterprise',
    color: 'void-purple',
    transactionFeePercent: 1.5,
    monthlyPrice: 497,
  },
};
