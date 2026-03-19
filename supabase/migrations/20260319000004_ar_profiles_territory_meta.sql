-- Store how the user defined their service area for display purposes
-- Example: { mode: "county", selections: ["Kalamazoo County, MI", "Van Buren County, MI"] }
ALTER TABLE ar_profiles ADD COLUMN IF NOT EXISTS territory_meta JSONB;
