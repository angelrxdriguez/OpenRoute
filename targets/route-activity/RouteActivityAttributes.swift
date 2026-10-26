import ActivityKit
import Foundation

// COPIA de `modules/live-activity/ios/RouteActivityAttributes.swift`: la app y esta extensión
// son binarios distintos y cada uno necesita el tipo. iOS los empareja por el nombre del tipo y
// por su forma en JSON, así que los dos archivos deben ser idénticos (salvo este comentario).

struct RouteActivityAttributes: ActivityAttributes {
  struct ContentState: Codable, Hashable {
    /// Pausa manual.
    var paused: Bool
    /// Tiempo en movimiento ya formateado, para cuando el cronómetro está parado.
    var movingTime: String
    /// Desde cuándo cuenta el cronómetro; nil si no corre (en pausa o parado).
    var timerStart: Date?
    var distance: String
    var distanceUnit: String
    var speed: String
    var speedUnit: String
  }

  var activityName: String
  /// SF Symbol de la actividad.
  var symbol: String
  var speedLabel: String
  var palette: RouteActivityPalette
}

/// Colores de la paleta Volt (`src/constants/theme.ts`) en hexadecimal: `#RRGGBB`.
struct RouteActivityPalette: Codable, Hashable {
  var background: String
  var text: String
  var textSecondary: String
  var accent: String
  var activity: String
  var recording: String
  var paused: String
}
