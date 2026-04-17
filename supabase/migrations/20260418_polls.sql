-- Bảng vote (polls)
create table if not exists public.polls (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references public.families(id) on delete cascade,
  author_id   uuid not null references auth.users(id) on delete cascade,
  question    text not null,
  options     jsonb not null default '[]',   -- mảng string: ["Lựa chọn 1","Lựa chọn 2"]
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

-- Bảng lượt vote (poll_votes)
create table if not exists public.poll_votes (
  id          uuid primary key default gen_random_uuid(),
  poll_id     uuid not null references public.polls(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  option_index integer not null,
  created_at  timestamptz not null default now(),
  unique(poll_id, user_id)   -- mỗi người chỉ vote 1 lần
);

-- Index
create index if not exists polls_family_id_idx on public.polls(family_id);
create index if not exists poll_votes_poll_id_idx on public.poll_votes(poll_id);

-- RLS
alter table public.polls enable row level security;
alter table public.poll_votes enable row level security;

-- polls: thành viên gia phả có thể xem
create policy "polls_select" on public.polls for select
  using (
    family_id in (
      select id from public.families where owner_id = auth.uid()
      union
      select family_id from public.family_shares where shared_with = auth.uid()
    )
  );

-- polls: owner/admin gia phả mới được tạo
create policy "polls_insert" on public.polls for insert
  with check (
    author_id = auth.uid() and (
      family_id in (select id from public.families where owner_id = auth.uid())
      or family_id in (select family_id from public.family_shares where shared_with = auth.uid() and role = 'admin')
    )
  );

-- polls: chỉ tác giả mới được xoá
create policy "polls_delete" on public.polls for delete
  using (author_id = auth.uid());

-- poll_votes: thành viên có thể xem
create policy "poll_votes_select" on public.poll_votes for select
  using (
    poll_id in (
      select id from public.polls where family_id in (
        select id from public.families where owner_id = auth.uid()
        union
        select family_id from public.family_shares where shared_with = auth.uid()
      )
    )
  );

-- poll_votes: thành viên có thể vote
create policy "poll_votes_insert" on public.poll_votes for insert
  with check (
    user_id = auth.uid() and
    poll_id in (
      select id from public.polls where family_id in (
        select id from public.families where owner_id = auth.uid()
        union
        select family_id from public.family_shares where shared_with = auth.uid()
      )
      and expires_at > now()
    )
  );

-- poll_votes: chỉ bản thân mới xoá vote của mình
create policy "poll_votes_delete" on public.poll_votes for delete
  using (user_id = auth.uid());
