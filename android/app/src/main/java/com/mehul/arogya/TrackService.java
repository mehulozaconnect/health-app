package com.mehul.arogya;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.media.AudioAttributes;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.SystemClock;
import android.speech.tts.TextToSpeech;
import android.speech.tts.Voice;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Locale;

/**
 * Live tracker for walks, runs, rides and sports: time, steps (phone step counter) and distance
 * (GPS when allowed, else from steps). Keeps counting with the screen locked.
 */
public class TrackService extends Service implements SensorEventListener, LocationListener {
    static final String CH = "track";
    static final int NID = 4200;
    static volatile TrackService inst;
    static String pending;

    private final Handler h = new Handler(Looper.getMainLooper());
    private PowerManager.WakeLock wl;
    private SensorManager sm;
    private LocationManager lm;
    private TextToSpeech tts;
    private boolean ttsOk = false, gps = false;

    private String act = "walk", name = "Walk", tag = "";
    private double stride = 0.72, voiceEveryKm = 1;
    private boolean voice = true, finished = false, paused = false;
    private long startWall, startEl, pausedAt, pausedTotal;
    private float stepBase = -1, stepLast = -1;
    private int steps = 0, detSteps = 0;
    private double gpsM = 0;
    private Location last;
    private int nextKm = 1, nextMin = 10;

    static String state() {
        TrackService s = inst;
        if (s == null || s.finished) return "{\"run\":false}";
        try {
            return new JSONObject().put("run", true).put("tag", s.tag).put("act", s.act).put("paused", s.paused).put("sec", s.secs())
                    .put("steps", s.steps).put("m", Math.round(s.meters())).put("gps", s.gps && s.gpsM > 0).toString();
        } catch (Exception e) { return "{\"run\":false}"; }
    }

    long secs() { long now = paused ? pausedAt : SystemClock.elapsedRealtime(); return (now - startEl - pausedTotal) / 1000; }
    double meters() { return gps && gpsM > 30 ? gpsM : steps * stride; }

