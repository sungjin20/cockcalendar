/** PostgreSQL reference schema. The crawler can later use this contract through Drizzle or node-postgres. */
export const postgresSchema = `
CREATE TABLE IF NOT EXISTS competitions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL, venue text NOT NULL, region text NOT NULL, start_date date NOT NULL, end_date date NOT NULL, organizer text, description text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS supervisor text;
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS sponsor text;
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS platform_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE TABLE IF NOT EXISTS competition_sources (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), competition_id uuid NOT NULL REFERENCES competitions(id) ON DELETE CASCADE, platform text NOT NULL, source_id text NOT NULL, source_url text, last_crawled_at timestamptz, UNIQUE(platform, source_id));
CREATE TABLE IF NOT EXISTS competition_images (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), competition_id uuid NOT NULL REFERENCES competitions(id) ON DELETE CASCADE, kind text NOT NULL DEFAULT 'poster', image_url text NOT NULL, alt_text text);
CREATE TABLE IF NOT EXISTS competition_documents (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), competition_id uuid NOT NULL REFERENCES competitions(id) ON DELETE CASCADE, name text NOT NULL, file_url text NOT NULL, content_type text, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS crawl_runs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), platform text NOT NULL, started_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz, status text NOT NULL DEFAULT 'running', fetched_count integer NOT NULL DEFAULT 0, imported_count integer NOT NULL DEFAULT 0, error_message text);
CREATE INDEX IF NOT EXISTS competitions_start_date_idx ON competitions(start_date);
CREATE TABLE IF NOT EXISTS collector_settings (id boolean PRIMARY KEY DEFAULT true, interval_hours integer NOT NULL DEFAULT 6, enabled boolean NOT NULL DEFAULT true, baddy_enabled boolean NOT NULL DEFAULT true, wekkuk_enabled boolean NOT NULL DEFAULT true, sponet_enabled boolean NOT NULL DEFAULT true, facecock_enabled boolean NOT NULL DEFAULT true, updated_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE collector_settings ADD COLUMN IF NOT EXISTS baddy_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE collector_settings ADD COLUMN IF NOT EXISTS wekkuk_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE collector_settings ADD COLUMN IF NOT EXISTS sponet_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE collector_settings ADD COLUMN IF NOT EXISTS facecock_enabled boolean NOT NULL DEFAULT true;
CREATE TABLE IF NOT EXISTS collector_logs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), platform text NOT NULL, status text NOT NULL, started_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz, duration_ms integer, added_count integer NOT NULL DEFAULT 0, updated_count integer NOT NULL DEFAULT 0, unchanged_count integer NOT NULL DEFAULT 0, message text, changes jsonb NOT NULL DEFAULT '[]'::jsonb);
`;
