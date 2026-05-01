# Sweetart

Dating app that connects people through art activities — paint together, see live music, shoot a short film, gallery hop. iOS + Android, built with Expo (React Native) and Supabase.

## Project structure

```
sweetart/
├── prototype/              # Clickable HTML prototype (design reference)
│   └── sweetart-prototype.html
├── app/                    # Expo (React Native) app — iOS + Android
├── supabase/               # SQL migrations and Supabase config
└── README.md
```

## Stack

- **Mobile:** Expo (React Native) — single codebase for iOS + Android
- **Backend:** Supabase — Postgres, auth, storage, realtime
- **Photo moderation:** AWS Rekognition
- **Chat:** Stream Chat (free tier up to 10K MAU)
- **Push notifications:** Expo Notifications

## Getting started

```bash
cd app
npm install
npx expo start
```

Press `i` for iOS simulator, `a` for Android, or scan the QR with the Expo Go app on your phone.

## Status

Prototype: ✅ Done — see `prototype/sweetart-prototype.html`
App scaffolding: 🚧 In progress
