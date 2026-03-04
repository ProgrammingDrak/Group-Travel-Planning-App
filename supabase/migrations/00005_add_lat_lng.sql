-- Add latitude and longitude columns to cards table for geographic grouping
ALTER TABLE cards ADD COLUMN IF NOT EXISTS lat double precision DEFAULT NULL;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS lng double precision DEFAULT NULL;

-- Partial index for geocoded cards
CREATE INDEX IF NOT EXISTS idx_cards_lat_lng ON cards (lat, lng) WHERE lat IS NOT NULL AND lng IS NOT NULL;

-- Update the cards_with_vote_stats view to include lat/lng
DROP VIEW IF EXISTS cards_with_vote_stats;
CREATE VIEW cards_with_vote_stats AS
SELECT
    c.id,
    c.trip_id,
    c.type,
    c.title,
    c.description,
    c.date,
    c.start_time,
    c.duration_minutes,
    c.location,
    c.address,
    c.lat,
    c.lng,
    c.budget,
    c.category,
    c.stage,
    c.is_date_locked,
    c.is_multi_day,
    c.end_date,
    c.images_urls,
    c.icon,
    c.created_by,
    c.sort_order,
    c.created_at,
    c.updated_at,
    COALESCE(ROUND(AVG(v.score)::numeric, 2), 0) AS avg_score,
    COUNT(v.id)::integer AS vote_count
FROM cards c
LEFT JOIN votes v ON v.card_id = c.id
GROUP BY c.id;
