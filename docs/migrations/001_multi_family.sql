-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 001: Multi-Family Support + Sharing System
-- Chạy toàn bộ file này trong Supabase SQL Editor (Dashboard → SQL Editor)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── BƯỚC 1: Tạo bảng families ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS families (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  owner_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_families_owner_id ON families(owner_id);

-- ── BƯỚC 2: Tạo enum share_role nếu chưa có ────────────────────────────────
DO $$ BEGIN
  CREATE TYPE share_role AS ENUM ('viewer', 'editor', 'admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ── BƯỚC 3: Tạo bảng family_shares ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS family_shares (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id    UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  shared_by    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         share_role NOT NULL DEFAULT 'viewer',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (family_id, shared_with),
  CONSTRAINT no_self_share CHECK (shared_by <> shared_with)
);

CREATE INDEX IF NOT EXISTS idx_family_shares_shared_with ON family_shares(shared_with);
CREATE INDEX IF NOT EXISTS idx_family_shares_family_id ON family_shares(family_id);

-- ── BƯỚC 4: Thêm cột family_id vào các bảng dữ liệu ────────────────────────
ALTER TABLE persons
  ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id) ON DELETE CASCADE;

ALTER TABLE relationships
  ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id) ON DELETE CASCADE;

ALTER TABLE custom_events
  ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id) ON DELETE CASCADE;

ALTER TABLE person_details_private
  ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id) ON DELETE CASCADE;

-- ── BƯỚC 5: Migration data cũ → tạo 1 family mặc định cho admin đầu tiên ───
-- Script tự động tìm admin đầu tiên và gán toàn bộ data hiện tại vào family đó
DO $$
DECLARE
  default_family_id UUID;
  admin_user_id     UUID;
BEGIN
  -- Tìm admin đầu tiên theo thời gian tạo
  SELECT p.id INTO admin_user_id
  FROM profiles p
  WHERE p.role = 'admin'
  ORDER BY p.created_at ASC
  LIMIT 1;

  -- Nếu chưa có admin, lấy user đầu tiên
  IF admin_user_id IS NULL THEN
    SELECT id INTO admin_user_id
    FROM auth.users
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  -- Chỉ tạo family mặc định nếu có data cũ chưa gán family_id
  IF admin_user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM persons WHERE family_id IS NULL LIMIT 1
  ) THEN
    INSERT INTO families (name, description, owner_id)
    VALUES ('Gia phả của tôi', 'Gia phả được tạo tự động khi nâng cấp hệ thống', admin_user_id)
    RETURNING id INTO default_family_id;

    UPDATE persons              SET family_id = default_family_id WHERE family_id IS NULL;
    UPDATE relationships        SET family_id = default_family_id WHERE family_id IS NULL;
    UPDATE custom_events        SET family_id = default_family_id WHERE family_id IS NULL;
    UPDATE person_details_private SET family_id = default_family_id WHERE family_id IS NULL;

    RAISE NOTICE 'Đã tạo family mặc định: % cho user: %', default_family_id, admin_user_id;
  ELSE
    RAISE NOTICE 'Không có data cũ cần migrate, bỏ qua.';
  END IF;
END $$;

-- ── BƯỚC 6: Đặt NOT NULL sau khi migration ──────────────────────────────────
-- Chỉ chạy sau khi xác nhận tất cả rows đã có family_id
-- ALTER TABLE persons                  ALTER COLUMN family_id SET NOT NULL;
-- ALTER TABLE relationships            ALTER COLUMN family_id SET NOT NULL;
-- ALTER TABLE custom_events            ALTER COLUMN family_id SET NOT NULL;
-- ALTER TABLE person_details_private   ALTER COLUMN family_id SET NOT NULL;

-- ── BƯỚC 7: Index cho performance ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_persons_family_id       ON persons(family_id);
CREATE INDEX IF NOT EXISTS idx_relationships_family_id ON relationships(family_id);
CREATE INDEX IF NOT EXISTS idx_custom_events_family_id ON custom_events(family_id);

-- ── BƯỚC 8: Helper functions ─────────────────────────────────────────────────

