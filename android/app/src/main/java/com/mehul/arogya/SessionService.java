package com.mehul.arogya;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.ToneGenerator;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.SystemClock;
import android.speech.tts.TextToSpeech;
import android.speech.tts.Voice;
import android.util.Base64;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.util.Locale;

/**
 * Guided session player (pranayama, yoga, workouts). Runs as a foreground service so it keeps
 * talking and counting with the screen locked. The web page sends the whole script once
 * (steps with what to say and for how long); this plays it and reports where it is.
 */
public class SessionService extends Service {
    static final String CH = "session", ACT_PAUSE = "pause", ACT_SKIP = "skip", ACT_STOP = "stop", ACT_BACK = "back";
    static final int NID = 4100;
    static volatile SessionService inst;
    static String pending;

    private final Handler h = new Handler(Looper.getMainLooper());
    private PowerManager.WakeLock wl;
    private TextToSpeech tts;
    private boolean ttsOk = false;
    private MediaPlayer mp;
    private ToneGenerator tone;
    private AudioManager am;
    private AudioFocusRequest afr;

    private JSONArray steps;
    private String tag = "", name = "";
    private boolean voice = true;
    private int idx = -1;
    private long stepStart = 0, pausedAt = 0, startedWall = 0;
    private boolean paused = false, finished = false;
    private int preSaid = -1;
    private final JSONObject itemSec = new JSONObject();

    static SharedPreferences prefs(Context c) { return c.getSharedPreferences("session", MODE_PRIVATE); }
    static File voiceDir(Context c) { File d = new File(c.getFilesDir(), "voice"); d.mkdirs(); return d; }

    /* ---------- recorded voice clips (Gemini speech, saved as WAV) ---------- */
    static boolean saveClip(Context c, String key, String b64, int rate) {
        try {
            byte[] pcm = Base64.decode(b64, Base64.DEFAULT);
            File f = new File(voiceDir(c), key.replaceAll("[^a-zA-Z0-9_]", "") + ".wav");
            try (FileOutputStream o = new FileOutputStream(f)) {
                int len = pcm.length, br = rate * 2;
                byte[] hd = new byte[44];
                put(hd, 0, "RIFF"); le32(hd, 4, 36 + len); put(hd, 8, "WAVE"); put(hd, 12, "fmt ");
                le32(hd, 16, 16); le16(hd, 20, 1); le16(hd, 22, 1); le32(hd, 24, rate); le32(hd, 28, br); le16(hd, 32, 2); le16(hd, 34, 16);
                put(hd, 36, "data"); le32(hd, 40, len);
                o.write(hd); o.write(pcm);
            }
            return true;
        } catch (Exception e) { return false; }
    }
    private static void put(byte[] b, int o, String s) { for (int i = 0; i < 4; i++) b[o + i] = (byte) s.charAt(i); }
    private static void le32(byte[] b, int o, int v) { b[o] = (byte) v; b[o + 1] = (byte) (v >> 8); b[o + 2] = (byte) (v >> 16); b[o + 3] = (byte) (v >> 24); }
    private static void le16(byte[] b, int o, int v) { b[o] = (byte) v; b[o + 1] = (byte) (v >> 8); }
    static String clipList(Context c) {
        JSONArray a = new JSONArray();
        File[] fs = voiceDir(c).listFiles();
        if (fs != null) for (File f : fs) if (f.getName().endsWith(".wav")) a.put(f.getName().replace(".wav", ""));
        return a.toString();
    }
    static void clipClear(Context c) { File[] fs = voiceDir(c).listFiles(); if (fs != null) for (File f : fs) f.delete(); }
    static File clip(Context c, String key) { if (key == null || key.isEmpty()) return null; File f = new File(voiceDir(c), key + ".wav"); return f.exists() ? f : null; }

