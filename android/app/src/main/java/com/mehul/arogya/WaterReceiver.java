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

import org.json.JSONArray;
import org.json.JSONObject;

import java.time.LocalDate;
import java.time.LocalTime;

/** Water nudges: checks pace every N minutes; the notification's buttons log water without opening the app. */
public class WaterReceiver extends BroadcastReceiver {
    static final String CH = "water_v2", CHECK = "com.mehul.arogya.WATER_CHECK", ADD = "com.mehul.arogya.WATER_ADD";
    static final int NID = 4100;

    static SharedPreferences prefs(Context c) { return c.getSharedPreferences("water", Context.MODE_PRIVATE); }

    static JSONObject cfg(Context c) {
        try { return new JSONObject(prefs(c).getString("cfg", "{}")); } catch (Exception e) { return new JSONObject(); }
    }

    /** ml logged today = value the app last reported (if it is today's) + adds from notifications not yet picked up */
    static int todayMl(Context c) {
        JSONObject o = cfg(c);
        int ml = LocalDate.now().toString().equals(o.optString("date")) ? o.optInt("ml") : 0;
        try {
            JSONArray a = new JSONArray(prefs(c).getString("adds", "[]"));
            long start = LocalDate.now().atStartOfDay(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli();
            for (int i = 0; i < a.length(); i++) { JSONObject x = a.getJSONObject(i); if (x.getLong("t") >= start) ml += x.getInt("ml"); }
        } catch (Exception ignored) { }
        return ml;
    }

    static void schedule(Context c) {
        JSONObject o = cfg(c);
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        PendingIntent pi = PendingIntent.getBroadcast(c, 1, new Intent(c, WaterReceiver.class).setAction(CHECK), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        am.cancel(pi);
        if (!o.optBoolean("remind", false)) return;
        long every = Math.max(30, o.optInt("every", 60)) * 60000L;
        long when = System.currentTimeMillis() + every;
        try { if (android.os.Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms()) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, when, pi); else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, when, pi); }
        catch (SecurityException e) { am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, when, pi); }
    }

    static void channel(Context c) {
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm.getNotificationChannel(CH) == null) {
            NotificationChannel ch = new NotificationChannel(CH, "Water reminders", NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription("Nudges when you are behind on water");
            ch.enableVibration(true);
            ch.setVibrationPattern(new long[]{0, 400, 250, 400, 250, 600});
            ch.enableLights(true);
            ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            ch.setSound(android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_NOTIFICATION),
                    new android.media.AudioAttributes.Builder().setUsage(android.media.AudioAttributes.USAGE_NOTIFICATION_EVENT).setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
            nm.createNotificationChannel(ch);
        }
    }

    private static int mins(String hhmm, int def) {
        try { String[] p = hhmm.split(":"); return Integer.parseInt(p[0]) * 60 + Integer.parseInt(p[1]); } catch (Exception e) { return def; }
    }

    @Override
    public void onReceive(Context c, Intent i) {
        String a = i.getAction();
        if (ADD.equals(a)) {
            int ml = i.getIntExtra("ml", 250);
            try {
                JSONArray arr = new JSONArray(prefs(c).getString("adds", "[]"));
                arr.put(new JSONObject().put("t", System.currentTimeMillis()).put("ml", ml));
                prefs(c).edit().putString("adds", arr.toString()).putLong("last", System.currentTimeMillis()).apply();
            } catch (Exception ignored) { }
            c.getSystemService(NotificationManager.class).cancel(NID);
            return;
        }
        if (Intent.ACTION_BOOT_COMPLETED.equals(a)) { schedule(c); return; }
        if (CHECK.equals(a)) { check(c); schedule(c); }
    }

    static void check(Context c) { check(c, false); }

    static void check(Context c, boolean test) {
        JSONObject o = cfg(c);
        int goal = o.optInt("goal", 2500), glass = o.optInt("glass", 250);
        int from = mins(o.optString("from", "08:00"), 480), to = mins(o.optString("to", "22:00"), 1320);
        LocalTime now = LocalTime.now();
        int m = now.getHour() * 60 + now.getMinute();
        if (!test && (m < from || m > to)) return;
        int ml = todayMl(c);
        if (!test && ml >= goal) return;
        int expected = Math.round(goal * Math.min(1f, (m - from) / (float) Math.max(1, to - from)));
        int behind = expected - ml;
        if (!test && o.optBoolean("onlyBehind", true) && behind < glass) return;
        long last = Math.max(prefs(c).getLong("last", 0), o.optLong("lastLog", 0));
        if (!test && System.currentTimeMillis() - last < 40 * 60000L) return;
        if (android.os.Build.VERSION.SDK_INT >= 33 && c.checkSelfPermission("android.permission.POST_NOTIFICATIONS") != android.content.pm.PackageManager.PERMISSION_GRANTED) return;
        boolean card = MedReceiver.cardOk(c);
        if (card) MedReceiver.quietChannel(c); else channel(c);
        int glasses = Math.max(1, Math.round(behind / (float) glass));
        String title = behind >= glass ? "💧 " + glasses + (glasses == 1 ? " glass" : " glasses") + " behind" : "💧 Time for a glass of water";
        String body = String.format("%.2f L of %.1f L so far. Tap a button to log it.", ml / 1000f, goal / 1000f);
        PendingIntent open = PendingIntent.getActivity(c, 2, new Intent(c, MainActivity.class).putExtra("route", "water"), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        PendingIntent add1 = PendingIntent.getBroadcast(c, 3, new Intent(c, WaterReceiver.class).setAction(ADD).putExtra("ml", glass), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        PendingIntent add2 = PendingIntent.getBroadcast(c, 4, new Intent(c, WaterReceiver.class).setAction(ADD).putExtra("ml", 500), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification n = new Notification.Builder(c, card ? MedReceiver.QCH : CH)
                .setSmallIcon(android.R.drawable.ic_menu_info_details)
                .setContentTitle(title).setContentText(body)
                .setContentIntent(open).setAutoCancel(true)
                .setCategory(Notification.CATEGORY_REMINDER)
                .addAction(new Notification.Action.Builder(null, "+" + glass + " ml", add1).build())
                .addAction(new Notification.Action.Builder(null, "+500 ml", add2).build())
                .build();
        c.getSystemService(NotificationManager.class).notify(NID, n);
        if (card) {
            Intent it = new Intent(c, ReminderActivity.class).putExtra("kind", "water").putExtra("route", "water").putExtra("glass", glass)
                    .putExtra("title", title.replace("💧 ", "")).putExtra("body", body.replace(" Tap a button to log it.", ""))
                    .putExtra("accent", MedReceiver.cfg(c).optString("accent", "#4E8FD0"))
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_NO_HISTORY);
            try { c.startActivity(it); } catch (Exception e) { channel(c); c.getSystemService(NotificationManager.class).notify(NID, Notification.Builder.recoverBuilder(c, n).setChannelId(CH).build()); }
        }
    }
}
