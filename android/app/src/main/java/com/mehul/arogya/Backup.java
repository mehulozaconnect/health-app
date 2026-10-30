package com.mehul.arogya;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;

import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Arrays;

/** Automatic backup: copies your data to the file you picked (e.g. in Google Drive) once a day — when you close the app, and at night. Also keeps 7 daily copies on the phone. */
public class Backup extends BroadcastReceiver {
    static final String RUN = "com.mehul.arogya.BACKUP";

    static SharedPreferences prefs(Context c) { return c.getSharedPreferences("backup", Context.MODE_PRIVATE); }

    static File state(Context c) { return new File(c.getFilesDir(), "arogya-state.json"); }

    /** force = ignore the once-a-day rule */
    static synchronized String run(Context c, boolean force) {
        SharedPreferences p = prefs(c);
        long now = System.currentTimeMillis();
        if (!force && now - p.getLong("last", 0) < 20 * 3600000L) return "skip";
        File src = state(c);
        if (!src.exists() || src.length() < 10) return "no data";
        /* local daily copies, newest 7 kept */
        try {
            File dir = new File(c.getFilesDir(), "backups"); dir.mkdirs();
            copy(new FileInputStream(src), new FileOutputStream(new File(dir, "arogya-" + LocalDate.now() + ".json")));
            File[] all = dir.listFiles(); if (all != null && all.length > 7) { Arrays.sort(all); for (int i = 0; i < all.length - 7; i++) all[i].delete(); }
        } catch (Exception ignored) { }
        String uri = p.getString("uri", null);
        if (uri == null) { p.edit().putLong("last", now).putString("err", "").apply(); return "local"; }
        try {
            OutputStream o = c.getContentResolver().openOutputStream(Uri.parse(uri), "wt");
            if (o == null) throw new Exception("could not open the backup file");
            copy(new FileInputStream(src), o);
            p.edit().putLong("last", now).putLong("lastOk", now).putString("err", "").apply();
            return "ok";
        } catch (Exception e) {
            p.edit().putString("err", e.getClass().getSimpleName() + ": " + e.getMessage()).putLong("lastErrAt", now).apply();
            return "error";
        }
    }

    static void copy(InputStream in, OutputStream out) throws Exception {
        try (InputStream i = in; OutputStream o = out) { byte[] b = new byte[65536]; int n; while ((n = i.read(b)) > 0) o.write(b, 0, n); o.flush(); }
    }

    static String status(Context c) {
        SharedPreferences p = prefs(c);
        try {
            File dir = new File(c.getFilesDir(), "backups"); String[] local = dir.list();
            if (local != null) Arrays.sort(local);
            return new JSONObject().put("set", p.getString("uri", null) != null).put("name", p.getString("name", "")).put("last", p.getLong("lastOk", 0)).put("err", p.getString("err", "")).put("errAt", p.getLong("lastErrAt", 0))
                    .put("local", local == null ? new org.json.JSONArray() : new org.json.JSONArray(Arrays.asList(local))).toString();
        } catch (Exception e) { return "{}"; }
    }

    static String readLocal(Context c, String name) {
        try { File f = new File(new File(c.getFilesDir(), "backups"), name.replace("/", "")); byte[] b = new byte[(int) f.length()]; try (FileInputStream i = new FileInputStream(f)) { int off = 0, n; while (off < b.length && (n = i.read(b, off, b.length - off)) > 0) off += n; } return new String(b, "UTF-8"); } catch (Exception e) { return null; }
    }

    /** nightly at about 2:30 am */
    static void schedule(Context c) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        LocalDateTime t = LocalDate.now().plusDays(1).atTime(2, 30);
        PendingIntent pi = PendingIntent.getBroadcast(c, 40, new Intent(c, Backup.class).setAction(RUN), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, t.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli(), pi);
    }

    @Override
    public void onReceive(Context c, Intent i) {
        final PendingResult pr = goAsync();
        new Thread(() -> { try { run(c, false); schedule(c); } finally { pr.finish(); } }).start();
    }
}
