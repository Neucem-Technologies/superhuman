package com.livinsync.health

import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.time.Duration
import java.time.Instant
import java.time.ZoneId
import java.util.UUID

class HealthConnectModule(private val ctx: ReactApplicationContext) :
  ReactContextBaseJavaModule(ctx) {

  private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
  private val permissions = setOf(
    HealthPermission.getReadPermission(StepsRecord::class),
    HealthPermission.getWritePermission(StepsRecord::class),
    HealthPermission.getReadPermission(HeartRateRecord::class),
    HealthPermission.getWritePermission(HeartRateRecord::class),
    HealthPermission.getReadPermission(ExerciseSessionRecord::class),
    HealthPermission.getWritePermission(ExerciseSessionRecord::class),
  )

  override fun getName() = "LivinSyncHealth"

  private fun clientOrNull(): HealthConnectClient? {
    val status = HealthConnectClient.getSdkStatus(ctx)
    if (status != HealthConnectClient.SDK_AVAILABLE) return null
    return HealthConnectClient.getOrCreate(ctx)
  }

  @ReactMethod
  fun authorize(types: ReadableArray, promise: Promise) {
    val activity = currentActivity
    if (activity == null) {
      promise.reject("activity", "No foreground activity to request Health Connect.")
      return
    }
    try {
      val intent = PermissionController.createRequestPermissionResultContract()
        .createIntent(activity, permissions)
      activity.startActivity(intent)
      val map = Arguments.createMap()
      map.putBoolean("granted", false)
      map.putString("platform", "android")
      promise.resolve(map)
    } catch (e: Exception) {
      promise.reject("denied", e.message, e)
    }
  }

  @ReactMethod
  fun getAuthorizationStatus(promise: Promise) {
    scope.launch {
      try {
        val client = clientOrNull()
        if (client == null) {
          val map = Arguments.createMap()
          map.putBoolean("granted", false)
          map.putString("platform", "android")
          promise.resolve(map)
          return@launch
        }
        val granted = client.permissionController.getGrantedPermissions()
        val map = Arguments.createMap()
        map.putBoolean("granted", granted.containsAll(permissions))
        map.putString("platform", "android")
        promise.resolve(map)
      } catch (e: Exception) {
        promise.reject("denied", e.message, e)
      }
    }
  }

  @ReactMethod
  fun getSteps(fromMs: Double, toMs: Double, promise: Promise) {
    scope.launch {
      try {
        val client = clientOrNull() ?: run {
          promise.reject("unavailable", "Health Connect unavailable")
          return@launch
        }
        val res = client.readRecords(
          ReadRecordsRequest(
            StepsRecord::class,
            timeRangeFilter = range(fromMs, toMs),
          ),
        )
        val count = res.records.sumOf { it.count }
        val map = Arguments.createMap()
        map.putInt("count", count.toInt())
        promise.resolve(map)
      } catch (e: Exception) {
        promise.reject("query", e.message, e)
      }
    }
  }

  @ReactMethod
  fun getHeartRate(fromMs: Double, toMs: Double, promise: Promise) {
    scope.launch {
      try {
        val client = clientOrNull() ?: run {
          promise.reject("unavailable", "Health Connect unavailable")
          return@launch
        }
        val res = client.readRecords(
          ReadRecordsRequest(HeartRateRecord::class, timeRangeFilter = range(fromMs, toMs)),
        )
        val samples = Arguments.createArray()
        res.records.forEach { rec ->
          rec.samples.forEach { s ->
            val row = Arguments.createMap()
            row.putDouble("bpm", s.beatsPerMinute.toDouble())
            row.putDouble("at", s.time.toEpochMilli().toDouble())
            samples.pushMap(row)
          }
        }
        val map = Arguments.createMap()
        map.putArray("samples", samples)
        promise.resolve(map)
      } catch (e: Exception) {
        promise.reject("query", e.message, e)
      }
    }
  }

  @ReactMethod
  fun getWorkouts(fromMs: Double, toMs: Double, promise: Promise) {
    scope.launch {
      try {
        val client = clientOrNull() ?: run {
          promise.reject("unavailable", "Health Connect unavailable")
          return@launch
        }
        val res = client.readRecords(
          ReadRecordsRequest(ExerciseSessionRecord::class, timeRangeFilter = range(fromMs, toMs)),
        )
        val workouts = Arguments.createArray()
        res.records.forEach { rec ->
          val row = Arguments.createMap()
          row.putString("id", rec.metadata.id)
          row.putString("activity", activityName(rec.exerciseType))
          row.putDouble("start", rec.startTime.toEpochMilli().toDouble())
          row.putDouble("end", rec.endTime.toEpochMilli().toDouble())
          row.putString("source", "health-connect")
          workouts.pushMap(row)
        }
        val map = Arguments.createMap()
        map.putArray("workouts", workouts)
        promise.resolve(map)
      } catch (e: Exception) {
        promise.reject("query", e.message, e)
      }
    }
  }

  @ReactMethod
  fun getSummary(fromMs: Double, toMs: Double, promise: Promise) {
    scope.launch {
      try {
        val client = clientOrNull() ?: run {
          promise.reject("unavailable", "Health Connect unavailable")
          return@launch
        }
        val steps = client.readRecords(
          ReadRecordsRequest(StepsRecord::class, timeRangeFilter = range(fromMs, toMs)),
        ).records.sumOf { it.count }
        val hr = client.readRecords(
          ReadRecordsRequest(HeartRateRecord::class, timeRangeFilter = range(fromMs, toMs)),
        ).records.flatMap { it.samples }
        val sessions = client.readRecords(
          ReadRecordsRequest(ExerciseSessionRecord::class, timeRangeFilter = range(fromMs, toMs)),
        ).records
        val bpms = hr.map { it.beatsPerMinute.toDouble() }
        val active = sessions.sumOf { Duration.between(it.startTime, it.endTime).toMinutes() }
        val map = Arguments.createMap()
        map.putString("date", Instant.ofEpochMilli(fromMs.toLong()).toString().take(10))
        map.putInt("steps", steps.toInt())
        if (bpms.isNotEmpty()) {
          map.putInt("restingBpm", bpms.minOrNull()!!.toInt())
          map.putInt("avgBpm", (bpms.average()).toInt())
          map.putInt("latestBpm", bpms.last().toInt())
        }
        map.putInt("workouts", sessions.size)
        map.putInt("activeMinutes", active.toInt())
        map.putString("platform", "android")
        map.putBoolean("authorized", true)
        promise.resolve(map)
      } catch (e: Exception) {
        promise.reject("query", e.message, e)
      }
    }
  }

  @ReactMethod
  fun writeSteps(count: Double, startMs: Double, endMs: Double, promise: Promise) {
    scope.launch {
      try {
        val client = clientOrNull() ?: run {
          promise.reject("unavailable", "Health Connect unavailable")
          return@launch
        }
        val rec = StepsRecord(
          startTime = Instant.ofEpochMilli(startMs.toLong()),
          startZoneOffset = ZoneId.systemDefault().rules.getOffset(Instant.ofEpochMilli(startMs.toLong())),
          endTime = Instant.ofEpochMilli(endMs.toLong()),
          endZoneOffset = ZoneId.systemDefault().rules.getOffset(Instant.ofEpochMilli(endMs.toLong())),
          count = count.toLong().coerceAtLeast(1),
        )
        client.insertRecords(listOf(rec))
        val map = Arguments.createMap()
        map.putBoolean("ok", true)
        promise.resolve(map)
      } catch (e: Exception) {
        promise.reject("write", e.message, e)
      }
    }
  }

  @ReactMethod
  fun writeHeartRate(bpm: Double, atMs: Double, promise: Promise) {
    scope.launch {
      try {
        val client = clientOrNull() ?: run {
          promise.reject("unavailable", "Health Connect unavailable")
          return@launch
        }
        val at = Instant.ofEpochMilli(atMs.toLong())
        val rec = HeartRateRecord(
          startTime = at,
          startZoneOffset = ZoneId.systemDefault().rules.getOffset(at),
          endTime = at.plusSeconds(1),
          endZoneOffset = ZoneId.systemDefault().rules.getOffset(at),
          samples = listOf(HeartRateRecord.Sample(at, bpm.toLong().coerceIn(30, 250))),
        )
        client.insertRecords(listOf(rec))
        val map = Arguments.createMap()
        map.putBoolean("ok", true)
        promise.resolve(map)
      } catch (e: Exception) {
        promise.reject("write", e.message, e)
      }
    }
  }

  @ReactMethod
  fun writeWorkout(input: ReadableMap, promise: Promise) {
    scope.launch {
      try {
        val client = clientOrNull() ?: run {
          promise.reject("unavailable", "Health Connect unavailable")
          return@launch
        }
        val start = Instant.ofEpochMilli(input.getDouble("startMs").toLong())
        val end = Instant.ofEpochMilli(input.getDouble("endMs").toLong())
        val rec = ExerciseSessionRecord(
          startTime = start,
          startZoneOffset = ZoneId.systemDefault().rules.getOffset(start),
          endTime = end,
          endZoneOffset = ZoneId.systemDefault().rules.getOffset(end),
          exerciseType = activityType(input.getString("activity") ?: "other"),
          title = input.getString("activity") ?: "Workout",
        )
        client.insertRecords(listOf(rec))
        val map = Arguments.createMap()
        map.putString("id", rec.metadata.id.ifEmpty { UUID.randomUUID().toString() })
        promise.resolve(map)
      } catch (e: Exception) {
        promise.reject("write", e.message, e)
      }
    }
  }

  private fun range(fromMs: Double, toMs: Double) =
    TimeRangeFilter.between(Instant.ofEpochMilli(fromMs.toLong()), Instant.ofEpochMilli(toMs.toLong()))

  private fun activityType(name: String): Int =
    when (name.lowercase()) {
      "running" -> ExerciseSessionRecord.EXERCISE_TYPE_RUNNING
      "walking" -> ExerciseSessionRecord.EXERCISE_TYPE_WALKING
      "cycling" -> ExerciseSessionRecord.EXERCISE_TYPE_BIKING
      "strength" -> ExerciseSessionRecord.EXERCISE_TYPE_STRENGTH_TRAINING
      "yoga" -> ExerciseSessionRecord.EXERCISE_TYPE_YOGA
      else -> ExerciseSessionRecord.EXERCISE_TYPE_OTHER_WORKOUT
    }

  private fun activityName(type: Int): String =
    when (type) {
      ExerciseSessionRecord.EXERCISE_TYPE_RUNNING -> "running"
      ExerciseSessionRecord.EXERCISE_TYPE_WALKING -> "walking"
      ExerciseSessionRecord.EXERCISE_TYPE_BIKING -> "cycling"
      ExerciseSessionRecord.EXERCISE_TYPE_STRENGTH_TRAINING -> "strength"
      ExerciseSessionRecord.EXERCISE_TYPE_YOGA -> "yoga"
      else -> "other"
    }
}
