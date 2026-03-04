# QLine V2 (User vs Merchant distinct + QR)

## Backend
```bash
cd backend
npm install
npm run dev
```
Test: http://localhost:3000/health -> {"ok":true}

Accounts (seed):
- User: user@qline.dev / user1234
- Merchant c1: c1@qline.dev / merchant123
- Merchant c2: c2@qline.dev / merchant123
- Merchant c3: c3@qline.dev / merchant123

## Mobile
```bash
cd mobile
npm install
npx expo start -c
```

Phone real: edit `mobile/features/config.ts` API_BASE -> your PC LAN IP.

QR formats:
- c1
- qline://join?commerceId=c2
- https://qline.app/join?commerceId=c3
