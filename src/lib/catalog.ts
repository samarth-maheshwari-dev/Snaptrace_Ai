import {
  Backpack, CreditCard, GlassWater, KeyRound, Laptop, NotebookPen, Package, Shirt, Watch, type LucideIcon,
} from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import type { Category } from '../types';

export const CATEGORY_META: Record<Category, { label: string; icon: LucideIcon }> = {
  electronics: { label: 'Electronics', icon: Laptop },
  bags: { label: 'Bags', icon: Backpack },
  bottles: { label: 'Bottles', icon: GlassWater },
  id_cards: { label: 'ID cards', icon: CreditCard },
  keys: { label: 'Keys', icon: KeyRound },
  accessories: { label: 'Accessories', icon: Watch },
  clothing: { label: 'Clothing', icon: Shirt },
  stationery: { label: 'Stationery', icon: NotebookPen },
  other: { label: 'Other', icon: Package },
};

export const CATEGORY_LIST = Object.keys(CATEGORY_META) as Category[];

export function categoryLabel(c: string) {
  return CATEGORY_META[c as Category]?.label ?? c;
}

export function timeAgo(iso: string) {
  try {
    return `${formatDistanceToNowStrict(new Date(iso))} ago`;
  } catch {
    return '';
  }
}

export function today() {
  // Local date, not UTC — otherwise late-night posts in IST get yesterday's date.
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
