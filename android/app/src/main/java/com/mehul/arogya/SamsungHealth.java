package com.mehul.arogya;

import android.app.Activity;

import com.samsung.android.sdk.health.data.HealthDataService;
import com.samsung.android.sdk.health.data.HealthDataStore;
import com.samsung.android.sdk.health.data.data.AggregatedData;
import com.samsung.android.sdk.health.data.data.HealthDataPoint;
import com.samsung.android.sdk.health.data.data.entries.SleepSession;
import com.samsung.android.sdk.health.data.error.ErrorCode;
import com.samsung.android.sdk.health.data.error.HealthDataException;
import com.samsung.android.sdk.health.data.error.ResolvablePlatformException;
import com.samsung.android.sdk.health.data.permission.AccessType;
import com.samsung.android.sdk.health.data.permission.Permission;
import com.samsung.android.sdk.health.data.request.AggregateRequest;
import com.samsung.android.sdk.health.data.request.DataType;
import com.samsung.android.sdk.health.data.request.DataTypes;
import com.samsung.android.sdk.health.data.request.LocalDateFilter;
import com.samsung.android.sdk.health.data.request.LocalTimeFilter;
import com.samsung.android.sdk.health.data.request.LocalTimeGroup;
import com.samsung.android.sdk.health.data.request.LocalTimeGroupUnit;
import com.samsung.android.sdk.health.data.request.ReadDataRequest;
import com.samsung.android.sdk.health.data.response.DataResponse;

import org.json.JSONArray;
import org.json.JSONObject;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.function.Consumer;

/** Reads Samsung Health (Samsung Health Data SDK) and returns one JSON blob for the web UI. */
public class SamsungHealth {
    private final Activity act;
    private HealthDataStore store;

    SamsungHealth(Activity a) { act = a; }

    private HealthDataStore store() {
        if (store == null) store = HealthDataService.getStore(act.getApplicationContext());
        return store;
    }

    static Set<Permission> perms() {
        Set<Permission> s = new HashSet<>();
        s.add(Permission.of(DataTypes.STEPS, AccessType.READ));
        s.add(Permission.of(DataTypes.SLEEP, AccessType.READ));
        s.add(Permission.of(DataTypes.HEART_RATE, AccessType.READ));
        s.add(Permission.of(DataTypes.BLOOD_OXYGEN, AccessType.READ));
        s.add(Permission.of(DataTypes.BLOOD_PRESSURE, AccessType.READ));
        s.add(Permission.of(DataTypes.BLOOD_GLUCOSE, AccessType.READ));
        s.add(Permission.of(DataTypes.BODY_COMPOSITION, AccessType.READ));
        s.add(Permission.of(DataTypes.ENERGY_SCORE, AccessType.READ));
        s.add(Permission.of(DataTypes.ACTIVITY_SUMMARY, AccessType.READ));
        s.add(Permission.of(DataTypes.EXERCISE, AccessType.READ));
        return s;
    }

    static String statusOf(Throwable e) {
        Throwable t = e;
        while (t != null && !(t instanceof HealthDataException) && t.getCause() != null && t.getCause() != t) t = t.getCause();
        if (t instanceof HealthDataException) {
            Integer c = ((HealthDataException) t).getErrorCode();
            if (c != null) {
                if (c == ErrorCode.ERR_PLATFORM_NOT_INSTALLED) return "not_installed";
                if (c == ErrorCode.ERR_OLD_VERSION_PLATFORM) return "old_version";
                if (c == ErrorCode.ERR_PLATFORM_DISABLED) return "disabled";
                if (c == ErrorCode.ERR_PLATFORM_NOT_INITIALIZED) return "not_initialized";
                if (c == ErrorCode.ERR_NO_USER_PERMISSION) return "no_permission";
                if (c == ErrorCode.ERR_INVALID_CALLER || c == ErrorCode.ERR_ACCESS_CONTROL || c == ErrorCode.ERR_INVALID_PLATFORM_SIGNATURE) return "dev_mode";
            }
        }
        return "error";
    }

    static String msgOf(Throwable e) {
        Throwable t = e;
        while (t.getCause() != null && t.getCause() != t) t = t.getCause();
        String m = t instanceof HealthDataException ? ((HealthDataException) t).getErrorMessage() : t.getMessage();
        return m == null ? t.getClass().getSimpleName() : m;
    }

