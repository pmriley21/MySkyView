import { NextResponse } from "next/server";
import { ensureSchema, getSql, unwrapRows } from "@/lib/db";

export async function GET() {
  try {
    await ensureSchema();
    const sql = getSql();

    const result = await sql`
      SELECT
        id,
        title,
        image_url,
        latitude,
        longitude,
        captured_at,
        created_at
      FROM sky_views
      ORDER BY captured_at DESC NULLS LAST, created_at DESC
      LIMIT 200;
    `;

    const rows = unwrapRows(result);
    return NextResponse.json({ locations: rows });
  } catch (error) {
    console.error("Failed to load sky views", error);
    return NextResponse.json(
      { error: "Unable to load sky views right now." },
      { status: 500 }
    );
  }
}
