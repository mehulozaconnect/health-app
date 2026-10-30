package com.mehul.arogya;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

/** Medicine reminders: one alarm at the next due time; the notification's Taken button logs the dose without opening the app. */
public class MedReceiver extends BroadcastReceiver {
    static final String CH = "meds_v2", FIRE = "com.mehul.arogya.MED_FIRE", TAKE = "com.mehul.arogya.MED_TAKE", SNOOZE = "com.mehul.arogya.MED_SNOOZE", SKIP = "com.mehul.arogya.MED_SKIP";
    static final int NID = 4200;

    static SharedPreferences prefs(Context c) { return c.getSharedPreferences("meds", Context.MODE_PRIVATE); }

    static JSONObject cfg(Context c) {
        try { return new JSONObject(prefs(c).getString("cfg", "{}")); } catch (Exception e) { return new JSONObject(); }
    }

    /** dose keys already handled for a date: what the app reported plus Taken taps not yet picked up */
    static boolean done(Context c, String date, String key) {
        JSONObject o = cfg(c);
        if (date.equals(o.optString("date"))) {
            JSONArray d = o.optJSONArray("done");
            if (d != null) for (int i = 0; i < d.length(); i++) if (key.equals(d.optString(i))) return true;
        }
        try {
            JSONArray a = new JSONArray(prefs(c).getString("adds", "[]"));
            for (int i = 0; i < a.length(); i++) { JSONObject x = a.getJSONObject(i); if (date.equals(x.optString("date")) && key.equals(x.optString("key"))) return true; }
        } catch (Exception ignored) { }
        return false;
    }

    static boolean dueOn(JSONObject m, LocalDate d) {
        String ds = d.toString(), st = m.optString("start"), en = m.optString("end");
        if (!st.isEmpty() && ds.compareTo(st) < 0) return false;
        if (!en.isEmpty() && ds.compareTo(en) > 0) return false;
        int every = m.optInt("every", 1);
        if (every > 1) {
            LocalDate s = st.isEmpty() ? d : LocalDate.parse(st);
            return ChronoUnit.DAYS.between(s, d) % every == 0;
        }
        JSONArray days = m.optJSONArray("days");
        if (days == null || days.length() == 0) return true;
        int dow = d.getDayOfWeek().getValue() % 7; // Sunday = 0, as in the app
        for (int i = 0; i < days.length(); i++) if (days.optInt(i) == dow) return true;
        return false;
    }

