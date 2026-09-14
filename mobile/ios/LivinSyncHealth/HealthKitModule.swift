import Foundation
import HealthKit
import React

@objc(LivinSyncHealth)
class LivinSyncHealth: NSObject {
  private let store = HKHealthStore()

  private var readTypes: Set<HKObjectType> {
    var set: Set<HKObjectType> = []
    if let steps = HKObjectType.quantityType(forIdentifier: .stepCount) { set.insert(steps) }
    if let hr = HKObjectType.quantityType(forIdentifier: .heartRate) { set.insert(hr) }
    if let energy = HKObjectType.quantityType(forIdentifier: .activeEnergyBurned) { set.insert(energy) }
    set.insert(HKObjectType.workoutType())
    return set
  }

  private var writeTypes: Set<HKSampleType> {
    var set: Set<HKSampleType> = []
    if let steps = HKObjectType.quantityType(forIdentifier: .stepCount) { set.insert(steps) }
    if let hr = HKObjectType.quantityType(forIdentifier: .heartRate) { set.insert(hr) }
    if let energy = HKObjectType.quantityType(forIdentifier: .activeEnergyBurned) { set.insert(energy) }
    set.insert(HKObjectType.workoutType())
    return set
  }

  @objc static func requiresMainQueueSetup() -> Bool { true }

  @objc(authorize:resolver:rejecter:)
  func authorize(
    _ types: [String],
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    guard HKHealthStore.isHealthDataAvailable() else {
      reject("unavailable", "HealthKit is not available on this device.", nil)
      return
    }
    store.requestAuthorization(toShare: writeTypes, read: readTypes) { ok, error in
      if let error {
        reject("denied", error.localizedDescription, error)
        return
      }
      resolve(["granted": ok, "platform": "ios"])
    }
  }

  @objc(getAuthorizationStatus:rejecter:)
  func getAuthorizationStatus(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    guard HKHealthStore.isHealthDataAvailable() else {
      resolve(["granted": false, "platform": "ios"])
      return
    }
    guard let steps = HKObjectType.quantityType(forIdentifier: .stepCount) else {
      resolve(["granted": false, "platform": "ios"])
      return
    }
    let status = store.authorizationStatus(for: steps)
    resolve(["granted": status != .notDetermined, "platform": "ios"])
  }

  @objc(getSteps:to:resolver:rejecter:)
  func getSteps(
    _ fromMs: Double,
    to toMs: Double,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let type = HKQuantityType.quantityType(forIdentifier: .stepCount) else {
      reject("type", "stepCount unavailable", nil)
      return
    }
    sum(type: type, unit: HKUnit.count(), from: fromMs, to: toMs, resolve: resolve, reject: reject) { sum in
      ["count": Int(sum.rounded())]
    }
  }

