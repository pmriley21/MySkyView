# MySkyView

A personal photo map for sky-view moments. Upload an image from your phone with a title, and the app reads GPS metadata from the file to pin it on the map.

Uploads are processed for web delivery:
- Original file is stored temporarily.
- A web image is generated at max 800px width.
- The temporary original is deleted after processing.

## Local setup

```bash
npm install
npm run dev
```

## Environment variables

Create `.env.local` with:

```bash
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DB
# Optional if using Vercel Postgres integration instead of DATABASE_URL:
# POSTGRES_URL=postgresql://USER:PASSWORD@HOST:PORT/DB?sslmode=require
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

## Notes

- The app accepts `DATABASE_URL` or `POSTGRES_URL`.
- Uploaded web images are written to `public/uploads/sky`.
- Temporary originals are written to `storage/originals` and deleted after processing.
- Photos must include GPS metadata (latitude and longitude) to be accepted.