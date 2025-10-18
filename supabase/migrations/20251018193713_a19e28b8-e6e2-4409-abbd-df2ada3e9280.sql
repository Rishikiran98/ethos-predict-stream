-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create a cron job to ingest crime data every 5 minutes
SELECT cron.schedule(
  'ingest-crime-data-every-5-min',
  '*/5 * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://feltwsxfnsvtnjqgmvie.supabase.co/functions/v1/ingest-crime-data',
        headers:='{"Content-Type": "application/json"}'::jsonb,
        body:=concat('{"timestamp": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);