    /** next time something is due (not yet taken), and the dose keys due then */
    static void schedule(Context c) {
        cx = c.getApplicationContext();
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        PendingIntent old = PendingIntent.getBroadcast(c, 20, new Intent(c, MedReceiver.class).setAction(FIRE), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        am.cancel(old);
        JSONArray doses = cfg(c).optJSONArray("doses");
        if (doses == null || doses.length() == 0) return;
        LocalDateTime now = LocalDateTime.now(), best = null;
        List<String> keys = new ArrayList<>();
        for (int dd = 0; dd < 8 && best == null; dd++) {
            LocalDate day = now.toLocalDate().plusDays(dd);
            for (int i = 0; i < doses.length(); i++) {
                JSONObject m = doses.optJSONObject(i);
                if (m == null || !dueOn(m, day)) continue;
                JSONArray times = m.optJSONArray("times");
                if (times == null) continue;
                for (int j = 0; j < times.length(); j++) {
                    String tm = times.optString(j);
                    String[] p = tm.split(":");
                    LocalDateTime at;
                    try { at = day.atTime(Integer.parseInt(p[0]), Integer.parseInt(p[1])); } catch (Exception e) { continue; }
                    if (!at.isAfter(now)) continue;
                    String key = m.optString("id") + "|" + tm;
                    if (done(c, day.toString(), key)) continue;
                    if (best == null || at.isBefore(best)) { best = at; keys.clear(); keys.add(key); }
                    else if (at.isEqual(best)) keys.add(key);
                }
            }
        }
        if (best == null) return;
        Intent it = new Intent(c, MedReceiver.class).setAction(FIRE).putExtra("keys", String.join(",", keys)).putExtra("date", best.toLocalDate().toString());
        PendingIntent pi = PendingIntent.getBroadcast(c, 20, it, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        set(am, best.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli(), pi);
    }

    static Context cx;
    static void set(AlarmManager am, long when, PendingIntent pi) {
        try {
            if (Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms()) {
                PendingIntent show = PendingIntent.getActivity(cx, 27, new Intent(cx, MainActivity.class).putExtra("route", "meds"), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                am.setAlarmClock(new AlarmManager.AlarmClockInfo(when, show), pi);
            }
            else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, when, pi);
        } catch (SecurityException e) { am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, when, pi); }
    }

    static void channel(Context c) {
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm.getNotificationChannel(CH) == null) {
            NotificationChannel ch = new NotificationChannel(CH, "Medicine reminders", NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription("Time to take a medicine");
            ch.enableVibration(true);
            ch.setVibrationPattern(new long[]{0, 400, 250, 400, 250, 600});
            ch.enableLights(true);
            ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            ch.setSound(android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_NOTIFICATION),
                    new android.media.AudioAttributes.Builder().setUsage(android.media.AudioAttributes.USAGE_NOTIFICATION_EVENT).setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
            nm.createNotificationChannel(ch);
        }
    }

    @Override
    public void onReceive(Context c, Intent i) {
        cx = c.getApplicationContext();
        String a = i.getAction(), keys = i.getStringExtra("keys"), date = i.getStringExtra("date");
        if ((TAKE.equals(a) || SKIP.equals(a)) && keys != null) {
            if (keys.startsWith("test")) { c.getSystemService(NotificationManager.class).cancel(NID); return; }
            try {
                JSONArray arr = new JSONArray(prefs(c).getString("adds", "[]"));
                for (String k : keys.split(",")) arr.put(new JSONObject().put("key", k).put("date", date).put("t", System.currentTimeMillis()).put("s", TAKE.equals(a) ? "taken" : "skip"));
                prefs(c).edit().putString("adds", arr.toString()).apply();
            } catch (Exception ignored) { }
            c.getSystemService(NotificationManager.class).cancel(NID);
            schedule(c);
            return;
        }
        if (SNOOZE.equals(a) && keys != null && keys.startsWith("test")) { c.getSystemService(NotificationManager.class).cancel(NID); return; }
        if (SNOOZE.equals(a) && keys != null) {
            c.getSystemService(NotificationManager.class).cancel(NID);
            Intent it = new Intent(c, MedReceiver.class).setAction(FIRE).putExtra("keys", keys).putExtra("date", date);
            set((AlarmManager) c.getSystemService(Context.ALARM_SERVICE), System.currentTimeMillis() + 15 * 60000L,
                    PendingIntent.getBroadcast(c, 21, it, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
            return;
        }
        if (Intent.ACTION_BOOT_COMPLETED.equals(a)) { schedule(c); return; }
        if (FIRE.equals(a) && keys != null) { notify(c, keys, date); schedule(c); }
    }

    static void notify(Context c, String keys, String date) {
        if (Build.VERSION.SDK_INT >= 33 && c.checkSelfPermission("android.permission.POST_NOTIFICATIONS") != android.content.pm.PackageManager.PERMISSION_GRANTED) return;
        JSONArray doses = cfg(c).optJSONArray("doses");
        List<String> names = new ArrayList<>(), lines = new ArrayList<>(), open = new ArrayList<>();
        String route = "meds", kind = "med";
        if (keys.startsWith("test")) { names.add("your medicine"); lines.add("This is how your medicine reminders will look. Tap Taken, In 15 min or Skip."); open.add(keys); }
        else for (String k : keys.split(",")) {
            if (done(c, date, k)) continue;
            String id = k.split("\\|")[0];
            for (int i = 0; doses != null && i < doses.length(); i++) {
                JSONObject m = doses.optJSONObject(i);
                if (m != null && id.equals(m.optString("id"))) { if (open.isEmpty()) { route = m.optString("route", "meds"); kind = m.optString("kind", "med"); } names.add(m.optString("n")); lines.add(m.optString("n") + " · " + m.optString("q")); open.add(k); }
            }
        }
        if (open.isEmpty()) return;
        channel(c);
        String ks = String.join(",", open);
        PendingIntent show = PendingIntent.getActivity(c, 22, new Intent(c, MainActivity.class).putExtra("route", route), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        PendingIntent take = PendingIntent.getBroadcast(c, 23, new Intent(c, MedReceiver.class).setAction(TAKE).putExtra("keys", ks).putExtra("date", date), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        PendingIntent snooze = PendingIntent.getBroadcast(c, 24, new Intent(c, MedReceiver.class).setAction(SNOOZE).putExtra("keys", ks).putExtra("date", date), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification n = new Notification.Builder(c, CH)
                .setSmallIcon(android.R.drawable.ic_popup_reminder)
                .setContentTitle(("prana".equals(kind) ? "🧘 Time for " : "💊 Time for ") + String.join(", ", names))
                .setContentText(lines.get(0))
                .setStyle(new Notification.BigTextStyle().bigText(String.join("\n", lines)))
                .setContentIntent(show).setAutoCancel(true)
                .setFullScreenIntent(PendingIntent.getActivity(c, 25, card(c, ks, date, names, lines, route, kind), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE), true)
                .setCategory(Notification.CATEGORY_REMINDER)
                .addAction("prana".equals(kind) ? new Notification.Action.Builder(null, "Start now", show).build() : new Notification.Action.Builder(null, open.size() > 1 ? "Taken all" : "Taken", take).build())
                .addAction(new Notification.Action.Builder(null, "In 15 min", snooze).build())
                .addAction(new Notification.Action.Builder(null, "Skip", PendingIntent.getBroadcast(c, 26, new Intent(c, MedReceiver.class).setAction(SKIP).putExtra("keys", ks).putExtra("date", date), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE)).build())
                .build();
        c.getSystemService(NotificationManager.class).notify(NID, n);
        // the Dayline-style card: pops up from the bottom over whatever is on screen (needs "Display over other apps"); on a locked phone the full-screen intent shows it
        if (cfg(c).optBoolean("popup", true) && (android.provider.Settings.canDrawOverlays(c) || isLocked(c))) {
            try { c.startActivity(card(c, ks, date, names, lines, route, kind).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_NO_HISTORY)); } catch (Exception ignored) { }
        }
    }

    static boolean isLocked(Context c) { android.app.KeyguardManager km = c.getSystemService(android.app.KeyguardManager.class); return km != null && km.isKeyguardLocked(); }

    static Intent card(Context c, String ks, String date, List<String> names, List<String> lines, String route, String kind) {
        return new Intent(c, ReminderActivity.class).putExtra("route", route).putExtra("kind", kind).putExtra("keys", ks).putExtra("date", date)
                .putExtra("title", "Time for " + String.join(", ", names))
                .putExtra("body", lines.size() == 1 && lines.get(0).contains(" · ") ? lines.get(0).substring(lines.get(0).indexOf(" · ") + 3) : String.join("\n", lines))
                .putExtra("accent", cfg(c).optString("accent", "#7C5CFF"));
    }
}
