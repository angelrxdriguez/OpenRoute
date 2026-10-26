import ActivityKit
import SwiftUI
import WidgetKit

@main
struct OpenRouteWidgets: WidgetBundle {
  var body: some Widget {
    RouteActivityWidget()
  }
}

/// Al tocar la Live Activity se abre la pantalla de grabación (`scheme` de app.json + ruta /record).
private let recordURL = URL(string: "openroute://record")

/// La grabación en curso en la pantalla bloqueada y en la Dynamic Island. Los datos y los colores
/// llegan ya preparados desde `src/tracking/live-activity-content.ts`.
struct RouteActivityWidget: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: RouteActivityAttributes.self) { context in
      LockScreenView(context: context)
        .activityBackgroundTint(context.attributes.palette.backgroundColor)
        .activitySystemActionForegroundColor(context.attributes.palette.textColor)
        .widgetURL(recordURL)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          ActivityLabel(attributes: context.attributes)
            .padding(.leading, 4)
        }
        DynamicIslandExpandedRegion(.trailing) {
          StatusLabel(context: context)
            .padding(.trailing, 4)
        }
        DynamicIslandExpandedRegion(.bottom) {
          MetricsRow(context: context)
            .padding(.horizontal, 4)
            .padding(.top, 8)
        }
      } compactLeading: {
        Image(systemName: context.attributes.symbol)
          .foregroundStyle(context.attributes.palette.activityColor)
      } compactTrailing: {
        MovingTimeText(context: context)
          .font(.system(.body, design: .rounded).weight(.semibold).monospacedDigit())
          .foregroundStyle(context.attributes.palette.accentColor)
          .multilineTextAlignment(.trailing)
          .frame(maxWidth: 64, alignment: .trailing)
      } minimal: {
        Image(systemName: context.attributes.symbol)
          .foregroundStyle(context.attributes.palette.activityColor)
      }
      .widgetURL(recordURL)
      .keylineTint(context.attributes.palette.accentColor)
    }
  }
}

struct LockScreenView: View {
  let context: ActivityViewContext<RouteActivityAttributes>

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      HStack {
        ActivityLabel(attributes: context.attributes)
        Spacer()
        StatusLabel(context: context)
      }
      MetricsRow(context: context)
    }
    .padding(16)
  }
}

/// Icono de la actividad en su color, siempre junto a su nombre.
struct ActivityLabel: View {
  let attributes: RouteActivityAttributes

  var body: some View {
    HStack(spacing: 6) {
      Image(systemName: attributes.symbol)
        .foregroundStyle(attributes.palette.activityColor)
      Text(attributes.activityName)
        .font(.subheadline.weight(.semibold))
        .foregroundStyle(attributes.palette.textColor)
        .lineLimit(1)
    }
  }
}

struct StatusLabel: View {
  let context: ActivityViewContext<RouteActivityAttributes>

  var body: some View {
    HStack(spacing: 6) {
      Circle()
        .fill(dotColor)
        .frame(width: 8, height: 8)
      Text(label)
        .font(.caption.weight(.semibold))
        .foregroundStyle(context.attributes.palette.textColor)
        .lineLimit(1)
    }
  }

  /// Desactualizada: iOS ha cerrado la app y ya no graba hasta que la vuelvas a abrir.
  private var label: String {
    if context.isStale { return "Abre OpenRoute" }
    return context.state.paused ? "En pausa" : "Grabando"
  }

  private var dotColor: Color {
    let palette = context.attributes.palette
    return context.isStale || context.state.paused ? palette.pausedColor : palette.recordingColor
  }
}

struct MetricsRow: View {
  let context: ActivityViewContext<RouteActivityAttributes>

  var body: some View {
    let palette = context.attributes.palette
    let state = context.state

    HStack(alignment: .top, spacing: 12) {
      Metric(label: "Tiempo", palette: palette) {
        MovingTimeText(context: context)
          .foregroundStyle(palette.accentColor)
      }
      Metric(label: "Distancia", palette: palette) {
        ValueWithUnit(value: state.distance, unit: state.distanceUnit, palette: palette)
      }
      Metric(label: context.attributes.speedLabel, palette: palette) {
        ValueWithUnit(value: state.speed, unit: state.speedUnit, palette: palette)
      }
    }
  }
}

/// Una cifra con su etiqueta debajo. Las tres columnas ocupan lo mismo.
struct Metric<Value: View>: View {
  let label: String
  let palette: RouteActivityPalette
  @ViewBuilder let value: Value

  var body: some View {
    VStack(alignment: .leading, spacing: 2) {
      value
        .font(.system(size: 24, weight: .bold, design: .rounded).monospacedDigit())
        .lineLimit(1)
        .minimumScaleFactor(0.6)
      Text(label)
        .font(.caption)
        .foregroundStyle(palette.textSecondaryColor)
        .lineLimit(1)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }
}

/// La cifra grande y la unidad más pequeña y en gris, como `Stat` en la app.
struct ValueWithUnit: View {
  let value: String
  let unit: String
  let palette: RouteActivityPalette

  var body: some View {
    HStack(alignment: .firstTextBaseline, spacing: 3) {
      Text(value)
        .foregroundStyle(palette.textColor)
      Text(unit)
        .font(.system(size: 12, weight: .semibold, design: .rounded))
        .foregroundStyle(palette.textSecondaryColor)
    }
  }
}

/// Tiempo en movimiento. Mientras te mueves, iOS lo hace avanzar solo sin esperar a la app;
/// en pausa, parado o desactualizado se queda quieto.
struct MovingTimeText: View {
  let context: ActivityViewContext<RouteActivityAttributes>

  var body: some View {
    if let start = context.state.timerStart, !context.state.paused, !context.isStale {
      Text(start, style: .timer)
    } else {
      Text(context.state.movingTime)
    }
  }
}

extension RouteActivityPalette {
  var backgroundColor: Color { Color(hex: background) }
  var textColor: Color { Color(hex: text) }
  var textSecondaryColor: Color { Color(hex: textSecondary) }
  var accentColor: Color { Color(hex: accent) }
  var activityColor: Color { Color(hex: activity) }
  var recordingColor: Color { Color(hex: recording) }
  var pausedColor: Color { Color(hex: paused) }
}

extension Color {
  /// `#RRGGBB`, como los tokens de `src/constants/theme.ts`.
  init(hex: String) {
    let value = UInt64(hex.trimmingCharacters(in: CharacterSet(charactersIn: "#")), radix: 16) ?? 0
    self.init(
      red: Double((value >> 16) & 0xFF) / 255,
      green: Double((value >> 8) & 0xFF) / 255,
      blue: Double(value & 0xFF) / 255
    )
  }
}
