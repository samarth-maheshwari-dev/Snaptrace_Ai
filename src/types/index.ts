// Shared with the server so the API contract has one source of truth.
export type {
  Category, Claim, ClaimStatus, Descriptor, Item, ItemStatus, ItemType, Match, PublicItem, SessionUser,
} from '../../server/types';
import type { Claim, Item, ClaimStatus, PublicItem } from '../../server/types';

export interface ClaimWithItem extends Claim {
  item?: Item;
}

export interface MyClaim {
  id: string;
  status: ClaimStatus;
  created_at: string;
  item: PublicItem | null;
}

export interface AdminStats {
  total: number;
  openLost: number;
  openFound: number;
  pendingClaims: number;
  resolved: number;
  recoveryRate: number;
  postsLast7Days: { date: string; posted: number }[];
  byCategory: { name: string; value: number }[];
}