-- Tìm UUID của user theo email (dùng cho tính năng chia sẻ)
CREATE OR REPLACE FUNCTION get_user_id_by_email(target_email TEXT)
RETURNS UUID AS $$
  SELECT id FROM auth.users
  WHERE lower(trim(email)) = lower(trim(target_email))
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Kiểm tra user có quyền đọc family không
CREATE OR REPLACE FUNCTION can_access_family(fid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM families WHERE id = fid AND owner_id = auth.uid()
    UNION ALL
    SELECT 1 FROM family_shares WHERE family_id = fid AND shared_with = auth.uid()
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Kiểm tra user có quyền ghi vào family không
CREATE OR REPLACE FUNCTION can_write_family(fid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM families WHERE id = fid AND owner_id = auth.uid()
    UNION ALL
    SELECT 1 FROM family_shares
    WHERE family_id = fid
      AND shared_with = auth.uid()
      AND role IN ('editor', 'admin')
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ── BƯỚC 9: View để lấy danh sách share kèm email ───────────────────────────
CREATE OR REPLACE VIEW family_shares_with_email AS
SELECT
  fs.id,
  fs.family_id,
  fs.shared_by,
  fs.shared_with,
  fs.role,
  fs.created_at,
  u.email AS shared_with_email
FROM family_shares fs
JOIN auth.users u ON u.id = fs.shared_with;

-- ── BƯỚC 10: Row Level Security (RLS) ────────────────────────────────────────

ALTER TABLE families              ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_shares         ENABLE ROW LEVEL SECURITY;
ALTER TABLE persons               ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationships         ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE person_details_private ENABLE ROW LEVEL SECURITY;

-- Policies: families
DROP POLICY IF EXISTS "families_select" ON families;
DROP POLICY IF EXISTS "families_insert" ON families;
DROP POLICY IF EXISTS "families_update" ON families;
DROP POLICY IF EXISTS "families_delete" ON families;

CREATE POLICY "families_select" ON families FOR SELECT
  USING (owner_id = auth.uid() OR can_access_family(id));
CREATE POLICY "families_insert" ON families FOR INSERT
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "families_update" ON families FOR UPDATE
  USING (owner_id = auth.uid());
CREATE POLICY "families_delete" ON families FOR DELETE
  USING (owner_id = auth.uid());

-- Policies: family_shares
DROP POLICY IF EXISTS "shares_select" ON family_shares;
DROP POLICY IF EXISTS "shares_insert" ON family_shares;
DROP POLICY IF EXISTS "shares_delete" ON family_shares;

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
  USING (shared_by = auth.uid() OR shared_with = auth.uid());

-- Policies: persons
DROP POLICY IF EXISTS "persons_select" ON persons;
DROP POLICY IF EXISTS "persons_insert" ON persons;
DROP POLICY IF EXISTS "persons_update" ON persons;
DROP POLICY IF EXISTS "persons_delete" ON persons;

CREATE POLICY "persons_select" ON persons FOR SELECT
  USING (family_id IS NULL OR can_access_family(family_id));
CREATE POLICY "persons_insert" ON persons FOR INSERT
  WITH CHECK (can_write_family(family_id));
CREATE POLICY "persons_update" ON persons FOR UPDATE
  USING (can_write_family(family_id));
CREATE POLICY "persons_delete" ON persons FOR DELETE
  USING (can_write_family(family_id));

-- Policies: relationships
DROP POLICY IF EXISTS "relationships_select" ON relationships;
DROP POLICY IF EXISTS "relationships_insert" ON relationships;
DROP POLICY IF EXISTS "relationships_update" ON relationships;
DROP POLICY IF EXISTS "relationships_delete" ON relationships;

CREATE POLICY "relationships_select" ON relationships FOR SELECT
  USING (family_id IS NULL OR can_access_family(family_id));
CREATE POLICY "relationships_insert" ON relationships FOR INSERT
  WITH CHECK (can_write_family(family_id));
CREATE POLICY "relationships_update" ON relationships FOR UPDATE
  USING (can_write_family(family_id));
CREATE POLICY "relationships_delete" ON relationships FOR DELETE
  USING (can_write_family(family_id));

-- Policies: custom_events
DROP POLICY IF EXISTS "events_select" ON custom_events;
DROP POLICY IF EXISTS "events_insert" ON custom_events;
DROP POLICY IF EXISTS "events_update" ON custom_events;
DROP POLICY IF EXISTS "events_delete" ON custom_events;

CREATE POLICY "events_select" ON custom_events FOR SELECT
  USING (family_id IS NULL OR can_access_family(family_id));
CREATE POLICY "events_insert" ON custom_events FOR INSERT
  WITH CHECK (can_write_family(family_id));
CREATE POLICY "events_update" ON custom_events FOR UPDATE
  USING (can_write_family(family_id));
CREATE POLICY "events_delete" ON custom_events FOR DELETE
  USING (can_write_family(family_id));

-- Policies: person_details_private
DROP POLICY IF EXISTS "private_select" ON person_details_private;
DROP POLICY IF EXISTS "private_insert" ON person_details_private;
DROP POLICY IF EXISTS "private_update" ON person_details_private;
DROP POLICY IF EXISTS "private_delete" ON person_details_private;

CREATE POLICY "private_select" ON person_details_private FOR SELECT
  USING (family_id IS NULL OR can_access_family(family_id));
CREATE POLICY "private_insert" ON person_details_private FOR INSERT
  WITH CHECK (can_write_family(family_id));
CREATE POLICY "private_update" ON person_details_private FOR UPDATE
  USING (can_write_family(family_id));
CREATE POLICY "private_delete" ON person_details_private FOR DELETE
  USING (can_write_family(family_id));

-- ── HOÀN TẤT ─────────────────────────────────────────────────────────────────
SELECT 'Migration 001 hoàn tất!' AS status;
