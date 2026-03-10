# QLine V2

## Backend

This backend now requires Postgres and is structured to run on Vercel.

Required environment variables:

- `DATABASE_URL`: Postgres connection string
- `JWT_SECRET`: JWT signing secret

Local run:

```bash
cd backend
npm install
npm start
```

Health check:

```bash
http://localhost:3000/health
```

Seed accounts created automatically on first boot:

- `user@qline.dev / user1234`
- `c1@qline.dev / merchant123`
- `c2@qline.dev / merchant123`
- `c3@qline.dev / merchant123`

Vercel deployment:

1. Create a Postgres database such as Neon.
2. In Vercel, set the project Root Directory to `backend`.
3. Add `DATABASE_URL` and `JWT_SECRET` in Vercel environment variables.
4. Deploy. All routes are served through `backend/api/index.js`.

## Mobile

```bash
cd mobile
npm install
npx expo start -c
```

Set [`config.ts`](C:/Users/antho/OneDrive/Images/Bureau/Qline/QLine_version3_ANTHONY/mobile/features/config.ts) `API_BASE` to your deployed backend URL.
