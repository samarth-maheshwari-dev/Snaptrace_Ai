export interface Item {
  id: string;
  type: 'lost' | 'found';
  title: string;
  category: string;
  location: string;
  date_occurred: string;
  description?: string;
  contact_email: string;
  contact_name: string;
  image_url?: string;
  descriptor_json?: any;
  status: 'open' | 'claimed' | 'resolved';
  created_at: string;
}

export interface Claim {
  id: string;
  item_id: string;
  claimer_name: string;
  claimer_email: string;
  student_id: string;
  phone?: string;
  proof_text: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface MatchResult {
  item: Item;
  score: number;
}
