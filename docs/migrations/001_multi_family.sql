-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION 001: Multi-Family Support + Row Level Security
-- Chạy toàn bộ file này trong Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. Tạo bảng families ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS families (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  owner_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS families_owner_id_idx ON families(owner_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS families_updated_at ON families;
CREATE TRIGGER families_updated_at
  BEFORE UPDATE ON families
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── 2. Tạo bảng family_shares ───────────────────────────────────
DO $$ BEGIN
  CREATE TYPE share_role AS ENUM ('viewer', 'editor', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS family_shares (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id    UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  shared_by    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         share_role NOT NULL DEFAULT 'viewer',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (family_id, shared_with)
);

CREATE INDEX IF NOT EXISTS family_shares_family_id_idx    ON family_shares(family_id);
CREATE INDEX IF NOT EXISTS family_shares_shared_with_idx  ON family_shares(shared_with);

-- ─── 3. Thêm cột family_id vào bảng dữ liệu ─────────────────────
ALTER TABLE persons                ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id) ON DELETE CASCADE;
ALTER TABLE relationships          ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id) ON DELETE CASCADE;
ALTER TABLE custom_events          ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id) ON DELETE CASCADE;
ALTER TABLE person_details_private ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS persons_family_id_idx           ON persons(family_id);
CREATE INDEX IF NOT EXISTS relationships_family_id_idx     ON relationships(family_id);
CREATE INDEX IF NOT EXISTS custom_events_family_id_idx     ON custom_events(family_id);

