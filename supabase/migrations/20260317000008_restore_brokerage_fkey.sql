-- Restore the FK on brokerage_id since both tables are in the same DB.
-- The earlier migration accidentally dropped this along with the auth.users FK.
ALTER TABLE ar_profiles
  ADD CONSTRAINT ar_profiles_brokerage_id_fkey
  FOREIGN KEY (brokerage_id) REFERENCES ar_brokerages(id);
