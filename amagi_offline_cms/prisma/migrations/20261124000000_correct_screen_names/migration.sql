UPDATE "Screen"
SET "name" = CASE "name"
    WHEN 'pandora-box' THEN 'Pandora-Box'
    WHEN 'outsidedisplay 01' THEN 'Outside Display 01'
    WHEN 'outside display-02' THEN 'Outside Display-02'
    WHEN 'transparent OLED' THEN 'Transparent OLED'
    WHEN 'teleprompater' THEN 'Teleprompter'
    WHEN 'bradcast big screen' THEN 'Broadcast Big Screen'
    ELSE regexp_replace("name", '^screen ', 'Screen ')
  END,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "name" IN (
  'pandora-box', 'outsidedisplay 01', 'outside display-02',
  'transparent OLED', 'teleprompater', 'bradcast big screen'
) OR "name" ~ '^screen [0-9]+$';
