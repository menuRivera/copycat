CREATE DATABASE IF NOT EXISTS copycat;

CREATE TABLE IF NOT EXISTS copycat.events (
  project_id UUID,
  event_type LowCardinality(String),
  page String,
  section String,
  element String,
  duration_ms Float64,
  ts DateTime
)
ENGINE = MergeTree
ORDER BY (project_id, event_type, ts);
