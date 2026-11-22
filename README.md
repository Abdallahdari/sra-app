# SRA mobile app

An Android and iOS app for the Somali Researchers Association (sra.so). It uses the site's design and its real content, and has an admin login and dashboard for posting research, events and every other section that changes.

```
sra-app/
  backend/   Node.js API: Fastify + MongoDB, admin login, image pipeline, sra.so importer
  mobile/    Expo (React Native) app for Android and iOS, including the admin dashboard
```

## How it works

| Piece | Choice | Why |
|---|---|---|
| App | Expo SDK 58, React Native, TypeScript, Expo Router | One codebase for Android and iOS, and builds without Xcode or Android Studio (EAS) |
| Speed | TanStack Query cache saved to the device, `expo-image` disk cache, FlashList, shimmer skeletons | Screens show the last data at once (even offline), then refresh in the background |
| API | Fastify + Mongoose, gzip, one `/api/home` request for the whole home screen | The home screen loads in a single small response (~11 KB) |
| Images | Every image is resized to at most 1200px and saved as WebP, with a content-hash file name and a 1-year cache | Small downloads; phones never re-download an image |
| Admin | JWT login (bcrypt, rate-limited), token kept in the iOS Keychain or Android Keystore | Only staff accounts can post |

All dynamic sections share one MongoDB collection (`contents`, with a `type` field). The form for each type is defined once in `backend/src/types.js`. The app's admin editor builds its forms from that file, so adding a field there is all it takes.

| Section | Type | Imported from sra.so |
|---|---|---|
| Flash cards | `insight` | 111 posts |
| News & policy impact | `story` | 7 posts |
| Research & publications | `research` | 37 (research library) |
| Projects | `project` | 14 (projects & assignments) |
| Events | `event` | Researchers' Night 2024, 2025, 2026 |
| Podcast episodes | `episode` | 42 (Cilmi iyo Cod, titles from YouTube) |
| Videos | `video` | 104 narrated flash card videos + 9 event videos |
| Researchers | `researcher` | 37 network researchers + 36 podcast guests |
| Fuel prices | `fuel` | empty on sra.so too; admins post weekly prices |
| Services | `service` | 8 |
| Partners & clients | `partner` | 8 logos + 2 university MoUs |
| Site settings | `settings` | Hero, numbers, regions, contact, social links, about text |

## Run it locally

You need Node.js 20 or newer.

```bash
# 1. Backend
cd backend
npm install
cp .env.example .env          # then fill in JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm run db                    # terminal 1: local MongoDB (data kept in backend/data/db)
npm run fetch:wp              # downloads sra.so content into data/raw (slow: the WordPress API is slow)
npm run import                # loads it into MongoDB and downloads images
npm run seed:admin            # creates the admin account from .env
npm run dev                   # terminal 2: API on http://localhost:4000

# 2. App
cd ../mobile
npm install
npx expo start                # scan the QR code with Expo Go, or press a / i / w
```

A phone on the same Wi-Fi finds the backend automatically, using your computer's IP on port 4000. To sign in as admin: **More → Admin sign in**.

Re-running `npm run import` only adds new items and never overwrites admin edits. `npm run import -- --refresh` re-applies sra.so data to the items that came from sra.so.

## Tests and checks

```bash
cd backend && npm test             # API tests on an in-memory database
cd mobile && npx tsc --noEmit && npx expo lint && npx expo-doctor
```

## Going to production

1. **Database:** create a MongoDB Atlas cluster and set `MONGODB_URI`.
2. **API:** deploy `backend/` to any Node host (Render, Railway, Fly.io or a VPS). Set `NODE_ENV=production`, a long random `JWT_SECRET`, and `UPLOADS_DIR` on a persistent disk, or move uploads to S3 or Cloudflare R2. Put it behind HTTPS (for example `https://api.sra.so`).
3. **App:** set `EXPO_PUBLIC_API_URL=https://api.sra.so`, then:
   ```bash
   npx eas-cli@latest build --platform all
   npx eas-cli@latest submit
   ```
4. Publishing under the SRA name and branding in the App Store and Google Play needs SRA's permission and their developer accounts.
