UPDATE "Screen"
SET "name" = 'Broadcast Sim' || substring("name" from 8),
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "name" ~ '^Screen [0-9]{2,}$';