  @objc(getHeartRate:to:resolver:rejecter:)
  func getHeartRate(
    _ fromMs: Double,
    to toMs: Double,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let type = HKQuantityType.quantityType(forIdentifier: .heartRate) else {
      reject("type", "heartRate unavailable", nil)
      return
    }
    let pred = HKQuery.predicateForSamples(
      withStart: Date(timeIntervalSince1970: fromMs / 1000),
      end: Date(timeIntervalSince1970: toMs / 1000),
      options: .strictStartDate
    )
    let query = HKSampleQuery(sampleType: type, predicate: pred, limit: 200, sortDescriptors: [
      NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false),
    ]) { _, samples, error in
      if let error {
        reject("query", error.localizedDescription, error)
        return
      }
      let unit = HKUnit.count().unitDivided(by: HKUnit.minute())
      let rows = (samples as? [HKQuantitySample] ?? []).map { s in
        ["bpm": s.quantity.doubleValue(for: unit), "at": s.startDate.timeIntervalSince1970 * 1000]
      }
      resolve(["samples": rows])
    }
    store.execute(query)
  }

  @objc(getWorkouts:to:resolver:rejecter:)
  func getWorkouts(
    _ fromMs: Double,
    to toMs: Double,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let pred = HKQuery.predicateForSamples(
      withStart: Date(timeIntervalSince1970: fromMs / 1000),
      end: Date(timeIntervalSince1970: toMs / 1000),
      options: .strictStartDate
    )
    let query = HKSampleQuery(sampleType: .workoutType(), predicate: pred, limit: 50, sortDescriptors: [
      NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false),
    ]) { _, samples, error in
      if let error {
        reject("query", error.localizedDescription, error)
        return
      }
      let rows = (samples as? [HKWorkout] ?? []).map { w -> [String: Any] in
        var row: [String: Any] = [
          "id": w.uuid.uuidString,
          "activity": Self.activityName(w.workoutActivityType),
          "start": w.startDate.timeIntervalSince1970 * 1000,
          "end": w.endDate.timeIntervalSince1970 * 1000,
          "source": "healthkit",
        ]
        if let cal = w.totalEnergyBurned {
          row["caloriesKcal"] = cal.doubleValue(for: .kilocalorie())
        }
        if let dist = w.totalDistance {
          row["distanceM"] = dist.doubleValue(for: .meter())
        }
        return row
      }
      resolve(["workouts": rows])
    }
    store.execute(query)
  }

  @objc(getSummary:to:resolver:rejecter:)
  func getSummary(
    _ fromMs: Double,
    to toMs: Double,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    getSteps(fromMs, to: toMs, resolve: { stepsAny in
      self.getHeartRate(fromMs, to: toMs, resolve: { hrAny in
        self.getWorkouts(fromMs, to: toMs, resolve: { woAny in
          let steps = (stepsAny as? [String: Any])?["count"] as? Int ?? 0
          let samples = (hrAny as? [String: Any])?["samples"] as? [[String: Any]] ?? []
          let workouts = (woAny as? [String: Any])?["workouts"] as? [[String: Any]] ?? []
          let bpms = samples.compactMap { $0["bpm"] as? Double }
          let active = workouts.reduce(0.0) { acc, w in
            let s = (w["start"] as? Double ?? 0)
            let e = (w["end"] as? Double ?? 0)
            return acc + max(0, (e - s) / 60000)
          }
          let cals = workouts.compactMap { $0["caloriesKcal"] as? Double }.reduce(0, +)
          let formatter = ISO8601DateFormatter()
          formatter.formatOptions = [.withFullDate]
          resolve([
            "date": formatter.string(from: Date(timeIntervalSince1970: fromMs / 1000)),
            "steps": steps,
            "restingBpm": bpms.min().map { Int($0.rounded()) } as Any,
            "avgBpm": bpms.isEmpty ? NSNull() : Int((bpms.reduce(0, +) / Double(bpms.count)).rounded()),
            "latestBpm": bpms.first.map { Int($0.rounded()) } as Any,
            "workouts": workouts.count,
            "activeMinutes": Int(active.rounded()),
            "caloriesKcal": cals,
            "platform": "ios",
            "authorized": true,
          ])
        }, reject: reject)
      }, reject: reject)
    }, reject: reject)
  }

  @objc(writeSteps:start:end:resolver:rejecter:)
  func writeSteps(
    _ count: Double,
    start startMs: Double,
    end endMs: Double,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let type = HKQuantityType.quantityType(forIdentifier: .stepCount) else {
      reject("type", "stepCount unavailable", nil)
      return
    }
    let sample = HKQuantitySample(
      type: type,
      quantity: HKQuantity(unit: .count(), doubleValue: count),
      start: Date(timeIntervalSince1970: startMs / 1000),
      end: Date(timeIntervalSince1970: endMs / 1000)
    )
    store.save(sample) { ok, error in
      if let error { reject("write", error.localizedDescription, error); return }
      resolve(["ok": ok])
    }
  }

  @objc(writeHeartRate:at:resolver:rejecter:)
  func writeHeartRate(
    _ bpm: Double,
    at atMs: Double,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let type = HKQuantityType.quantityType(forIdentifier: .heartRate) else {
      reject("type", "heartRate unavailable", nil)
      return
    }
    let unit = HKUnit.count().unitDivided(by: .minute())
    let at = Date(timeIntervalSince1970: atMs / 1000)
    let sample = HKQuantitySample(type: type, quantity: HKQuantity(unit: unit, doubleValue: bpm), start: at, end: at)
    store.save(sample) { ok, error in
      if let error { reject("write", error.localizedDescription, error); return }
      resolve(["ok": ok])
    }
  }

  @objc(writeWorkout:resolver:rejecter:)
  func writeWorkout(
    _ input: NSDictionary,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let activityName = (input["activity"] as? String ?? "other").lowercased()
    let start = Date(timeIntervalSince1970: (input["startMs"] as? Double ?? 0) / 1000)
    let end = Date(timeIntervalSince1970: (input["endMs"] as? Double ?? 0) / 1000)
    let config = HKWorkoutConfiguration()
    config.activityType = Self.activityType(activityName)
    if #available(iOS 17.0, *) {
      let builder = HKWorkoutBuilder(healthStore: store, configuration: config, device: .local())
      builder.beginCollection(withStart: start) { _, error in
        if let error { reject("write", error.localizedDescription, error); return }
        builder.endCollection(withEnd: end) { _, error in
          if let error { reject("write", error.localizedDescription, error); return }
          builder.finishWorkout { workout, error in
            if let error { reject("write", error.localizedDescription, error); return }
            resolve(["id": workout?.uuid.uuidString ?? UUID().uuidString])
          }
        }
      }
      return
    }
    reject("write", "iOS 17 required to write workouts in this companion.", nil)
  }

  private func sum(
    type: HKQuantityType,
    unit: HKUnit,
    from: Double,
    to: Double,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock,
    map: @escaping (Double) -> [String: Any]
  ) {
    let pred = HKQuery.predicateForSamples(
      withStart: Date(timeIntervalSince1970: from / 1000),
      end: Date(timeIntervalSince1970: to / 1000),
      options: .strictStartDate
    )
    let query = HKStatisticsQuery(quantityType: type, quantitySamplePredicate: pred, options: .cumulativeSum) { _, stats, error in
      if let error { reject("query", error.localizedDescription, error); return }
      let value = stats?.sumQuantity()?.doubleValue(for: unit) ?? 0
      resolve(map(value))
    }
    store.execute(query)
  }

  private static func activityType(_ name: String) -> HKWorkoutActivityType {
    switch name {
    case "running": return .running
    case "walking": return .walking
    case "cycling": return .cycling
    case "strength", "traditionalstrengthtraining": return .traditionalStrengthTraining
    case "yoga": return .yoga
    default: return .other
    }
  }

  private static func activityName(_ type: HKWorkoutActivityType) -> String {
    switch type {
    case .running: return "running"
    case .walking: return "walking"
    case .cycling: return "cycling"
    case .traditionalStrengthTraining: return "strength"
    case .yoga: return "yoga"
    default: return "other"
    }
  }
}