-- ─── 4. Helper functions cho RLS ─────────────────────────────────
CREATE OR REPLACE FUNCTION can_access_family(fid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM families      WHERE id = fid AND owner_id = auth.uid()
    UNION ALL
    SELECT 1 FROM family_shares WHERE family_id = fid AND shared_with = auth.uid()
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION can_write_family(fid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM families      WHERE id = fid AND owner_id = auth.uid()
    UNION ALL
    SELECT 1 FROM family_shares WHERE family_id = fid AND shared_with = auth.uid()
      AND role IN ('editor', 'admin')
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION can_admin_family(fid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM families      WHERE id = fid AND owner_id = auth.uid()
    UNION ALL
    SELECT 1 FROM family_shares WHERE family_id = fid AND shared_with = auth.uid()
      AND role = 'admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ─── 5. Function tìm user theo email (dùng cho share) ────────────
CREATE OR REPLACE FUNCTION get_user_id_by_email(target_email TEXT)
RETURNS UUID AS $$
  SELECT id FROM auth.users WHERE email = lower(trim(target_email)) LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ─── 6. Bật Row Level Security ───────────────────────────────────
ALTER TABLE families               ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_shares          ENABLE ROW LEVEL SECURITY;
ALTER TABLE persons                ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationships          ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_events          ENABLE ROW LEVEL SECURITY;
ALTER TABLE person_details_private ENABLE ROW LEVEL SECURITY;

-- Drop existing policies nếu có
DROP POLICY IF EXISTS "families_select"        ON families;
DROP POLICY IF EXISTS "families_insert"        ON families;
DROP POLICY IF EXISTS "families_update"        ON families;
DROP POLICY IF EXISTS "families_delete"        ON families;
DROP POLICY IF EXISTS "shares_select"          ON family_shares;
DROP POLICY IF EXISTS "shares_insert"          ON family_shares;
DROP POLICY IF EXISTS "shares_update"          ON family_shares;
DROP POLICY IF EXISTS "shares_delete"          ON family_shares;
DROP POLICY IF EXISTS "persons_select"         ON persons;
DROP POLICY IF EXISTS "persons_insert"         ON persons;
DROP POLICY IF EXISTS "persons_update"         ON persons;
DROP POLICY IF EXISTS "persons_delete"         ON persons;
DROP POLICY IF EXISTS "relationships_select"   ON relationships;
DROP POLICY IF EXISTS "relationships_insert"   ON relationships;
DROP POLICY IF EXISTS "relationships_update"   ON relationships;
DROP POLICY IF EXISTS "relationships_delete"   ON relationships;
DROP POLICY IF EXISTS "events_select"          ON custom_events;
DROP POLICY IF EXISTS "events_insert"          ON custom_events;
DROP POLICY IF EXISTS "events_update"          ON custom_events;
DROP POLICY IF EXISTS "events_delete"          ON custom_events;
DROP POLICY IF EXISTS "private_select"         ON person_details_private;
DROP POLICY IF EXISTS "private_insert"         ON person_details_private;
DROP POLICY IF EXISTS "private_update"         ON person_details_private;
DROP POLICY IF EXISTS "private_delete"         ON person_details_private;

-- Families policies
CREATE POLICY "families_select" ON families FOR SELECT
  USING (owner_id = auth.uid() OR can_access_family(id));
CREATE POLICY "families_insert" ON families FOR INSERT
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "families_update" ON families FOR UPDATE
  USING (can_admin_family(id));
CREATE POLICY "families_delete" ON families FOR DELETE
  USING (owner_id = auth.uid());

-- Family shares policies
CREATE POLICY "shares_select" ON family_shares FOR SELECT
  USING (shared_by = auth.uid() OR shared_with = auth.uid());
CREATE POLICY "shares_insert" ON family_shares FOR INSERT
  WITH CHECK (
    shared_by = auth.uid() AND
    EXISTS (SELECT 1 FROM families WHERE id = family_id AND owner_id = auth.uid())
  );
CREATE POLICY "shares_update" ON family_shares FOR UPDATE
  USING (shared_by = auth.uid());
CREATE POLICY "shares_delete" ON family_shares FOR DELETE
  USING (shared_by = auth.uid());

-- Persons policies
CREATE POLICY "persons_select" ON persons FOR SELECT USING (can_access_family(family_id));
CREATE POLICY "persons_insert" ON persons FOR INSERT WITH CHECK (can_write_family(family_id));
CREATE POLICY "persons_update" ON persons FOR UPDATE USING (can_write_family(family_id));
CREATE POLICY "persons_delete" ON persons FOR DELETE USING (can_write_family(family_id));

-- Relationships policies
CREATE POLICY "relationships_select" ON relationships FOR SELECT USING (can_access_family(family_id));
CREATE POLICY "relationships_insert" ON relationships FOR INSERT WITH CHECK (can_write_family(family_id));
CREATE POLICY "relationships_update" ON relationships FOR UPDATE USING (can_write_family(family_id));
CREATE POLICY "relationships_delete" ON relationships FOR DELETE USING (can_write_family(family_id));

-- Custom events policies
CREATE POLICY "events_select" ON custom_events FOR SELECT USING (can_access_family(family_id));
CREATE POLICY "events_insert" ON custom_events FOR INSERT WITH CHECK (can_write_family(family_id));
CREATE POLICY "events_update" ON custom_events FOR UPDATE USING (can_write_family(family_id));
CREATE POLICY "events_delete" ON custom_events FOR DELETE USING (can_write_family(family_id));

-- Person details private policies  
CREATE POLICY "private_select" ON person_details_private FOR SELECT USING (can_access_family(family_id));
CREATE POLICY "private_insert" ON person_details_private FOR INSERT WITH CHECK (can_write_family(family_id));
CREATE POLICY "private_update" ON person_details_private FOR UPDATE USING (can_write_family(family_id));
CREATE POLICY "private_delete" ON person_details_private FOR DELETE USING (can_write_family(family_id));

-- ─── 7. Migration dữ liệu cũ (chạy SAU khi đã có ít nhất 1 user) ──
-- Thay <ADMIN_USER_ID> bằng UUID thực của admin đầu tiên (xem trong Supabase Auth > Users)
-- Chỉ cần chạy nếu đã có dữ liệu cũ không có family_id
--
-- DO $$
-- DECLARE
--   default_family_id UUID;
--   admin_id UUID := '<ADMIN_USER_ID>';  -- << Thay ở đây
-- BEGIN
--   INSERT INTO families (name, description, owner_id)
--   VALUES ('Gia phả mặc định', 'Dữ liệu được chuyển từ hệ thống cũ', admin_id)
--   RETURNING id INTO default_family_id;
--
--   UPDATE persons                SET family_id = default_family_id WHERE family_id IS NULL;
--   UPDATE relationships          SET family_id = default_family_id WHERE family_id IS NULL;
--   UPDATE custom_events          SET family_id = default_family_id WHERE family_id IS NULL;
--   UPDATE person_details_private SET family_id = default_family_id WHERE family_id IS NULL;
-- END $$;
--
-- Sau khi chạy migration dữ liệu, đặt NOT NULL:
-- ALTER TABLE persons                 ALTER COLUMN family_id SET NOT NULL;
-- ALTER TABLE relationships           ALTER COLUMN family_id SET NOT NULL;
-- ALTER TABLE custom_events           ALTER COLUMN family_id SET NOT NULL;
-- ALTER TABLE person_details_private  ALTER COLUMN family_id SET NOT NULL;
