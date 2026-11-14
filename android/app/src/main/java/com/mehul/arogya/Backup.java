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
        /* a copy in the phone's Documents/Arogya folder: survives uninstalling the app */
        try { docsCopy(c, src); p.edit().putLong("docAt", now).apply(); } catch (Exception ignored) { }
        /* tell Android's own Google backup that there is new data */
        try { new android.app.backup.BackupManager(c).dataChanged(); } catch (Exception ignored) { }
        String uri = p.getString("uri", null);
        if (uri == null) { p.edit().putLong("last", now).putString("err", "").apply(); return "local"; }
        try {
            OutputStream o = c.getContentResolver().openOutputStream(Uri.parse(uri), "wt");
            if (o == null) throw new Exception("could not open the backup file");
            copy(new FileInputStream(src), o);
            p.edit().putLong("last", now).putLong("lastOk", now).putString("err", "").apply();
            return "ok";
        } catch (Exception e) {
            String m = String.valueOf(e.getMessage());
            String nice = m.contains("No content provider") || m.contains("Permission") || e instanceof SecurityException
                    ? "Google Drive couldn't open the backup file (Drive was updated or signed out). Tap Change file and pick it again in Drive."
                    : e.getClass().getSimpleName() + ": " + m;
            p.edit().putString("err", nice).putLong("lastErrAt", now).apply();
            return "error";
        }
    }

    static void docsCopy(Context c, File src) throws Exception {
        if (android.os.Build.VERSION.SDK_INT < 29) return;
        android.content.ContentResolver cr = c.getContentResolver();
        Uri coll = android.provider.MediaStore.Files.getContentUri("external");
        String name = "arogya-" + LocalDate.now() + ".json", rel = android.os.Environment.DIRECTORY_DOCUMENTS + "/Arogya/";
        Uri target = null;
        try (android.database.Cursor q = cr.query(coll, new String[]{android.provider.MediaStore.MediaColumns._ID},
                android.provider.MediaStore.MediaColumns.DISPLAY_NAME + "=? AND " + android.provider.MediaStore.MediaColumns.RELATIVE_PATH + "=?", new String[]{name, rel}, null)) {
            if (q != null && q.moveToFirst()) target = android.content.ContentUris.withAppendedId(coll, q.getLong(0));
        }
        if (target == null) {
            android.content.ContentValues v = new android.content.ContentValues();
            v.put(android.provider.MediaStore.MediaColumns.DISPLAY_NAME, name);
            v.put(android.provider.MediaStore.MediaColumns.MIME_TYPE, "application/json");
            v.put(android.provider.MediaStore.MediaColumns.RELATIVE_PATH, rel);
            target = cr.insert(coll, v);
        }
        if (target == null) throw new Exception("no Documents folder");
        copy(new FileInputStream(src), cr.openOutputStream(target, "wt"));
    }

    static void copy(InputStream in, OutputStream out) throws Exception {
        try (InputStream i = in; OutputStream o = out) { byte[] b = new byte[65536]; int n; while ((n = i.read(b)) > 0) o.write(b, 0, n); o.flush(); }
    }

    static String status(Context c) {
        SharedPreferences p = prefs(c);
        try {
            File dir = new File(c.getFilesDir(), "backups"); String[] local = dir.list();
            if (local != null) Arrays.sort(local);
            return new JSONObject().put("set", p.getString("uri", null) != null).put("name", p.getString("name", "")).put("last", p.getLong("lastOk", 0)).put("err", p.getString("err", "")).put("errAt", p.getLong("lastErrAt", 0)).put("docAt", p.getLong("docAt", 0)).put("lastTry", p.getLong("last", 0))
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
