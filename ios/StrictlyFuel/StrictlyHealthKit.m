#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(StrictlyHealthKit, NSObject)
RCT_EXTERN_METHOD(isAvailable:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(requestAuthorization:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(getAuthorizationRequestStatus:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(getRecentWorkouts:(nonnull NSNumber *)limit
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(getWorkoutsBetween:(NSString *)startIso
                  endIso:(NSString *)endIso
                  limit:(nonnull NSNumber *)limit
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
@end
