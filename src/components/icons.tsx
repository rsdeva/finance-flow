import {
  Home,
  UtensilsCrossed,
  Car,
  Plane,
  ShoppingCart,
  HeartPulse,
  Receipt,
  type LucideIcon,
  Ticket,
  LucideProps,
  TrendingUp,
  Landmark,
} from 'lucide-react';

export type Icon = LucideIcon;

export const Icons = {
  home: Home,
  food: UtensilsCrossed,
  transport: Car,
  travel: Plane,
  shopping: ShoppingCart,
  health: HeartPulse,
  bills: Receipt,
  entertainment: Ticket,
  'trending-up': TrendingUp,
  investment: TrendingUp,
  income: Landmark,
  other: Receipt,
};

export type IconName = keyof typeof Icons;

export const iconNames = Object.keys(Icons) as IconName[];

export function getIcon(name: string): React.FC<LucideProps> | null {
    if (name in Icons) {
        return Icons[name as IconName];
    }
    return null;
}
