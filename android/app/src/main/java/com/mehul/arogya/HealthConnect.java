package com.mehul.arogya;

import android.content.Context;
import android.content.Intent;

import androidx.health.connect.client.HealthConnectClient;
import androidx.health.connect.client.PermissionController;
import androidx.health.connect.client.records.BloodGlucoseRecord;
import androidx.health.connect.client.records.BloodPressureRecord;
import androidx.health.connect.client.records.WeightRecord;
import androidx.health.connect.client.request.ReadRecordsRequest;
import androidx.health.connect.client.response.ReadRecordsResponse;
import androidx.health.connect.client.time.TimeRangeFilter;

import org.json.JSONArray;
import org.json.JSONObject;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import kotlin.coroutines.EmptyCoroutineContext;
import kotlin.jvm.JvmClassMappingKt;
import kotlinx.coroutines.BuildersKt;

/** Reads BP, blood sugar and weight straight from Health Connect (where Omron Connect writes them). */
public class HealthConnect {
    static final String BP = "android.permission.health.READ_BLOOD_PRESSURE", GL = "android.permission.health.READ_BLOOD_GLUCOSE", WT = "android.permission.health.READ_WEIGHT";

    static Set<String> perms() { Set<String> s = new HashSet<>(); s.add(BP); s.add(GL); s.add(WT); return s; }

    /** ok, not_installed, update_needed */
    static String sdk(Context c) {
        int s = HealthConnectClient.getSdkStatus(c, "com.google.android.apps.healthdata");
        if (s == HealthConnectClient.SDK_AVAILABLE) return "ok";
        if (s == HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) return "update_needed";
        return "not_installed";
    }

    static HealthConnectClient client(Context c) { return HealthConnectClient.getOrCreate(c, "com.google.android.apps.healthdata"); }

    static Intent permissionIntent(Context c) {
        return PermissionController.createRequestPermissionResultContract("com.google.android.apps.healthdata").createIntent(c, perms());
    }

    @SuppressWarnings("unchecked")
    static Set<String> granted(Context c) throws Exception {
        final PermissionController pc = client(c).getPermissionController();
        return (Set<String>) BuildersKt.runBlocking(EmptyCoroutineContext.INSTANCE, (scope, cont) -> pc.getGrantedPermissions(cont));
    }

    @SuppressWarnings("unchecked")
    static <T extends androidx.health.connect.client.records.Record> List<T> read(Context c, Class<T> type, int days) throws Exception {
        final HealthConnectClient cl = client(c);
        Instant to = Instant.now(), from = to.minus(days, ChronoUnit.DAYS);
        final ReadRecordsRequest<T> req = new ReadRecordsRequest<>(JvmClassMappingKt.getKotlinClass(type), TimeRangeFilter.between(from, to), Collections.emptySet(), false, 1000, null);
        ReadRecordsResponse<T> r = (ReadRecordsResponse<T>) BuildersKt.runBlocking(EmptyCoroutineContext.INSTANCE, (scope, cont) -> cl.readRecords(req, cont));
        return r.getRecords();
    }

    static String app(androidx.health.connect.client.records.metadata.Metadata m) {
        String p = m.getDataOrigin().getPackageName();
        if (p.contains("omron")) return "Omron";
        if (p.contains("shealth") || p.contains("samsung")) return "Samsung";
        if (p.contains("google.android.apps.fitness")) return "Google Fit";
        return "Health Connect";
    }

    /** everything as JSON for the app */
    static String readAll(Context c, int days) {
        JSONObject o = new JSONObject();
        try {
            String st = sdk(c);
            o.put("status", st);
            if (!"ok".equals(st)) return o.toString();
            Set<String> g = granted(c);
            o.put("granted", new JSONArray(g));
            if (!g.contains(BP) && !g.contains(GL) && !g.contains(WT)) { o.put("status", "no_permission"); return o.toString(); }
            JSONArray bp = new JSONArray(), gl = new JSONArray(), wt = new JSONArray();
            if (g.contains(BP)) for (BloodPressureRecord r : read(c, BloodPressureRecord.class, days))
                bp.put(new JSONObject().put("t", r.getTime().toEpochMilli()).put("sys", Math.round(r.getSystolic().getInMillimetersOfMercury())).put("dia", Math.round(r.getDiastolic().getInMillimetersOfMercury())).put("src", app(r.getMetadata())));
            if (g.contains(GL)) for (BloodGlucoseRecord r : read(c, BloodGlucoseRecord.class, days)) {
                int rel = r.getRelationToMeal();
                gl.put(new JSONObject().put("t", r.getTime().toEpochMilli()).put("mgdl", Math.round(r.getLevel().getInMilligramsPerDeciliter()))
                        .put("type", rel == BloodGlucoseRecord.RELATION_TO_MEAL_FASTING || rel == BloodGlucoseRecord.RELATION_TO_MEAL_BEFORE_MEAL ? "fasting" : rel == BloodGlucoseRecord.RELATION_TO_MEAL_AFTER_MEAL ? "pp" : "random").put("src", app(r.getMetadata())));
            }
            if (g.contains(WT)) for (WeightRecord r : read(c, WeightRecord.class, days))
                wt.put(new JSONObject().put("t", r.getTime().toEpochMilli()).put("kg", Math.round(r.getWeight().getInKilograms() * 10) / 10.0).put("src", app(r.getMetadata())));
            o.put("bp", bp).put("sugar", gl).put("weight", wt).put("readAt", System.currentTimeMillis());
        } catch (Throwable e) {
            try { o.put("status", "error").put("msg", e.getClass().getSimpleName() + ": " + e.getMessage()); } catch (Exception ignored) { }
        }
        return o.toString();
    }
}
