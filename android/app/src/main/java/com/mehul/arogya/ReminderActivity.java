package com.mehul.arogya;

import android.app.Activity;
import android.app.KeyguardManager;
import android.app.NotificationManager;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.media.AudioAttributes;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.view.animation.DecelerateInterpolator;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

/** Medicine reminder as a card that slides up from the bottom of the screen, over other apps and the lock screen. */
public class ReminderActivity extends Activity {
    private Ringtone tone;
    private Vibrator vib;
    private final Handler h = new Handler(Looper.getMainLooper());
    private String keys, date;

    private int dp(float v) { return Math.round(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, getResources().getDisplayMetrics())); }

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        if (Build.VERSION.SDK_INT >= 27) { setShowWhenLocked(true); setTurnScreenOn(true); }
        else getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        Intent i = getIntent();
        final boolean prana = "prana".equals(i.getStringExtra("kind"));
        final String route = i.getStringExtra("route");
        keys = i.getStringExtra("keys"); date = i.getStringExtra("date");
        String title = i.getStringExtra("title"), body = i.getStringExtra("body");
        int accent = Color.parseColor(i.getStringExtra("accent") != null ? i.getStringExtra("accent") : "#7C5CFF");

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(0x88000000);
        root.setOnClickListener(v -> { /* tap outside does nothing: decide on the card */ });

        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(dp(22), dp(14), dp(22), dp(26));
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(Color.parseColor("#14121F"));
        float r = dp(28);
        bg.setCornerRadii(new float[]{r, r, r, r, 0, 0, 0, 0});
        card.setBackground(bg);

        View grip = new View(this);
        GradientDrawable g = new GradientDrawable(); g.setColor(0x55FFFFFF); g.setCornerRadius(dp(3));
        grip.setBackground(g);
        LinearLayout.LayoutParams gl = new LinearLayout.LayoutParams(dp(44), dp(5)); gl.gravity = Gravity.CENTER_HORIZONTAL; gl.bottomMargin = dp(18);
        card.addView(grip, gl);

        LinearLayout top = new LinearLayout(this);
        top.setOrientation(LinearLayout.HORIZONTAL); top.setGravity(Gravity.CENTER_VERTICAL);
        TextView pill = new TextView(this);
        pill.setText(prana ? "🧘" : "💊"); pill.setTextSize(26); pill.setGravity(Gravity.CENTER);
        GradientDrawable pb = new GradientDrawable(GradientDrawable.Orientation.TL_BR, new int[]{accent, Color.parseColor("#00D1C1")});
        pb.setCornerRadius(dp(18)); pill.setBackground(pb);
        top.addView(pill, new LinearLayout.LayoutParams(dp(56), dp(56)));
        LinearLayout tx = new LinearLayout(this); tx.setOrientation(LinearLayout.VERTICAL); tx.setPadding(dp(14), 0, 0, 0);
        TextView kick = new TextView(this); kick.setText((prana ? "PRANAYAMA · " : "MEDICINE · ") + new java.text.SimpleDateFormat("h:mm a").format(new java.util.Date()).toLowerCase());
        kick.setTextColor(Color.parseColor("#9F95FF")); kick.setTextSize(12); kick.setTypeface(Typeface.DEFAULT_BOLD); kick.setLetterSpacing(0.08f);
        TextView t = new TextView(this); t.setText(title); t.setTextColor(Color.WHITE); t.setTextSize(21); t.setTypeface(Typeface.DEFAULT_BOLD);
        tx.addView(kick); tx.addView(t);
        top.addView(tx, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));
        card.addView(top);

        TextView bd = new TextView(this); bd.setText(body); bd.setTextColor(Color.parseColor("#C9C5DE")); bd.setTextSize(15.5f); bd.setLineSpacing(dp(3), 1);
        LinearLayout.LayoutParams bl = new LinearLayout.LayoutParams(-1, -2); bl.topMargin = dp(14); bl.bottomMargin = dp(20);
        card.addView(bd, bl);

        Button taken = btn(prana ? "▶  Start now" : "✓  Taken", accent, Color.WHITE);
        card.addView(taken, new LinearLayout.LayoutParams(-1, dp(56)));
        LinearLayout row = new LinearLayout(this); row.setOrientation(LinearLayout.HORIZONTAL);
        LinearLayout.LayoutParams rl = new LinearLayout.LayoutParams(-1, dp(52)); rl.topMargin = dp(10);
        Button snooze = btn("In 15 min", Color.parseColor("#262338"), Color.WHITE);
        Button skip = btn("Skip", Color.parseColor("#262338"), Color.parseColor("#C9C5DE"));
        LinearLayout.LayoutParams half = new LinearLayout.LayoutParams(0, -1, 1);
        LinearLayout.LayoutParams half2 = new LinearLayout.LayoutParams(0, -1, 1); half2.leftMargin = dp(10);
        row.addView(snooze, half); row.addView(skip, half2);
        card.addView(row, rl);

        FrameLayout.LayoutParams cl = new FrameLayout.LayoutParams(-1, -2, Gravity.BOTTOM);
        root.addView(card, cl);
        setContentView(root);

        card.setTranslationY(dp(420));
        card.animate().translationY(0).setDuration(380).setInterpolator(new DecelerateInterpolator(2f)).start();

        taken.setOnClickListener(v -> {
            if (prana) { quiet(); startActivity(new Intent(this, MainActivity.class).putExtra("route", route).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)); getSystemService(NotificationManager.class).cancel(MedReceiver.NID); finish(); }
            else act(MedReceiver.TAKE);
        });
        snooze.setOnClickListener(v -> act(MedReceiver.SNOOZE));
        skip.setOnClickListener(v -> act(MedReceiver.SKIP));
        ring();
    }

    private Button btn(String label, int bgc, int fg) {
        Button b = new Button(this);
        b.setText(label); b.setAllCaps(false); b.setTextSize(16); b.setTypeface(Typeface.DEFAULT_BOLD); b.setTextColor(fg);
        GradientDrawable d = new GradientDrawable(); d.setColor(bgc); d.setCornerRadius(dp(16));
        b.setBackground(d); b.setStateListAnimator(null);
        return b;
    }

    private void ring() {
        try {
            Uri u = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            tone = RingtoneManager.getRingtone(this, u);
            if (tone != null) {
                if (Build.VERSION.SDK_INT >= 28) tone.setLooping(true);
                tone.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
                tone.play();
            }
        } catch (Exception ignored) { }
        try {
            vib = (Vibrator) getSystemService(VIBRATOR_SERVICE);
            if (vib != null) vib.vibrate(VibrationEffect.createWaveform(new long[]{0, 500, 400, 500, 400, 500}, -1));
        } catch (Exception ignored) { }
        h.postDelayed(this::quiet, 30000); // ring for half a minute, then stay quietly on screen
    }

    private void quiet() {
        try { if (tone != null) tone.stop(); } catch (Exception ignored) { }
        try { if (vib != null) vib.cancel(); } catch (Exception ignored) { }
    }

    private void act(String action) {
        quiet();
        sendBroadcast(new Intent(this, MedReceiver.class).setAction(action).putExtra("keys", keys).putExtra("date", date));
        getSystemService(NotificationManager.class).cancel(MedReceiver.NID);
        finish();
        overridePendingTransition(0, android.R.anim.fade_out);
    }

    @Override
    public void onBackPressed() { act(MedReceiver.SNOOZE); }

    @Override
    protected void onDestroy() { quiet(); super.onDestroy(); }
}
