-- workforce-shift migration
-- Generated manually for OpenSpec change workforce-shift

DO $$ BEGIN
  CREATE TYPE shift_template_status_enum AS ENUM ('draft', 'published', 'archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE shift_templates
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS status shift_template_status_enum NOT NULL DEFAULT 'draft';

ALTER TABLE employee_shift_assignments
  ADD COLUMN IF NOT EXISTS effective_from date,
  ADD COLUMN IF NOT EXISTS effective_to date,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid;

DO $$ BEGIN
  ALTER TABLE employee_shift_assignments
    ADD CONSTRAINT employee_shift_assignments_cancelled_by_fkey
    FOREIGN KEY (cancelled_by) REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_employee_shift_assignments_effective_range
  ON employee_shift_assignments (employee_id, effective_from, effective_to);

CREATE TABLE IF NOT EXISTS shift_roster_publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  published_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_shift_roster_publications_period_range CHECK (period_start <= period_end)
);

CREATE INDEX IF NOT EXISTS idx_shift_roster_publications_company_id
  ON shift_roster_publications (company_id);
CREATE INDEX IF NOT EXISTS idx_shift_roster_publications_department_id
  ON shift_roster_publications (department_id);
CREATE INDEX IF NOT EXISTS idx_shift_roster_publications_period
  ON shift_roster_publications (period_start, period_end);

DO $$ BEGIN
  ALTER TABLE shift_roster_publications
    ADD CONSTRAINT uq_shift_roster_publications_scope_period
    UNIQUE (company_id, branch_id, department_id, period_start, period_end);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
