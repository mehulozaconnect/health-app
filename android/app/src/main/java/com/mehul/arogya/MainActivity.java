package com.mehul.arogya;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.speech.tts.TextToSpeech;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.core.content.FileProvider;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;
import java.util.Locale;

/** Arogya: the app is one offline web page in a WebView, plus a bridge for Samsung Health, files, reminders, voice and HTTP. */
public class MainActivity extends Activity {
    private static final int REQ_SAVE = 11, REQ_OPEN = 12, REQ_CHOOSER = 13, REQ_NOTIFY = 14;
    private static final int BG = 0xFFEEF2EF;
    private WebView web;
    private String pendingSave = null;
    private ValueCallback<Uri[]> chooserCb = null;
    private Uri camUri = null;
    private final Handler ui = new Handler(Looper.getMainLooper());
    private SamsungHealth sh;
    private TextToSpeech tts;
    private boolean ttsReady = false, loaded = false;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        Window w = getWindow();
        w.setStatusBarColor(BG);
        w.setNavigationBarColor(0xFFFFFFFF);
        w.getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
        sh = new SamsungHealth(this);

        web = new WebView(this);
        web.setBackgroundColor(BG);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setTextZoom(100);
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if ("file".equals(u.getScheme())) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception e) { }
                return true;
            }

            @Override
            public void onPageFinished(WebView v, String url) { loaded = true; }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
                if (chooserCb != null) chooserCb.onReceiveValue(null);
                chooserCb = cb;
                camUri = null;
                try {
                    String[] acc = p.getAcceptTypes();
                    boolean imageOnly = acc != null && acc.length > 0 && acc[0].startsWith("image");
                    if (p.isCaptureEnabled() && imageOnly) {
                        startActivityForResult(cameraIntent(), REQ_CHOOSER);
                    } else {
                        Intent pick = p.createIntent();
                        if (p.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE) pick.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                        Intent ch = Intent.createChooser(pick, "Choose");
                        if (imageOnly) ch.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{cameraIntent()});
                        startActivityForResult(ch, REQ_CHOOSER);
                    }
                } catch (Exception e) { chooserCb = null; return false; }
                return true;
            }
        });
        web.addJavascriptInterface(new Bridge(), "Android");
        setContentView(web);
        String route = getIntent() != null ? getIntent().getStringExtra("route") : null;
        web.loadUrl("file:///android_asset/www/index.html" + (route != null ? "#" + route : ""));
        tts = new TextToSpeech(this, st -> {
            if (st == TextToSpeech.SUCCESS) { tts.setLanguage(new Locale("en", "IN")); tts.setSpeechRate(0.92f); ttsReady = true; }
        });
        WaterReceiver.schedule(this);
    }

    private Intent cameraIntent() throws Exception {
        File dir = new File(getCacheDir(), "cam");
        dir.mkdirs();
        File f = new File(dir, "shot-" + System.currentTimeMillis() + ".jpg");
        camUri = FileProvider.getUriForFile(this, "com.mehul.arogya.files", f);
        Intent i = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        i.putExtra(MediaStore.EXTRA_OUTPUT, camUri);
        i.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
        return i;
    }

    @Override
    protected void onNewIntent(Intent i) {
        super.onNewIntent(i);
        String route = i.getStringExtra("route");
        if (route != null) js("location.hash='" + route.replace("'", "") + "'");
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (loaded) js("window.onResume && window.onResume()");
    }

    @Override
    protected void onDestroy() {
        if (tts != null) tts.shutdown();
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        web.evaluateJavascript("(window.arogyaBack ? window.arogyaBack() : 'false')", r -> {
            if (r == null || !r.contains("true")) finish();
        });
    }

    private void js(final String code) { ui.post(() -> web.evaluateJavascript(code, null)); }

    private File stateFile() { return new File(getFilesDir(), "arogya-state.json"); }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (req == REQ_CHOOSER) {
            Uri[] out = null;
            if (res == RESULT_OK) {
                if (data != null && data.getClipData() != null) {
                    int n = data.getClipData().getItemCount();
                    out = new Uri[n];
                    for (int i = 0; i < n; i++) out[i] = data.getClipData().getItemAt(i).getUri();
                } else if (data != null && data.getData() != null) out = new Uri[]{data.getData()};
                else if (camUri != null) out = new Uri[]{camUri};
            }
            if (chooserCb != null) chooserCb.onReceiveValue(out);
            chooserCb = null;
            return;
        }
        if (res != RESULT_OK || data == null || data.getData() == null) { pendingSave = null; return; }
        Uri uri = data.getData();
        if (req == REQ_SAVE && pendingSave != null) {
            try (OutputStream o = getContentResolver().openOutputStream(uri, "wt")) {
                o.write(pendingSave.getBytes(StandardCharsets.UTF_8));
                Toast.makeText(this, "Backup saved", Toast.LENGTH_SHORT).show();
            } catch (Exception e) {
                Toast.makeText(this, "Could not save: " + e.getMessage(), Toast.LENGTH_LONG).show();
            }
            pendingSave = null;
        } else if (req == REQ_OPEN) {
            try (InputStream in = getContentResolver().openInputStream(uri)) {
                js("window.onFileOpened(" + JSONObject.quote(readAll(in)) + ")");
            } catch (Exception e) {
                Toast.makeText(this, "Could not open: " + e.getMessage(), Toast.LENGTH_LONG).show();
            }
        }
    }

    private static String readAll(InputStream in) throws Exception {
        ByteArrayOutputStream bo = new ByteArrayOutputStream();
        byte[] buf = new byte[8192];
        int n;
        while ((n = in.read(buf)) > 0) bo.write(buf, 0, n);
        return new String(bo.toByteArray(), StandardCharsets.UTF_8);
    }

    private class Bridge {
        @JavascriptInterface
        public String version() { return String.valueOf(BuildConfig.VERSION_CODE); }

        @JavascriptInterface
        public String loadState() {
            File f = stateFile();
            if (!f.exists()) return null;
            try (InputStream in = new java.io.FileInputStream(f)) { return readAll(in); } catch (Exception e) { return null; }
        }

        @JavascriptInterface
        public void saveState(String json) {
            try {
                File tmp = new File(getFilesDir(), "arogya-state.tmp");
                try (FileOutputStream o = new FileOutputStream(tmp)) { o.write(json.getBytes(StandardCharsets.UTF_8)); o.getFD().sync(); }
                if (!tmp.renameTo(stateFile())) { stateFile().delete(); tmp.renameTo(stateFile()); }
            } catch (Exception e) { }
        }

        @JavascriptInterface
        public void saveFile(String name, String mime, String text) {
            ui.post(() -> {
                pendingSave = text;
                Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType(mime);
                i.putExtra(Intent.EXTRA_TITLE, name);
                try { startActivityForResult(i, REQ_SAVE); } catch (Exception e) { pendingSave = null; }
            });
        }

        @JavascriptInterface
        public void openFile() {
            ui.post(() -> {
                Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("*/*");
                try { startActivityForResult(i, REQ_OPEN); } catch (Exception e) { }
            });
        }

        /* ---------- Samsung Health ---------- */
        @JavascriptInterface
        public void healthConnect() {
            ui.post(() -> sh.connect(ok -> {
                js("window.onHealthPerm && window.onHealthPerm(" + ok + ")");
            }));
        }

        @JavascriptInterface
        public void healthRead(final int days) {
            new Thread(() -> {
                String j = sh.read(Math.max(1, Math.min(31, days)));
                js("window.onHealth(" + JSONObject.quote(j) + ")");
            }).start();
        }

        /** open another app (Samsung Health makes the watch send its latest readings) */
        @JavascriptInterface
        public boolean openApp(String pkg) {
            Intent i = getPackageManager().getLaunchIntentForPackage(pkg);
            if (i == null) return false;
            ui.post(() -> startActivity(i));
            return true;
        }

        @JavascriptInterface
        public void openStore(String pkg) {
            ui.post(() -> {
                try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=" + pkg))); }
                catch (ActivityNotFoundException e) { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=" + pkg))); }
            });
        }

        /* ---------- water reminders ---------- */
        @JavascriptInterface
        public void setWater(String json) {
            WaterReceiver.prefs(MainActivity.this).edit().putString("cfg", json).apply();
            WaterReceiver.schedule(MainActivity.this);
        }

        @JavascriptInterface
        public String takeWaterAdds() {
            String a = WaterReceiver.prefs(MainActivity.this).getString("adds", "[]");
            WaterReceiver.prefs(MainActivity.this).edit().putString("adds", "[]").apply();
            return a;
        }

        @JavascriptInterface
        public void setMeds(String json) {
            MedReceiver.prefs(MainActivity.this).edit().putString("cfg", json).apply();
            MedReceiver.schedule(MainActivity.this);
        }

        /** what the pop-up reminder card needs: draw over other apps, full-screen on lock screen, notifications */
        @JavascriptInterface
        public String medPerms() {
            try {
                android.app.NotificationManager nm = getSystemService(android.app.NotificationManager.class);
                return new JSONObject().put("overlay", android.provider.Settings.canDrawOverlays(MainActivity.this))
                        .put("fullscreen", Build.VERSION.SDK_INT < 34 || nm.canUseFullScreenIntent())
                        .put("notify", Build.VERSION.SDK_INT < 33 || checkSelfPermission("android.permission.POST_NOTIFICATIONS") == android.content.pm.PackageManager.PERMISSION_GRANTED).toString();
            } catch (Exception e) { return "{}"; }
        }

        @JavascriptInterface
        public void openOverlaySettings() {
            ui.post(() -> { try { startActivity(new Intent(android.provider.Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + getPackageName()))); } catch (Exception ignored) { } });
        }

        @JavascriptInterface
        public void openFullScreenSettings() {
            ui.post(() -> { try { startActivity(new Intent(Build.VERSION.SDK_INT >= 34 ? "android.settings.MANAGE_APP_USE_FULL_SCREEN_INTENT" : android.provider.Settings.ACTION_APP_NOTIFICATION_SETTINGS, Uri.parse("package:" + getPackageName())).putExtra("android.provider.extra.APP_PACKAGE", getPackageName())); } catch (Exception ignored) { } });
        }

        /** status and navigation bar follow the theme */
        @JavascriptInterface
        public void setBars(final String color, final boolean dark) {
            ui.post(() -> {
                try {
                    int c = android.graphics.Color.parseColor(color);
                    getWindow().setStatusBarColor(c); getWindow().setNavigationBarColor(c);
                    android.view.View d = getWindow().getDecorView(); int f = d.getSystemUiVisibility();
                    if (dark) f &= ~(android.view.View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | android.view.View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
                    else f |= android.view.View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | android.view.View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                    d.setSystemUiVisibility(f);
                    web.setBackgroundColor(c);
                } catch (Exception ignored) { }
            });
        }

        @JavascriptInterface
        public void testMed() { MedReceiver.notify(MainActivity.this, "test|now", java.time.LocalDate.now().toString()); }

        @JavascriptInterface
        public String takeMedAdds() {
            String a = MedReceiver.prefs(MainActivity.this).getString("adds", "[]");
            MedReceiver.prefs(MainActivity.this).edit().putString("adds", "[]").apply();
            return a;
        }

        @JavascriptInterface
        public void askNotify() {
            if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission("android.permission.POST_NOTIFICATIONS") != android.content.pm.PackageManager.PERMISSION_GRANTED)
                ui.post(() -> requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"}, REQ_NOTIFY));
        }

        /* ---------- voice + screen ---------- */
        @JavascriptInterface
        public void speak(String text) {
            if (ttsReady) tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "arogya");
        }

        @JavascriptInterface
        public void stopSpeak() { if (ttsReady) tts.stop(); }

        @JavascriptInterface
        public void keepAwake(final boolean on) {
            ui.post(() -> {
                if (on) getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            });
        }

        /* ---------- HTTP (Gemini) ---------- */
        @JavascriptInterface
        public void http(final String id, final String method, final String url, final String headersJson, final String body) {
            new Thread(() -> {
                int status;
                String text;
                HttpURLConnection c = null;
                try {
                    c = (HttpURLConnection) new URL(url).openConnection();
                    c.setRequestMethod(method);
                    c.setConnectTimeout(20000);
                    c.setReadTimeout(180000);
                    JSONObject h = new JSONObject(headersJson == null || headersJson.isEmpty() ? "{}" : headersJson);
                    Iterator<String> it = h.keys();
                    while (it.hasNext()) { String k = it.next(); c.setRequestProperty(k, h.getString(k)); }
                    if (body != null && !body.isEmpty() && !"GET".equals(method)) {
                        c.setDoOutput(true);
                        try (OutputStream o = c.getOutputStream()) { o.write(body.getBytes(StandardCharsets.UTF_8)); }
                    }
                    status = c.getResponseCode();
                    InputStream in = status >= 400 ? c.getErrorStream() : c.getInputStream();
                    text = in == null ? "" : readAll(in);
                } catch (Exception e) {
                    status = 0;
                    text = e.getClass().getSimpleName() + ": " + e.getMessage();
                } finally {
                    if (c != null) c.disconnect();
                }
                js("window.__httpCb(" + JSONObject.quote(id) + "," + status + "," + JSONObject.quote(text) + ")");
            }).start();
        }
    }
}
