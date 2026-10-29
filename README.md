# Arogya

Personal health app for Android: Indian food diary with calorie budget, water, Samsung Health vitals (steps, sleep score, energy score, heart rate, SpO2, BP, sugar, weight), medical reports read by AI, an AI coach, weight and yoga.

- UI: `ui/` (plain JS, built into one page by `node build.js`)
- Food data: `data/build_foods.py` → `ui/foods.js` (Indian Nutrient Databank + basics)
- Android shell: `android/` (WebView + Samsung Health Data SDK bridge)
- Every push to `main` builds `arogya.apk` as a GitHub release.

Install: open the latest release on your phone, download `arogya.apk`, open it.
