-- SnapTrace schema. Paste into Supabase > SQL Editor > New query > Run. Safe to re-run.

create table if not exists public.items (
  id              text primary key,
  type            text not null check (type in ('lost', 'found')),
  title           text not null check (char_length(title) between 3 and 80),
  category        text not null,
  location        text not null,
  date_occurred   date not null,
  description     text,
  contact_email   text not null,
  contact_name    text not null,
  image_url       text,
  descriptor_json jsonb,
  embedding       jsonb,          -- Gemini text embedding (256 floats); server-only
  reporter_id     text,           -- Google account id
  status          text not null default 'open' check (status in ('open', 'claimed', 'resolved')),
  created_at      timestamptz not null default now()
);

create table if not exists public.claims (
  id            text primary key,
  item_id       text not null references public.items(id) on delete cascade,
  claimer_id    text not null,
  claimer_name  text not null,
  claimer_email text not null,
  student_id    text not null,
  phone         text,
  proof_text    text not null,
  status        text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at    timestamptz not null default now()
);

create index if not exists items_type_status_idx on public.items (type, status);
create index if not exists claims_item_idx on public.claims (item_id);
create index if not exists claims_claimer_idx on public.claims (claimer_id);

-- Row Level Security ON with NO policies = the public "anon" key can read/write nothing.
-- Only our server, using the service-role key, can access these tables.
alter table public.items  enable row level security;
alter table public.claims enable row level security;

-- Public bucket for item photos (found-item photos are meant to be seen).
-- Search photos are never uploaded here; they stay in server memory.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('item-images', 'item-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
