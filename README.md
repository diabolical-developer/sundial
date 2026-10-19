# Sundial

A to-do app that lays your day out along the sun's path, so you always know what's next and how much of the day is left.

One Expo (React Native) codebase ships as:

- **Android app**: run it in Expo Go while developing, or build an installable APK with EAS.
- **iPhone web app**: a web build you add to the iPhone home screen. It opens full-screen with its own icon.

## What makes it different

- **A living sky.** The header follows the real time of day (dawn, day, dusk, night): stars twinkle and the odd shooting star crosses at night, clouds drift by day, and layered hills melt into the page. A sun with turning rays moves along an arc from 6 am to 10 pm, and today's timed tasks sit on that arc as markers. Green means done, red means late, white means still to come, and the next task pulses. Tap a marker to open its task.
- **Built for night owls.** After 10 pm the arc becomes the moon's path (10 pm to 6 am) with tonight's tasks on it, and a **Late night** section holds anything after 10 pm. The day turns over at 4 am, not midnight, so a 1 am task still counts as tonight: it shows under today, sorts after 11 pm, and isn't late at 12:05. By day, a small moon tag counts what's planned for after 10 pm.
- **Up next.** One card always shows the single thing to do now, with a countdown ("in 25 min", "40 min late") and two buttons: Start focus and Done.
- **Type it like you'd say it.** In "Call mom tomorrow at 6pm !" the app picks out the day, the time and the high priority as you type, and shows each one as a chip.
- **Swipe to finish.** Swipe right to finish a task, swipe left to delete it, and undo either from the toast.
- **Focus mode.** A full-screen timer (15/25/45/60 min) whose glow breathes slowly while it runs. Focus time is saved on the task.
- **Slipped tasks.** Tasks left over from earlier days stay visible until you finish them or move them to today in one tap.
- **Repeating tasks.** Daily, weekdays or weekly. Finish one and the next appears on its next day; miss one and it rolls forward instead of piling up.
- **Streak calendar.** Tap the streak pill in the header. Cleared days glow as suns and consecutive ones join into a chain; part-done days show a progress ring. Your current and best streak, clear days this month and focus time sit on top, and tapping a day shows how it went. Day records are kept even after you clear finished tasks.
- **Android home-screen widgets.** *Sundial: Today* is a resizable window onto today's sky (sun or moon at the current time, tasks on the arc) with your progress and next tasks. Tick tasks off right on the home screen; **+** opens quick add. *Sundial: Streak* is a 2×2 sun showing your streak, ringed by today's progress. See [Widgets](#android-widgets).
- **Streaks.** Finishing the whole day sets off a burst of confetti and keeps your streak going.
- **Reminders** (installed Android/iOS app only) at the task's time, or at 9 am on the day when it has no time.
- Light and dark mode, haptics on Android, and the system's reduced-motion setting is respected.

## Getting started

```bash
npm install
npm start          # press "a" for Android (Expo Go), "w" for web
```

| Command | What it does |
| --- | --- |
| `npm run android` | Open on an Android device or emulator, or scan the QR code with Expo Go |
| `npm run web` | Run the web version in your browser |
| `npm run build:web` | Export the static web app to `dist/` |
| `npm run build:apk` | Build an installable APK with EAS (`npm i -g eas-cli`, then `eas login` first) |
| `npm run typecheck` | TypeScript check |

> Reminders need the installed app (the APK). Expo Go on Android can't schedule notifications, so the reminder switch is hidden there.

## iPhone (web app)

1. `npm run build:web`, then deploy `dist/` to any HTTPS static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages).
2. Open the URL in Safari on the iPhone and tap **Share → Add to Home Screen**.

## Android widgets

Widgets are native, so they only exist in an installed build (not Expo Go and not the web app):

```bash
npm run build:apk
```

Install the APK, then long-press the home screen → **Widgets** → **Sundial**. The widgets redraw whenever the app changes something, and every 30 minutes on their own so the sun keeps moving. Ticks made on the widget are picked up the next time the app opens. Widget code lives in `src/widget/` (built with [react-native-android-widget](https://github.com/sAleksovski/react-native-android-widget)); taps open the app through `sundial://add`, `sundial://task/<id>` and `sundial://calendar`.

## Previewing other times of day

In development, open the web build with `?at=HH:MM` (for example `http://localhost:8081/?at=23:30`) to see the sky, greetings and late-night behaviour at that time. Add `?splash` to keep the loading animation (a canvas-drawn sunrise over mountains and a lake, in `public/index.html`) on screen.

## Quick-add phrases

| You type | It sets |
| --- | --- |
| `today`, `tonight`, `tomorrow`, `tmrw`, `friday`, `on mon`, `next week`, `this weekend`, `in 3 days`, `someday` | Day |
| `7am`, `6:30pm`, `at 5` (afternoon), `17:30`, `noon`, `morning`, `evening`, `in 30 min`, `in 2 hours` | Time |
| `!`, `!!`, `urgent`, `important`, `!low` | Priority |
| `every day`, `daily`, `weekdays`, `every friday`, `weekly` | Repeat |
| `midnight`, `11:30pm`, `1am` | Late-night times (count as tonight) |

## Design system

| Token | Value | Use |
| --- | --- | --- |
| Midnight | `#17143A` | Text, Up next card |
| Haze | `#ECEEF7` | Light background |
| Sol | `#FFC21A` | Sun, main buttons |
| Iris | `#5B45F5` | Selection |
| Leaf | `#1C9A63` | Done |
| Ember | `#E5432E` | Late, delete |

Type: **Bricolage Grotesque** for display, **Figtree** for text. Sheets drop down from the top of the screen, so the keyboard never covers what you're typing.

## Project structure

```
App.tsx                      Fonts, providers, onboarding gate
src/
  Home.tsx                   Main screen: sky, Up next, tabs, lists, overlays
  store.tsx                  Tasks + settings, persistence, streaks, undo, reminder sync
  parse.ts                   Natural-language quick add
  select.ts                  Today / Upcoming / Done views, "up next" logic
  time.ts                    Dates, times, day window (6 am–10 pm), 4 am rollover
  repeat.ts                  Repeating tasks (one open occurrence per series)
  snapshot.ts                Saved data shared by the app and the widgets
  theme.ts                   Colours, sky phases, fonts
  reminders.ts               Local notifications (installed app only)
  haptics.ts, useNow.ts
  components/
    SkyScene.tsx             Animated sky: stars, shooting star, clouds, glow, hills
    SkyHero.tsx, SunArc.tsx  Header, and the sun's (or moon's) path
    StreakCalendar.tsx       Streak calendar and stats
    NextUp.tsx               The one-thing-now card
    TaskRow.tsx              Swipe, tick and strike-through animations
    CheckCircle.tsx, Section.tsx, Tabs.tsx, ProgressRing.tsx
    TopSheet.tsx             Drop-down sheet used by add and edit
    Composer.tsx             New task with live parsing
    TaskSheet.tsx            Edit, move, focus, delete
    ScheduleFields.tsx       Day strip, time presets, priority, reminder
    FocusMode.tsx            Full-screen timer
    Confetti.tsx, Toast.tsx, AddButton.tsx, Onboarding.tsx, EmptyState.tsx
  ui/                        Icons, motion (incl. ambient loops), press animation, UI context
  widget/                    Android home-screen widgets: layout, sky artwork, data, handler
public/                      Web-only: index.html (home-screen tags), manifest, icons
```

Tasks saved by the first version of the app are carried over automatically.
