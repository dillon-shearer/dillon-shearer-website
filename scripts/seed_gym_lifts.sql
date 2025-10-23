-- Clean last 15 days; cast in case "timestamp" is text
DELETE FROM gym_lifts
WHERE ("timestamp"::timestamptz) >= (now() - INTERVAL '15 days');

-- Create table if needed (adjust if your schema differs)
CREATE TABLE IF NOT EXISTS gym_lifts (
  id UUID PRIMARY KEY,
  date DATE NOT NULL,
  exercise TEXT NOT NULL,
  weight NUMERIC NOT NULL,
  reps INT NOT NULL,
  set_number INT NOT NULL,
  "timestamp" TIMESTAMPTZ NOT NULL,   -- quoted to avoid keyword issues
  day_tag TEXT,
  is_unilateral BOOLEAN DEFAULT FALSE
);

-- Create table if needed (adjust if your schema differs)
CREATE TABLE IF NOT EXISTS gym_lifts (
  id UUID PRIMARY KEY,
  date DATE NOT NULL,
  exercise TEXT NOT NULL,
  weight NUMERIC NOT NULL,
  reps INT NOT NULL,
  set_number INT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  day_tag TEXT,
  is_unilateral BOOLEAN DEFAULT FALSE
);

WITH days AS (
  SELECT generate_series((CURRENT_DATE - INTERVAL '13 days')::date, CURRENT_DATE::date, INTERVAL '1 day')::date AS d
),
day_plan AS (
  SELECT
    d,
    CASE (EXTRACT(DOW FROM d)::int % 3)
      WHEN 0 THEN 'push'
      WHEN 1 THEN 'pull'
      ELSE 'legs'
    END AS day_tag,
    CASE
      WHEN EXTRACT(DOW FROM d) IN (2,4) THEN 19  -- Tue/Thu evening
      WHEN EXTRACT(DOW FROM d) IN (1,3) THEN 7   -- Mon/Wed morning
      ELSE 16                                    -- others afternoon
    END AS start_hour
  FROM days
),
exercises AS (
  SELECT 'Barbell Bench Press' AS ex, 'push' AS tag, 95 AS base_w UNION ALL
  SELECT 'Overhead Press',       'push', 75 UNION ALL
  SELECT 'Incline DB Press',     'push', 50 UNION ALL
  SELECT 'Barbell Row',          'pull', 95 UNION ALL
  SELECT 'Lat Pulldown',         'pull', 110 UNION ALL
  SELECT 'Seated Cable Row',     'pull', 100 UNION ALL
  SELECT 'Back Squat',           'legs', 185 UNION ALL
  SELECT 'Romanian Deadlift',    'legs', 155 UNION ALL
  SELECT 'Walking Lunge',        'legs', 40
),
session_rows AS (
  SELECT
    dp.d AS session_date,
    dp.day_tag,
    dp.start_hour,
    ARRAY(SELECT ex FROM exercises e WHERE e.tag = dp.day_tag LIMIT 3) AS chosen_ex
  FROM day_plan dp
),
sets AS (
  SELECT
    -- proper v4 UUID without extensions
    (
      lower(
        substr(md5(random()::text), 1, 8) || '-' ||
        substr(md5(random()::text), 9, 4) || '-' ||
        '4' || substr(md5(random()::text), 13, 3) || '-' ||
        substr('89ab', floor(random()*4)::int + 1, 1) || substr(md5(random()::text), 17, 3) || '-' ||
        substr(md5(random()::text), 21, 12)
      )
    )::uuid AS id,
    sr.session_date::date AS date,
    sr.day_tag,
    chosen.exercise,
    s.set_number AS set_number,
    -- join provides base_w (no scalar subquery)
    GREATEST(0,
      ROUND(
        ex.base_w::numeric
        * (CASE WHEN sr.start_hour >= 18 THEN 1.03 WHEN sr.start_hour < 9 THEN 0.97 ELSE 1.00 END)
        * (1.00 + ((EXTRACT(DOY FROM sr.session_date)::int % 7 - 3) * 0.005))
      )
    )::numeric AS weight,
    (8 + ((EXTRACT(DOY FROM sr.session_date)::int + s.set_number) % 3))::int AS reps,
    (
      (sr.session_date::timestamp AT TIME ZONE 'UTC')
      + make_interval(hours => sr.start_hour)
      + make_interval(mins  => ((EXTRACT(DOY FROM sr.session_date)::int * 17 + s.set_number*5) % 30))
    ) AS timestamp,
    FALSE AS is_unilateral
  FROM session_rows sr
  -- explode the 3 exercises we picked for the day_tag
  CROSS JOIN LATERAL UNNEST(sr.chosen_ex) AS chosen(exercise)
  -- bring in base_w by joining on the exercise name
  JOIN exercises ex
    ON ex.ex = chosen.exercise
  -- generate 3 sets per exercise
  CROSS JOIN LATERAL (VALUES (1),(2),(3)) AS s(set_number)
)
INSERT INTO gym_lifts (id, date, exercise, weight, reps, set_number, timestamp, day_tag, is_unilateral)
SELECT id, date, exercise, weight, reps, set_number, timestamp, day_tag, is_unilateral
FROM sets;
