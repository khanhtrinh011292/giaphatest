-- ── 1. Create family_share_links Table ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS family_share_links (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id   UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE,
  created_by  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        share_role NOT NULL DEFAULT 'viewer',
  expires_at  TIMESTAMPTZ,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_family_share_links_token ON family_share_links(token);
CREATE INDEX IF NOT EXISTS idx_family_share_links_family_id ON family_share_links(family_id);

-- ── 2. Enable RLS on family_share_links ──────────────────────────────────────
ALTER TABLE family_share_links ENABLE ROW LEVEL SECURITY;

-- ── 3. Policies for family_share_links ───────────────────────────────────────
DROP POLICY IF EXISTS "links_select" ON family_share_links;
CREATE POLICY "links_select" ON family_share_links FOR SELECT
  USING (
    is_active = true AND (expires_at IS NULL OR expires_at > now())
    OR EXISTS (SELECT 1 FROM families WHERE id = family_id AND (owner_id = auth.uid() OR can_access_family(id)))
  );

DROP POLICY IF EXISTS "links_insert" ON family_share_links;
CREATE POLICY "links_insert" ON family_share_links FOR INSERT
  WITH CHECK (can_write_family(family_id));

DROP POLICY IF EXISTS "links_update" ON family_share_links;
CREATE POLICY "links_update" ON family_share_links FOR UPDATE
  USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM families WHERE id = family_id AND owner_id = auth.uid()));

DROP POLICY IF EXISTS "links_delete" ON family_share_links;
CREATE POLICY "links_delete" ON family_share_links FOR DELETE
  USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM families WHERE id = family_id AND owner_id = auth.uid()));

-- ── 4. Update family_shares RLS for Admin Invites ───────────────────────────
-- Previous policy "shares_insert" only allowed owner_id = auth.uid()
DROP POLICY IF EXISTS "shares_insert" ON family_shares;
CREATE POLICY "shares_insert" ON family_shares FOR INSERT
  WITH CHECK (
    shared_by = auth.uid() AND
    (
      EXISTS (SELECT 1 FROM families WHERE id = family_id AND owner_id = auth.uid())
      OR
      EXISTS (SELECT 1 FROM family_shares WHERE family_id = family_id AND shared_with = auth.uid() AND role = 'admin')
    )
  );

-- Allow owner/admins to revoke shares
DROP POLICY IF EXISTS "shares_delete" ON family_shares;
CREATE POLICY "shares_delete" ON family_shares FOR DELETE
  USING (
    shared_by = auth.uid() 
    OR shared_with = auth.uid()
    OR EXISTS (SELECT 1 FROM families WHERE id = family_id AND owner_id = auth.uid())
  );
