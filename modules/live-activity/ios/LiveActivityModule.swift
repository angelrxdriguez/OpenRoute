import ActivityKit
import ExpoModulesCore

/// Lo que llega de `liveActivityAttributes` en `src/tracking/live-activity-content.ts`.
struct RouteActivityAttributesRecord: Record {
  @Field var activityName: String = ""
  @Field var symbol: String = "location.fill"
  @Field var speedLabel: String = ""
  @Field var background: String = "#000000"
  @Field var text: String = "#FFFFFF"
  @Field var textSecondary: String = "#A3A3A3"
  @Field var accent: String = "#D4F53C"
  @Field var activity: String = "#FFFFFF"
  @Field var recording: String = "#D93025"
  @Field var paused: String = "#F5A623"

  var attributes: RouteActivityAttributes {
    RouteActivityAttributes(
      activityName: activityName,
      symbol: symbol,
      speedLabel: speedLabel,
      palette: RouteActivityPalette(
        background: background,
        text: text,
        textSecondary: textSecondary,
        accent: accent,
        activity: activity,
        recording: recording,
        paused: paused
      )
    )
  }
}

/// Lo que llega de `liveActivityState` en `src/tracking/live-activity-content.ts`.
struct RouteActivityStateRecord: Record {
  @Field var paused: Bool = false
  @Field var movingTime: String = "0:00"
  /// Milisegundos desde 1970, como `Date.now()` en JavaScript.
  @Field var timerStart: Double? = nil
  @Field var distance: String = "0,00"
  @Field var distanceUnit: String = "km"
  @Field var speed: String = "–"
  @Field var speedUnit: String = ""

  var contentState: RouteActivityAttributes.ContentState {
    RouteActivityAttributes.ContentState(
      paused: paused,
      movingTime: movingTime,
      timerStart: timerStart.map(dateFromMilliseconds),
      distance: distance,
      distanceUnit: distanceUnit,
      speed: speed,
      speedUnit: speedUnit
    )
  }
}

private func dateFromMilliseconds(_ milliseconds: Double) -> Date {
  Date(timeIntervalSince1970: milliseconds / 1000)
}

/// Inicia, actualiza y termina la Live Activity de la grabación. La pinta la extensión
/// `targets/route-activity`; los datos viajan en el `ContentState` de ActivityKit y no en un
/// App Group, que la firma con un Apple ID gratuito no garantiza.
public class LiveActivityModule: Module {
  public func definition() -> ModuleDefinition {
    Name("OpenRouteLiveActivity")

    Function("start") { (attributes: RouteActivityAttributesRecord, state: RouteActivityStateRecord, staleDate: Double) throws -> Bool in
      guard ActivityAuthorizationInfo().areActivitiesEnabled else {
        return false
      }
      // Si iOS cerró la app a mitad de una grabación, la anterior sigue en pantalla sin actualizarse.
      let previous = Activity<RouteActivityAttributes>.activities
      _ = try Activity.request(
        attributes: attributes.attributes,
        content: ActivityContent(state: state.contentState, staleDate: dateFromMilliseconds(staleDate)),
        pushType: nil
      )
      Task {
        for activity in previous {
          await activity.end(nil, dismissalPolicy: .immediate)
        }
      }
      return true
    }

    Function("update") { (state: RouteActivityStateRecord, staleDate: Double) -> Void in
      let content = ActivityContent(state: state.contentState, staleDate: dateFromMilliseconds(staleDate))
      let activities = Activity<RouteActivityAttributes>.activities
      Task {
        for activity in activities {
          await activity.update(content)
        }
      }
    }

    Function("end") { () -> Void in
      let activities = Activity<RouteActivityAttributes>.activities
      Task {
        for activity in activities {
          await activity.end(nil, dismissalPolicy: .immediate)
        }
      }
    }
  }
}