    /** Ask for read permission (main thread). Calls done(granted?) when finished. */
    void connect(Consumer<Boolean> done) {
        try {
            store().requestPermissionsAsync(perms(), act).setCallback(act.getMainLooper(),
                    granted -> done.accept(granted != null && !granted.isEmpty()),
                    err -> {
                        Throwable t = err;
                        while (t.getCause() != null && !(t instanceof ResolvablePlatformException)) t = t.getCause();
                        if (t instanceof ResolvablePlatformException && ((ResolvablePlatformException) t).getHasResolution()) {
                            try { ((ResolvablePlatformException) t).resolve(act); } catch (Exception ignored) { }
                        }
                        done.accept(false);
                    });
        } catch (Exception e) {
            done.accept(false);
        }
    }

    private static long ms(Instant i) { return i == null ? 0 : i.toEpochMilli(); }
    private static String dk(LocalDate d) { return d.toString(); }
    private static String dkOf(Instant i) { return dk(i.atZone(ZoneId.systemDefault()).toLocalDate()); }

    private List<HealthDataPoint> readAll(ReadDataRequest.DualTimeBuilder<HealthDataPoint> b) throws Exception {
        List<HealthDataPoint> out = new ArrayList<>();
        String tok = null;
        for (int page = 0; page < 30; page++) {
            if (tok != null) b.setPageToken(tok);
            DataResponse<HealthDataPoint> r = store().readDataAsync(b.build()).get();
            out.addAll(r.getDataList());
            tok = r.getPageToken();
            if (tok == null || tok.isEmpty()) break;
        }
        return out;
    }

    private <T> Map<String, T> daily(AggregateRequest.LocalTimeBuilder<T> b, LocalDateTime from, LocalDateTime to) throws Exception {
        AggregateRequest<T> req = b.setLocalTimeFilterWithGroup(LocalTimeFilter.of(from, to), LocalTimeGroup.of(LocalTimeGroupUnit.DAILY, 1)).build();
        DataResponse<AggregatedData<T>> r = store().aggregateDataAsync(req).get();
        Map<String, T> m = new TreeMap<>();
        for (AggregatedData<T> a : r.getDataList()) if (a.getValue() != null) m.put(dk(a.getStartLocalDateTime().toLocalDate()), a.getValue());
        return m;
    }