    @Override
    public void onCreate() {
        super.onCreate();
        inst = this;
        NotificationChannel ch = new NotificationChannel(CH, "Walk and workout tracker", NotificationManager.IMPORTANCE_LOW);
        ch.setShowBadge(false);
        getSystemService(NotificationManager.class).createNotificationChannel(ch);
        wl = ((PowerManager) getSystemService(POWER_SERVICE)).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "arogya:track");
        wl.setReferenceCounted(false);
        sm = (SensorManager) getSystemService(SENSOR_SERVICE);
        lm = (LocationManager) getSystemService(LOCATION_SERVICE);
        String vname = SessionService.prefs(this).getString("voice", "");
        float rate = SessionService.prefs(this).getFloat("rate", 0.9f);
        tts = new TextToSpeech(this, st -> {
            if (st != TextToSpeech.SUCCESS) return;
            tts.setLanguage(new Locale("en", "IN")); tts.setSpeechRate(rate);
            tts.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build());
            if (!vname.isEmpty()) try { for (Voice v : tts.getVoices()) if (v.getName().equals(vname)) { tts.setVoice(v); break; } } catch (Exception ignored) { }
            ttsOk = true;
        });
    }

    private boolean has(String p) { return checkSelfPermission(p) == PackageManager.PERMISSION_GRANTED; }

    @Override
    public int onStartCommand(Intent i, int flags, int id) {
        String a = i != null ? i.getAction() : null;
        if (a == null || "start".equals(a)) {
            String js = pending; pending = null;
            if (js == null || (inst == this && startEl > 0 && !finished)) return START_NOT_STICKY;
            try { begin(new JSONObject(js)); } catch (Exception e) { stopSelf(); }
            return START_NOT_STICKY;
        }
        control(a);
        return START_NOT_STICKY;
    }

    private void begin(JSONObject o) {
        act = o.optString("act", "walk"); name = o.optString("name", "Walk"); tag = o.optString("tag", "");
        stride = o.optDouble("stride", 0.72); voice = o.optBoolean("voice", true);
        boolean wantGps = o.optBoolean("gps", false);
        startWall = System.currentTimeMillis(); startEl = SystemClock.elapsedRealtime(); finished = false;
        gps = wantGps && has(Manifest.permission.ACCESS_FINE_LOCATION);
        int type = ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK;
        if (gps && Build.VERSION.SDK_INT >= 29) type |= ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION;
        try {
            if (Build.VERSION.SDK_INT >= 29) startForeground(NID, notif(), type); else startForeground(NID, notif());
        } catch (Exception e) {
            gps = false;
            try { if (Build.VERSION.SDK_INT >= 29) startForeground(NID, notif(), ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK); else startForeground(NID, notif()); } catch (Exception e2) { stopSelf(); return; }
        }
        wl.acquire(6 * 3600 * 1000L);
        if (Build.VERSION.SDK_INT < 29 || has(Manifest.permission.ACTIVITY_RECOGNITION)) {
            Sensor c = sm.getDefaultSensor(Sensor.TYPE_STEP_COUNTER), d = sm.getDefaultSensor(Sensor.TYPE_STEP_DETECTOR);
            if (c != null) sm.registerListener(this, c, SensorManager.SENSOR_DELAY_NORMAL);
            else if (d != null) sm.registerListener(this, d, SensorManager.SENSOR_DELAY_NORMAL);
        }
        if (gps) try { lm.requestLocationUpdates(LocationManager.GPS_PROVIDER, 2000, 3, this, Looper.getMainLooper()); } catch (Exception e) { gps = false; }
        say(name + " started");
        h.post(tick);
    }

    private final Runnable tick = new Runnable() {
        @Override
        public void run() {
            if (finished) return;
            if (!paused) {
                double km = meters() / 1000;
                if (km >= nextKm * voiceEveryKm) { say(fmtKm(km) + ". " + (secs() / 60) + " minutes"); nextKm++; }
                else if (secs() / 60 >= nextMin) { say(nextMin + " minutes. " + steps + " steps"); nextMin += 10; }
            }
            try { getSystemService(NotificationManager.class).notify(NID, notif()); } catch (Exception ignored) { }
            h.postDelayed(this, 5000);
        }
    };

    private String fmtKm(double km) { return String.format(Locale.US, "%.1f kilometres", Math.floor(km * 10) / 10); }

    private void say(String t) { if (voice && ttsOk) tts.speak(t, TextToSpeech.QUEUE_FLUSH, null, "t"); }

    @Override
    public void onSensorChanged(SensorEvent e) {
        if (paused || finished) { if (e.sensor.getType() == Sensor.TYPE_STEP_COUNTER) stepLast = e.values[0]; return; }
        if (e.sensor.getType() == Sensor.TYPE_STEP_COUNTER) {
            float v = e.values[0];
            if (stepBase < 0) { stepBase = v; stepLast = v; return; }
            if (stepLast >= 0 && v > stepLast) steps += (int) (v - stepLast);
            stepLast = v;
        } else steps++;
    }

    @Override public void onAccuracyChanged(Sensor s, int a) { }

    @Override
    public void onLocationChanged(Location l) {
        if (paused || finished || l.getAccuracy() > 25) return;
        if (last != null) { float d = last.distanceTo(l); if (d < 80) gpsM += d; }
        last = l;
    }
    @Override public void onProviderEnabled(String p) { }
    @Override public void onProviderDisabled(String p) { }
    @Override public void onStatusChanged(String p, int s, Bundle b) { }

    void control(String a) {
        if (finished) return;
        if ("pause".equals(a)) {
            if (!paused) { paused = true; pausedAt = SystemClock.elapsedRealtime(); last = null; say("Paused"); }
            else { paused = false; pausedTotal += SystemClock.elapsedRealtime() - pausedAt; say("Resumed"); }
            try { getSystemService(NotificationManager.class).notify(NID, notif()); } catch (Exception ignored) { }
        } else if ("stop".equals(a)) finish();
    }

    private void finish() {
        if (finished) return;
        long sec = secs();
        finished = true;
        h.removeCallbacks(tick);
        try { sm.unregisterListener(this); } catch (Exception ignored) { }
        try { lm.removeUpdates(this); } catch (Exception ignored) { }
        try {
            JSONObject r = new JSONObject().put("tag", tag).put("act", act).put("name", name).put("start", startWall).put("end", System.currentTimeMillis())
                    .put("sec", sec).put("steps", steps).put("m", Math.round(meters())).put("gps", gps && gpsM > 30);
            JSONArray arr = new JSONArray(SessionService.prefs(this).getString("tracks", "[]"));
            arr.put(r);
            SessionService.prefs(this).edit().putString("tracks", arr.toString()).apply();
        } catch (Exception ignored) { }
        say(name + " saved");
        MainActivity.sessionEnded();
        h.postDelayed(() -> { if (wl.isHeld()) wl.release(); stopForeground(STOP_FOREGROUND_REMOVE); stopSelf(); }, 1800);
    }

    static String takeResults(android.content.Context c) {
        String r = SessionService.prefs(c).getString("tracks", "[]");
        SessionService.prefs(c).edit().putString("tracks", "[]").apply();
        return r;
    }

    private PendingIntent act(String a, int rq) {
        return PendingIntent.getService(this, rq, new Intent(this, TrackService.class).setAction(a), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private Notification notif() {
        double km = meters() / 1000;
        Notification.Builder b = new Notification.Builder(this, CH)
                .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                .setContentTitle(name + (paused ? " · paused" : ""))
                .setContentText(steps + " steps · " + String.format(Locale.US, "%.2f km", km))
                .setOngoing(true).setOnlyAlertOnce(true).setCategory(Notification.CATEGORY_WORKOUT)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .setContentIntent(PendingIntent.getActivity(this, 51, new Intent(this, MainActivity.class).putExtra("route", "extrack").addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        if (!paused && startEl > 0) b.setWhen(startWall + pausedTotal).setUsesChronometer(true).setShowWhen(true);
        b.addAction(new Notification.Action.Builder(null, paused ? "Resume" : "Pause", act("pause", 52)).build());
        b.addAction(new Notification.Action.Builder(null, "Finish", act("stop", 53)).build());
        return b.build();
    }

    @Override
    public void onDestroy() {
        if (!finished && startEl > 0) finish();
        h.removeCallbacks(tick);
        try { sm.unregisterListener(this); } catch (Exception ignored) { }
        try { lm.removeUpdates(this); } catch (Exception ignored) { }
        if (tts != null) tts.shutdown();
        if (wl != null && wl.isHeld()) wl.release();
        if (inst == this) inst = null;
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent i) { return null; }
}
