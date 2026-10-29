UPDATE "ScreenAsset" AS a
SET "controls" = a."controls" || jsonb_build_object('positionAt', floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint)
FROM "Document" AS d
WHERE a."documentId" = d."id"
  AND (d."mimeType" LIKE 'video/%' OR d."mimeType" LIKE 'audio/%')
  AND COALESCE((a."controls"->>'positionAt')::bigint, 0) = 0;
