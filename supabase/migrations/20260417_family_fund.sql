-- Bảng giao dịch quỹ gia phả
CREATE TABLE IF NOT EXISTS family_fund_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('thu', 'chi')),
  contributor_name text NOT NULL,
  amount bigint NOT NULL CHECK (amount > 0),
  note text,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_family_fund_family_id
  ON family_fund_transactions(family_id);
CREATE INDEX IF NOT EXISTS idx_family_fund_transaction_date
  ON family_fund_transactions(transaction_date DESC);

-- RLS
ALTER TABLE family_fund_transactions ENABLE ROW LEVEL SECURITY;

-- Owner: full access
CREATE POLICY "family_fund_owner_all"
  ON family_fund_transactions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM families
      WHERE families.id = family_fund_transactions.family_id
        AND families.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM families
      WHERE families.id = family_fund_transactions.family_id
        AND families.owner_id = auth.uid()
    )
  );

-- Member/Editor (family_shares): SELECT only
CREATE POLICY "family_fund_member_select"
  ON family_fund_transactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_shares
      WHERE family_shares.family_id = family_fund_transactions.family_id
        AND family_shares.shared_with = auth.uid()
    )
  );
