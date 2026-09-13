import Foundation
import HealthKit

@objc(StrictlyHealthKit)
final class StrictlyHealthKit: NSObject {
  private let store = HKHealthStore()

  private func readTypes() -> Set<HKObjectType> {
    var types: Set<HKObjectType> = [HKObjectType.workoutType()]
    [HKQuantityTypeIdentifier.heartRate, .activeEnergyBurned, .distanceWalkingRunning, .distanceCycling, .distanceSwimming]
      .compactMap { HKObjectType.quantityType(forIdentifier: $0) }
      .forEach { types.insert($0) }
    return types
  }

  @objc
  func isAvailable(
    _ resolve: RCTPromiseResolveBlock,
    reject: RCTPromiseRejectBlock
  ) {
    resolve(HKHealthStore.isHealthDataAvailable())
  }

  @objc
  func requestAuthorization(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    guard HKHealthStore.isHealthDataAvailable() else {
      reject("HEALTH_UNAVAILABLE", "Health data is not available on this device.", nil)
      return
    }

    store.requestAuthorization(toShare: [], read: readTypes()) { success, error in
      if let error {
        reject("HEALTH_AUTH_ERROR", error.localizedDescription, error)
      } else {
        resolve(success)
      }
    }
  }

  @objc
  func getAuthorizationRequestStatus(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    store.getRequestStatusForAuthorization(toShare: [], read: readTypes()) { status, error in
      if let error {
        reject("HEALTH_STATUS_ERROR", error.localizedDescription, error)
        return
      }
      switch status {
      case .shouldRequest: resolve("should_request")
      case .unnecessary: resolve("unnecessary")
      default: resolve("unknown")
      }
    }
  }

  @objc
  func getRecentWorkouts(
    _ limit: NSNumber,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    guard HKHealthStore.isHealthDataAvailable() else {
      reject("HEALTH_UNAVAILABLE", "Health data is not available on this device.", nil)
      return
    }

    let start = Calendar.current.date(byAdding: .month, value: -6, to: Date()) ?? .distantPast
    queryWorkouts(start: start, end: Date(), limit: limit.intValue, resolve: resolve, reject: reject)
  }

  @objc
  func getWorkoutsBetween(
    _ startIso: String,
    endIso: String,
    limit: NSNumber,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let formatter = ISO8601DateFormatter()
    guard let start = formatter.date(from: startIso), let end = formatter.date(from: endIso) else {
      reject("HEALTH_DATE_ERROR", "The workout date range was invalid.", nil)
      return
    }
    queryWorkouts(start: start, end: end, limit: limit.intValue, resolve: resolve, reject: reject)
  }

  private func queryWorkouts(
    start: Date,
    end: Date,
    limit: Int,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    // No strict boundary option: a workout crossing midnight should appear on
    // both local days it overlaps rather than disappearing from today's plan.
    let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: [])
    let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)
    let query = HKSampleQuery(
      sampleType: HKObjectType.workoutType(),
      predicate: predicate,
      limit: max(1, min(100, limit)),
      sortDescriptors: [sort]
    ) { _, samples, error in
      if let error {
        reject("HEALTH_QUERY_ERROR", error.localizedDescription, error)
        return
      }
      let workouts = (samples as? [HKWorkout] ?? []).map(self.serialize)
      resolve(workouts)
    }
    store.execute(query)
  }

  private func serialize(_ workout: HKWorkout) -> [String: Any] {
    let mapped = mapActivity(workout.workoutActivityType)
    var result: [String: Any] = [
      "id": workout.uuid.uuidString,
      "activityType": mapped.id,
      "activityLabel": mapped.label,
      "startDate": ISO8601DateFormatter().string(from: workout.startDate),
      "endDate": ISO8601DateFormatter().string(from: workout.endDate),
      "durationMinutes": max(1, Int((workout.duration / 60).rounded())),
      "sourceName": workout.sourceRevision.source.name
    ]
    if let distance = workout.totalDistance?.doubleValue(for: .meterUnit(with: .kilo)), distance > 0 {
      result["distanceKm"] = distance
    }
    if let energy = workout.totalEnergyBurned?.doubleValue(for: .kilocalorie()), energy > 0 {
      result["activeCalories"] = energy
    }
    if #available(iOS 16.0, *),
       let heartRateType = HKObjectType.quantityType(forIdentifier: .heartRate),
       let statistics = workout.statistics(for: heartRateType) {
      let beatsPerMinute = HKUnit.count().unitDivided(by: .minute())
      if let average = statistics.averageQuantity()?.doubleValue(for: beatsPerMinute), average > 0 {
        result["averageHeartRate"] = average
      }
      if let maximum = statistics.maximumQuantity()?.doubleValue(for: beatsPerMinute), maximum > 0 {
        result["maxHeartRate"] = maximum
      }
    }
    return result
  }

  private func mapActivity(_ activity: HKWorkoutActivityType) -> (id: String, label: String) {
    if #available(iOS 16.0, *), activity == .swimBikeRun { return ("triathlon", "Triathlon") }
    switch activity {
    case .running: return ("running", "Run")
    case .walking: return ("walking", "Walk")
    case .cycling, .handCycling: return ("cycling", "Cycling")
    case .swimming: return ("swimming", "Swim")
    case .rowing: return ("rowing", "Rowing")
    case .hiking: return ("hiking", "Hike")
    case .elliptical: return ("elliptical", "Elliptical")
    case .stairClimbing, .stairs: return ("stair_climber", "Stair workout")
    case .traditionalStrengthTraining, .functionalStrengthTraining: return ("strength_training", "Strength")
    case .highIntensityIntervalTraining: return ("hiit", "HIIT")
    case .crossTraining: return ("crossfit", "Cross training")
    case .soccer: return ("soccer", "Soccer")
    case .basketball: return ("basketball", "Basketball")
    case .tennis: return ("tennis", "Tennis")
    case .pickleball: return ("pickleball", "Pickleball")
    case .boxing: return ("boxing", "Boxing")
    case .kickboxing: return ("kickboxing", "Kickboxing")
    case .martialArts: return ("martial_arts", "Martial arts")
    case .snowboarding: return ("snowboarding", "Snowboarding")
    case .downhillSkiing: return ("skiing", "Skiing")
    case .crossCountrySkiing: return ("cross_country_skiing", "Cross-country skiing")
    case .paddleSports: return ("paddleboarding", "Paddle sport")
    case .mixedCardio: return ("general_cardio", "Mixed cardio")
    default: return ("other", "Workout")
    }
  }

  @objc static func requiresMainQueueSetup() -> Bool { false }
}
