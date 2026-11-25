import { NextResponse } from 'next/server'

// Retained as a compatibility response for stale clients. New uploads use /api/upload.
export async function POST() {
  return NextResponse.json({ error: 'Cloudinary uploads have been disabled; use /api/upload.' }, { status: 410 })
}
