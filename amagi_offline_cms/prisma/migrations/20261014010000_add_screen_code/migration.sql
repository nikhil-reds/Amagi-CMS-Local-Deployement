ALTER TABLE "Screen" ADD COLUMN "code" VARCHAR(5);

DO $$
DECLARE
  screen_row RECORD;
  candidate TEXT;
BEGIN
  FOR screen_row IN SELECT "id" FROM "Screen" WHERE "code" IS NULL LOOP
    LOOP
      candidate := lpad((floor(random() * 100000))::int::text, 5, '0');
      EXIT WHEN NOT EXISTS (SELECT 1 FROM "Screen" WHERE "code" = candidate);
    END LOOP;
    UPDATE "Screen" SET "code" = candidate WHERE "id" = screen_row."id";
  END LOOP;
END $$;

ALTER TABLE "Screen" ALTER COLUMN "code" SET NOT NULL;
CREATE UNIQUE INDEX "Screen_code_key" ON "Screen"("code");
