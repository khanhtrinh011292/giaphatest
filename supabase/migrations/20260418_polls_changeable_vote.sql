-- Cho phép UPDATE option_id trên poll_votes (đổi vote)
create policy "poll_votes_update" on public.poll_votes for update
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid() and
    poll_id in (
      select id from public.polls where expires_at > now()
    )
  );
