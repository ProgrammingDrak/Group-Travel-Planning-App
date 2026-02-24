-- Add budget_type to trips table
-- 'total' = total_budget is the overall group budget
-- 'per_person' = total_budget is the per-person budget

ALTER TABLE trips
  ADD COLUMN budget_type TEXT NOT NULL DEFAULT 'total'
  CHECK (budget_type IN ('total', 'per_person'));
