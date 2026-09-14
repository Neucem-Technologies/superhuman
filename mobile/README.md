# LivinSync (iOS + Android)

React Native TypeScript OS. Shared JS in `src/`. Native folders:

- `ios/` — HealthKit (steps, heart rate, workouts; read + write)
- `android/` — Health Connect (same data types)

The **same spine** as the web OS (`../src/spine`) drives every tab, connectors, invites, inbox, command bar, and display settings.

## Surfaces

Today, Work (agenda / tasks / mail), Health (overview, phone, records, meds, peptide calculator, body, mind, workout), Finance, Businesses, Growth, Travel, Enjoy, Shop, Notes, Files, Connectors, Inbox, Settings (type size, glass, contrast, invite, preview-as).

## Setup

```sh
cd mobile
npm install
```

iOS: HealthKit capability, `pod install`, `npm run ios` on a device.  
Android: Health Connect, API 26+, `npm run android`.
