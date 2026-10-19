# Todo

A to-do app that helps people finish their daily tasks on time. One Expo (React Native) codebase ships as:

- **Android app** — run in Expo Go during development, or build an installable APK with EAS.
- **iPhone web app** — a web build that can be added to the iPhone home screen and opens full-screen like an app.

## Features

- Add tasks with a due date (Today, Tomorrow, Next week, or no date) and a priority (low / medium / high)
- **Today**, **Upcoming**, **All** and **Done** views; open tasks sorted by due date, then priority
- Overdue tasks are flagged in red; progress bar for today's tasks
- Tasks are saved on the device (AsyncStorage on Android, browser storage on the web)
- Light and dark mode follow the system setting

## Getting started

```bash
npm install
npm start          # Expo dev server — press "a" for Android, "w" for web
```

| Command | What it does |
| --- | --- |
| `npm run android` | Start and open on a connected Android device/emulator (or scan the QR code in Expo Go) |
| `npm run web` | Start the web version in your browser |
| `npm run build:web` | Export the static web app to `dist/` |
| `npm run build:apk` | Build an installable Android APK with EAS (`npm i -g eas-cli` and `eas login` first) |
| `npm run typecheck` | TypeScript check |

## Using it on iPhone (web app)

1. `npm run build:web` and deploy the `dist/` folder to any static host (Netlify, Vercel, GitHub Pages, Cloudflare Pages…). It must be served over HTTPS.
2. Open the URL in **Safari** on the iPhone.
3. Tap **Share → Add to Home Screen**. The app opens full-screen with its own icon.

For quick testing on the same Wi-Fi, `npm run web` and open the LAN address Expo prints on the iPhone.

## Project structure

```
App.tsx                  Screen layout (header, add-task card, tabs, list)
index.ts                 Entry point
src/
  useTasks.ts            Task state, sorting, filtering, persistence
  storage.ts             AsyncStorage load/save
  dates.ts               Local date keys and due-date labels
  theme.ts               Light/dark colours
  types.ts               Task, Priority, Filter types
  components/
    AddTask.tsx          Task input with due-date and priority chips
    FilterTabs.tsx       Today / Upcoming / All / Done tabs
    TaskItem.tsx         Single task row
public/                  Web-only files: index.html (home-screen meta tags), manifest, icons
assets/                  App icon, Android adaptive icon, favicon
```

## Ideas for next steps

- Reminders with `expo-notifications` (Android)
- Edit a task's title, date and priority
- Custom date/time picker
- Sync across devices (e.g. Supabase)
