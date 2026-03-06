# QLine V3 (SQLite locale)

## Backend
```bash
cd backend
npm install
npm run dev
```

Health:
- `http://localhost:3000/health`

SQLite:
- fichier base: `backend/data/qline.sqlite`
- toutes les donnees backend passent par SQLite (users, commerces, tickets, events, stats, etat commerce)

Variables utiles:
- `PORT` (default `3000`)
- `DB_PATH` (default `backend/data/qline.sqlite`)
- `JWT_SECRET`

## Mobile (Expo SDK 54)
```bash
cd mobile
npm install
npx expo start -c
```

`mobile/features/config.ts` pointe sur `http://localhost:3000`.

## Comptes seed
- `user@qline.dev / user1234`
- `c1@qline.dev / merchant123`
- `c2@qline.dev / merchant123`
- `c3@qline.dev / merchant123`