    /** Blocking read; call off the main thread. */
    String read(int days) {
        JSONObject o = new JSONObject();
        try {
            Set<Permission> g = store().getGrantedPermissionsAsync(perms()).get();
            if (g == null || g.isEmpty()) { o.put("status", "no_permission"); return o.toString(); }
            o.put("status", "ok");
            LocalDate today = LocalDate.now();
            LocalDateTime from = today.minusDays(days - 1).atStartOfDay(), to = today.plusDays(1).atStartOfDay();
            JSONArray errs = new JSONArray();

            try {
                JSONObject steps = new JSONObject();
                for (Map.Entry<String, Long> e : daily(DataType.StepsType.TOTAL.getRequestBuilder(), from, to).entrySet()) steps.put(e.getKey(), e.getValue());
                o.put("steps", steps);
            } catch (Exception e) { errs.put("steps: " + msgOf(e)); }

            try {
                JSONObject ak = new JSONObject(), dist = new JSONObject();
                for (Map.Entry<String, Float> e : daily(DataType.ActivitySummaryType.TOTAL_ACTIVE_CALORIES_BURNED.getRequestBuilder(), from, to).entrySet()) ak.put(e.getKey(), e.getValue());
                for (Map.Entry<String, Float> e : daily(DataType.ActivitySummaryType.TOTAL_DISTANCE.getRequestBuilder(), from, to).entrySet()) dist.put(e.getKey(), e.getValue());
                o.put("activeKcal", ak); o.put("distance", dist);
            } catch (Exception e) { errs.put("activity: " + msgOf(e)); }

            try {
                JSONArray sl = new JSONArray();
                for (HealthDataPoint p : readAll(DataTypes.SLEEP.getReadDataRequestBuilder().setLocalTimeFilter(LocalTimeFilter.of(from.minusDays(1), to)))) {
                    JSONObject s = new JSONObject();
                    s.put("start", ms(p.getStartTime())); s.put("end", ms(p.getEndTime()));
                    Integer sc = null; try { sc = p.getValue(DataType.SleepType.SLEEP_SCORE); } catch (Exception ignored) { }
                    s.put("score", sc == null ? 0 : sc);
                    JSONArray st = new JSONArray();
                    List<SleepSession> ss = null; try { ss = p.getValue(DataType.SleepType.SESSIONS); } catch (Exception ignored) { }
                    if (ss != null) for (SleepSession x : ss) {
                        if (x.getStages() == null) continue;
                        for (SleepSession.SleepStage g2 : x.getStages()) {
                            JSONObject q = new JSONObject();
                            q.put("s", ms(g2.getStartTime())); q.put("e", ms(g2.getEndTime()));
                            String n = g2.getStage() == null ? "light" : g2.getStage().name().toLowerCase();
                            q.put("type", n.equals("undefined") ? "light" : n);
                            st.put(q);
                        }
                    }
                    s.put("stages", st);
                    sl.put(s);
                }
                o.put("sleep", sl);
            } catch (Exception e) { errs.put("sleep: " + msgOf(e)); }

            try {
                Map<String, float[]> d = new TreeMap<>(); // min, max, sum, n
                List<HealthDataPoint> hr = readAll(DataTypes.HEART_RATE.getReadDataRequestBuilder().setLocalTimeFilter(LocalTimeFilter.of(from, to)));
                JSONArray recent = new JSONArray();
                for (HealthDataPoint p : hr) {
                    Float v = p.getValue(DataType.HeartRateType.HEART_RATE);
                    if (v == null || v <= 0) continue;
                    Float mn = null, mx = null;
                    try { mn = p.getValue(DataType.HeartRateType.MIN_HEART_RATE); mx = p.getValue(DataType.HeartRateType.MAX_HEART_RATE); } catch (Exception ignored) { }
                    String k = dkOf(p.getStartTime());
                    float[] a = d.get(k); if (a == null) { a = new float[]{999, 0, 0, 0}; d.put(k, a); }
                    a[0] = Math.min(a[0], mn != null && mn > 0 ? mn : v); a[1] = Math.max(a[1], mx != null && mx > 0 ? mx : v); a[2] += v; a[3]++;
                }
                JSONObject hj = new JSONObject(), rh = new JSONObject();
                for (Map.Entry<String, float[]> e : d.entrySet()) {
                    float[] a = e.getValue();
                    hj.put(e.getKey(), new JSONObject().put("min", Math.round(a[0])).put("max", Math.round(a[1])).put("avg", Math.round(a[2] / a[3])));
                    rh.put(e.getKey(), Math.round(a[0]));
                }
                int from2 = Math.max(0, hr.size() - 40);
                List<HealthDataPoint> sorted = new ArrayList<>(hr);
                sorted.sort((x, y) -> Long.compare(ms(x.getStartTime()), ms(y.getStartTime())));
                for (int i = Math.max(0, sorted.size() - 40); i < sorted.size(); i++) {
                    HealthDataPoint p = sorted.get(i); Float v = p.getValue(DataType.HeartRateType.HEART_RATE);
                    if (v != null && v > 0) recent.put(new JSONObject().put("t", ms(p.getEndTime() != null ? p.getEndTime() : p.getStartTime())).put("bpm", Math.round(v)));
                }
                o.put("hr", hj); o.put("restingHr", rh); o.put("hrRecent", recent);
            } catch (Exception e) { errs.put("heart rate: " + msgOf(e)); }

            try {
                JSONArray sp = new JSONArray();
                for (HealthDataPoint p : readAll(DataTypes.BLOOD_OXYGEN.getReadDataRequestBuilder().setLocalTimeFilter(LocalTimeFilter.of(today.minusDays(2).atStartOfDay(), to)))) {
                    Float v = p.getValue(DataType.BloodOxygenType.OXYGEN_SATURATION);
                    if (v != null && v > 0) sp.put(new JSONObject().put("t", ms(p.getStartTime())).put("pct", Math.round(v)));
                }
                o.put("spo2", sp);
            } catch (Exception e) { errs.put("oxygen: " + msgOf(e)); }

            LocalDateTime longAgo = today.minusDays(120).atStartOfDay();
            try {
                JSONArray bp = new JSONArray();
                for (HealthDataPoint p : readAll(DataTypes.BLOOD_PRESSURE.getReadDataRequestBuilder().setLocalTimeFilter(LocalTimeFilter.of(longAgo, to)))) {
                    Float s = p.getValue(DataType.BloodPressureType.SYSTOLIC), di = p.getValue(DataType.BloodPressureType.DIASTOLIC);
                    Integer pu = null; try { pu = p.getValue(DataType.BloodPressureType.PULSE_RATE); } catch (Exception ignored) { }
                    if (s != null && di != null) bp.put(new JSONObject().put("t", ms(p.getStartTime())).put("sys", Math.round(s)).put("dia", Math.round(di)).put("pulse", pu == null ? 0 : pu));
                }
                o.put("bp", bp);
            } catch (Exception e) { errs.put("BP: " + msgOf(e)); }

            try {
                JSONArray gl = new JSONArray();
                for (HealthDataPoint p : readAll(DataTypes.BLOOD_GLUCOSE.getReadDataRequestBuilder().setLocalTimeFilter(LocalTimeFilter.of(longAgo, to)))) {
                    Float v = p.getValue(DataType.BloodGlucoseType.GLUCOSE_LEVEL);
                    if (v == null || v <= 0) continue;
                    float mg = v < 35 ? v * 18.016f : v;
                    String rel = "random";
                    try {
                        Object st = p.getValue(DataType.BloodGlucoseType.MEAL_STATUS);
                        String n = st == null ? "" : st.toString();
                        if (n.equals("FASTING") || n.equals("BEFORE_BREAKFAST")) rel = "fasting";
                        else if (n.startsWith("AFTER_")) rel = "pp";
                    } catch (Exception ignored) { }
                    gl.put(new JSONObject().put("t", ms(p.getStartTime())).put("mgdl", Math.round(mg)).put("relation", rel));
                }
                o.put("glucose", gl);
            } catch (Exception e) { errs.put("sugar: " + msgOf(e)); }

            try {
                JSONArray w = new JSONArray();
                for (HealthDataPoint p : readAll(DataTypes.BODY_COMPOSITION.getReadDataRequestBuilder().setLocalTimeFilter(LocalTimeFilter.of(longAgo, to)))) {
                    Float v = p.getValue(DataType.BodyCompositionType.WEIGHT);
                    if (v != null && v > 0) w.put(new JSONObject().put("t", ms(p.getStartTime())).put("kg", Math.round(v * 10) / 10.0));
                }
                o.put("weight", w);
            } catch (Exception e) { errs.put("weight: " + msgOf(e)); }

            try {
                JSONObject en = new JSONObject();
                DataResponse<HealthDataPoint> r = store().readDataAsync(DataTypes.ENERGY_SCORE.getReadDataRequestBuilder().setLocalDateFilter(LocalDateFilter.of(today.minusDays(days - 1), today.plusDays(1))).build()).get();
                for (HealthDataPoint p : r.getDataList()) {
                    Float v = p.getValue(DataType.EnergyScoreType.ENERGY_SCORE);
                    if (v != null) en.put(dk(p.getStartLocalDateTime().toLocalDate()), Math.round(v));
                }
                o.put("energy", en);
            } catch (Exception e) { errs.put("energy: " + msgOf(e)); }

            try {
                JSONArray ex = new JSONArray();
                for (HealthDataPoint p : readAll(DataTypes.EXERCISE.getReadDataRequestBuilder().setLocalTimeFilter(LocalTimeFilter.of(today.minusDays(2).atStartOfDay(), to)))) {
                    String title = null;
                    try { title = p.getValue(DataType.ExerciseType.CUSTOM_TITLE); } catch (Exception ignored) { }
                    if (title == null || title.isEmpty()) {
                        try { Object t = p.getValue(DataType.ExerciseType.EXERCISE_TYPE); if (t != null) { String n = t.toString().replace('_', ' ').toLowerCase(); title = Character.toUpperCase(n.charAt(0)) + n.substring(1); } } catch (Exception ignored) { }
                    }
                    ex.put(new JSONObject().put("start", ms(p.getStartTime())).put("end", ms(p.getEndTime())).put("title", title == null ? "Workout" : title));
                }
                o.put("exercise", ex);
            } catch (Exception e) { errs.put("exercise: " + msgOf(e)); }

            o.put("errors", errs);
        } catch (Exception e) {
            try { o.put("status", statusOf(e)); o.put("msg", msgOf(e)); } catch (Exception ignored) { }
        }
        return o.toString();
    }
}
