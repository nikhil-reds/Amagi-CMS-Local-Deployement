ALTER TABLE "Screen" DROP CONSTRAINT IF EXISTS "Screen_playlistId_fkey";
ALTER TABLE "PlaylistItem" DROP CONSTRAINT IF EXISTS "PlaylistItem_playlistId_fkey";
ALTER TABLE "PlaylistItem" DROP CONSTRAINT IF EXISTS "PlaylistItem_documentId_fkey";

ALTER TABLE "Screen" DROP COLUMN IF EXISTS "playlistId";

DROP TABLE IF EXISTS "PlaylistItem";
DROP TABLE IF EXISTS "Playlist";
