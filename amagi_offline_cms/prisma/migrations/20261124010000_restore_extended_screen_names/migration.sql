-- Older numbered-screen migrations predate the custom names for screens 5–10.
-- Preserve the current default convention for numbered screens beyond ten.
UPDATE "Screen"
SET "name" = 'Screen ' || (substring("name" from '[0-9]+$')::integer)::text,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "name" ~ '^Broadcast Sim[0-9]+$'
  AND substring("name" from '[0-9]+$')::integer > 10;
