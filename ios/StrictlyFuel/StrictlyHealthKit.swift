import Foundation
import HealthKit

@objc(StrictlyHealthKit)
final class StrictlyHealthKit: NSObject {
  private let store = HKHealthStore()

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

    let readTypes: Set<HKObjectType> = [HKObjectType.workoutType()]
    store.requestAuthorization(toShare: [], read: readTypes) { success, error in
      if let error {
        reject("HEALTH_AUTH_ERROR", error.localizedDescription, error)
      } else {
        resolve(success)
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
    let predicate = HKQuery.predicateForSamples(withStart: start, end: Date(), options: .strictStartDate)
    let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)
    let query = HKSampleQuery(
      sampleType: HKObjectType.workoutType(),
      predicate: predicate,
      limit: max(1, min(100, limit.intValue)),
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