    /* ---------- state for the page ---------- */
    static String state() {
        SessionService s = inst;
        if (s == null || s.steps == null) return "{\"run\":false}";
        try {
            long now = SystemClock.elapsedRealtime();
            long into = (s.paused ? s.pausedAt : now) - s.stepStart;
            return new JSONObject().put("run", !s.finished).put("tag", s.tag).put("i", s.idx).put("ms", Math.max(0, into)).put("paused", s.paused).toString();
        } catch (Exception e) { return "{\"run\":false}"; }
    }
    static String takeResults(Context c) {
        String r = prefs(c).getString("results", "[]");
        prefs(c).edit().putString("results", "[]").apply();
        return r;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        inst = this;
        am = (AudioManager) getSystemService(AUDIO_SERVICE);
        NotificationManager nm = getSystemService(NotificationManager.class);
        NotificationChannel ch = new NotificationChannel(CH, "Guided sessions", NotificationManager.IMPORTANCE_LOW);
        ch.setDescription("Shows the pranayama or workout that is playing, with pause and stop");
        ch.setShowBadge(false);
        nm.createNotificationChannel(ch);
        PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
        wl = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "arogya:session");
        wl.setReferenceCounted(false);
        try { tone = new ToneGenerator(AudioManager.STREAM_MUSIC, 45); } catch (Exception ignored) { }
        String vname = prefs(this).getString("voice", "");
        float rate = prefs(this).getFloat("rate", 0.9f);
        tts = new TextToSpeech(this, st -> {
            if (st != TextToSpeech.SUCCESS) return;
            tts.setLanguage(new Locale("en", "IN"));
            tts.setSpeechRate(rate);
            tts.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build());
            if (!vname.isEmpty()) try { for (Voice v : tts.getVoices()) if (v.getName().equals(vname)) { tts.setVoice(v); break; } } catch (Exception ignored) { }
            ttsOk = true;
            if (idx >= 0 && !paused && !finished) sayStep();
        });
    }

    @Override
    public int onStartCommand(Intent i, int flags, int id) {
        String a = i != null ? i.getAction() : null;
        if (a == null || "start".equals(a)) {
            String js = pending; pending = null;
            if (js == null) { stopSelf(); return START_NOT_STICKY; }
            try { begin(new JSONObject(js)); } catch (Exception e) { stopSelf(); return START_NOT_STICKY; }
            return START_NOT_STICKY;
        }
        if (steps == null) { stopSelf(); return START_NOT_STICKY; }
        if (ACT_PAUSE.equals(a)) togglePause();
        else if (ACT_SKIP.equals(a)) skip(1);
        else if (ACT_BACK.equals(a)) skip(-1);
        else if (ACT_STOP.equals(a)) finish(false);
        return START_NOT_STICKY;
    }

    private void begin(JSONObject o) throws Exception {
        steps = o.getJSONArray("steps");
        tag = o.optString("tag");
        name = o.optString("name", "Session");
        voice = o.optBoolean("voice", true);
        finished = false; paused = false; idx = -1; startedWall = System.currentTimeMillis();
        java.util.Iterator<String> it = itemSec.keys(); while (it.hasNext()) { it.next(); it.remove(); }
        Notification n = notif();
        if (Build.VERSION.SDK_INT >= 29) startForeground(NID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        else startForeground(NID, n);
        wl.acquire(3 * 3600 * 1000L);
        focus(true);
        go(0);
        h.removeCallbacks(tick);
        h.post(tick);
    }

    private final Runnable tick = new Runnable() {
        @Override
        public void run() {
            if (steps == null || finished) return;
            if (!paused) {
                long into = SystemClock.elapsedRealtime() - stepStart;
                JSONObject s = steps.optJSONObject(idx);
                if (s != null && s.optBoolean("wait")) { /* a set of reps: waits for Done */ }
                else if (s != null && into >= (long) (s.optDouble("sec", 1) * 1000)) { addTime(s, s.optDouble("sec", 1)); if (idx + 1 >= steps.length()) { finish(true); return; } go(idx + 1); }
                else if (s != null && preSaid != idx && s.has("pre") && s.optDouble("sec", 1) * 1000 - into <= s.optDouble("preAt", 5) * 1000) { preSaid = idx; speak(s.optString("pre"), s.optString("preClip")); }
            }
            h.postDelayed(this, 100);
        }
    };

    private void addTime(JSONObject s, double sec) {
        String k = s.optString("item", "");
        if (k.isEmpty()) return;
        try { itemSec.put(k, itemSec.optDouble(k, 0) + sec); } catch (Exception ignored) { }
    }

    private void go(int i) {
        idx = i; stepStart = SystemClock.elapsedRealtime();
        sayStep();
        try { getSystemService(NotificationManager.class).notify(NID, notif()); } catch (Exception ignored) { }
    }

    private void sayStep() {
        JSONObject s = steps.optJSONObject(idx);
        if (s == null) return;
        stopAudio();
        String say = s.optString("say", "");
        if (!voice || say.isEmpty()) { if (s.optBoolean("chime", true)) beep(s.optString("ph")); return; }
        speak(say, s.optString("clip"));
    }

    private void speak(String say, String key) {
        stopAudio();
        if (!voice || say == null || say.isEmpty()) return;
        File f = clip(this, key);
        if (f != null) {
            try {
                mp = new MediaPlayer();
                mp.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build());
                mp.setDataSource(f.getPath());
                mp.setOnCompletionListener(m -> { m.release(); if (mp == m) mp = null; });
                mp.prepare();
                mp.start();
                return;
            } catch (Exception e) { stopAudio(); }
        }
        if (ttsOk) tts.speak(say, TextToSpeech.QUEUE_FLUSH, null, "s" + idx);
    }

    private void beep(String ph) {
        if (tone == null) return;
        try { tone.startTone("in".equals(ph) ? ToneGenerator.TONE_PROP_BEEP : ToneGenerator.TONE_PROP_ACK, 120); } catch (Exception ignored) { }
    }

    private void stopAudio() {
        if (mp != null) { try { mp.stop(); } catch (Exception ignored) { } try { mp.release(); } catch (Exception ignored) { } mp = null; }
        if (ttsOk) tts.stop();
    }

    private void togglePause() {
        if (finished) return;
        if (!paused) { paused = true; pausedAt = SystemClock.elapsedRealtime(); stopAudio(); }
        else { paused = false; stepStart += SystemClock.elapsedRealtime() - pausedAt; sayStep(); }
        try { getSystemService(NotificationManager.class).notify(NID, notif()); } catch (Exception ignored) { }
    }

    private void skip(int d) {
        if (finished) return;
        JSONObject s = steps.optJSONObject(idx);
        long into = (paused ? pausedAt : SystemClock.elapsedRealtime()) - stepStart;
        if (d > 0 && s != null) addTime(s, into / 1000.0);
        int j = idx + d;
        if (j >= steps.length()) { finish(true); return; }
        if (j < 0) j = 0;
        paused = false;
        go(j);
    }

    void control(String a) {
        if (ACT_PAUSE.equals(a)) togglePause();
        else if (ACT_SKIP.equals(a)) skip(1);
        else if (ACT_BACK.equals(a)) skip(-1);
        else if (ACT_STOP.equals(a)) finish(false);
        else if ("resume".equals(a) && paused) togglePause();
        else if ("hold".equals(a) && !paused) togglePause();
    }

    private void finish(boolean done) {
        if (finished) return;
        finished = true;
        h.removeCallbacks(tick);
        if (!done) { JSONObject s = steps.optJSONObject(idx); if (s != null) addTime(s, ((paused ? pausedAt : SystemClock.elapsedRealtime()) - stepStart) / 1000.0); }
        stopAudio();
        try {
            JSONObject r = new JSONObject().put("tag", tag).put("name", name).put("start", startedWall).put("end", System.currentTimeMillis()).put("done", done).put("items", itemSec);
            JSONArray a = new JSONArray(prefs(this).getString("results", "[]"));
            a.put(r);
            prefs(this).edit().putString("results", a.toString()).apply();
        } catch (Exception ignored) { }
        MainActivity.sessionEnded();
        h.postDelayed(this::shutdown, 1500);
    }

    private void shutdown() {
        focus(false);
        if (wl.isHeld()) wl.release();
        stopForeground(STOP_FOREGROUND_REMOVE);
        stopSelf();
    }

    private void focus(boolean on) {
        try {
            if (on) {
                afr = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
                        .setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build()).build();
                am.requestAudioFocus(afr);
            } else if (afr != null) { am.abandonAudioFocusRequest(afr); afr = null; }
        } catch (Exception ignored) { }
    }

    private PendingIntent act(String a, int rq) {
        return PendingIntent.getService(this, rq, new Intent(this, SessionService.class).setAction(a), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private Notification notif() {
        JSONObject s = steps != null ? steps.optJSONObject(Math.max(0, idx)) : null;
        String t = s != null ? s.optString("title", "") : "";
        String sub = s != null ? s.optString("sub", "") : "";
        Notification.Builder b = new Notification.Builder(this, CH)
                .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setContentTitle(name + (t.isEmpty() ? "" : " · " + t))
                .setContentText(paused ? "Paused" : sub)
                .setOngoing(true).setOnlyAlertOnce(true).setShowWhen(false)
                .setCategory(Notification.CATEGORY_PROGRESS)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .setContentIntent(PendingIntent.getActivity(this, 41, new Intent(this, MainActivity.class).putExtra("route", "exrun").addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        if (s != null && !paused && !s.optBoolean("wait")) {
            long left = (long) (s.optDouble("sec", 1) * 1000) - (SystemClock.elapsedRealtime() - stepStart);
            b.setWhen(System.currentTimeMillis() + Math.max(0, left)).setUsesChronometer(true).setShowWhen(true);
            if (Build.VERSION.SDK_INT >= 24) b.setChronometerCountDown(true);
        }
        if (steps != null) b.setProgress(steps.length(), Math.max(0, idx), false);
        b.addAction(new Notification.Action.Builder(null, paused ? "Resume" : "Pause", act(ACT_PAUSE, 42)).build());
        b.addAction(new Notification.Action.Builder(null, s != null && s.optBoolean("wait") ? "Done" : "Skip", act(ACT_SKIP, 43)).build());
        b.addAction(new Notification.Action.Builder(null, "Stop", act(ACT_STOP, 44)).build());
        return b.build();
    }

    @Override
    public void onDestroy() {
        h.removeCallbacks(tick);
        if (steps != null && !finished) finish(false);
        stopAudio();
        if (tts != null) tts.shutdown();
        if (tone != null) tone.release();
        if (wl != null && wl.isHeld()) wl.release();
        focus(false);
        if (inst == this) inst = null;
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent i) { return null; }
}
