import SwiftUI
import MapKit

struct MapaView: View {
    @Environment(LocaliViewModel.self) private var vm
    @State private var selectedLocale: LocaleDTO?
    @State private var position: MapCameraPosition = .region(MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 45.4654, longitude: 9.1859),
        span: MKCoordinateSpan(latitudeDelta: 0.08, longitudeDelta: 0.08)
    ))
    @State private var visibleRegion = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 45.4654, longitude: 9.1859),
        span: MKCoordinateSpan(latitudeDelta: 0.08, longitudeDelta: 0.08)
    )

    // Only render pins inside the current viewport (+ 30% padding) to avoid
    // rebuilding thousands of annotation views when panning or filtering.
    private var visibleLocali: [LocaleDTO] {
        let latHalf = visibleRegion.span.latitudeDelta / 2 * 1.3
        let lonHalf = visibleRegion.span.longitudeDelta / 2 * 1.3
        let minLat = visibleRegion.center.latitude - latHalf
        let maxLat = visibleRegion.center.latitude + latHalf
        let minLon = visibleRegion.center.longitude - lonHalf
        let maxLon = visibleRegion.center.longitude + lonHalf
        return vm.filteredLocali.filter {
            $0.latitude >= minLat && $0.latitude <= maxLat &&
            $0.longitude >= minLon && $0.longitude <= maxLon
        }
    }

    var body: some View {
        NavigationStack {
            Map(position: $position, selection: $selectedLocale) {
                ForEach(visibleLocali) { locale in
                    Marker(locale.name, coordinate: locale.coordinate)
                        .tint(markerTint(locale.categoria))
                        .tag(locale)
                }
            }
            .onMapCameraChange(frequency: .onEnd) { context in
                visibleRegion = context.region
            }
            .mapControls {
                MapUserLocationButton()
                MapCompass()
                MapScaleView()
            }
            .navigationTitle("Mappa")
            .navigationBarTitleDisplayMode(.inline)
            .sheet(item: $selectedLocale) { locale in
                MapLocaleSheet(locale: locale)
                    .environment(vm)
                    .presentationDetents([.medium])
                    .presentationDragIndicator(.visible)
            }
        }
    }

    private func markerTint(_ categoria: String) -> Color {
        switch Categoria(rawValue: categoria) {
        case .ristorante:    return .red
        case .cocktailBar:   return .purple
        case .aperitivo:     return .orange
        case .caffe:         return .brown
        case .pizza:         return .red
        case .osteria:       return Color(red: 0.2, green: 0.6, blue: 0.2)
        case .sushi:         return .indigo
        case .streetFood:    return Color(red: 0.8, green: 0.6, blue: 0)
        case .rooftop:       return .cyan
        case .vineria:       return Color(red: 0.5, green: 0.1, blue: 0.5)
        case .gelateria:     return .mint
        case .pasticceria:   return .pink
        case .hamburgheria:  return Color(red: 0.55, green: 0.27, blue: 0.07)
        case nil:            return .accentColor
        }
    }
}

// MARK: - Bottom sheet shown on pin tap

struct MapLocaleSheet: View {
    @Environment(LocaliViewModel.self) private var vm
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    let locale: LocaleDTO

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(locale.name).font(.title3.bold())
                        Text("\(locale.zona) · \(locale.categoria) · \(locale.priceSymbol)")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                    Button {
                        vm.toggleFavorite(locale, context: modelContext)
                    } label: {
                        Image(systemName: vm.isFavorite(id: locale.id, context: modelContext) ? "heart.fill" : "heart")
                            .foregroundStyle(.pink)
                            .font(.title3)
                    }
                }

                Text(locale.description)
                    .font(.body)
                    .lineLimit(3)

                Text(locale.address)
                    .font(.caption)
                    .foregroundStyle(.secondary)

                NavigationLink("Vedi dettagli →") {
                    LocaleDetailView(locale: locale)
                        .environment(vm)
                }
                .buttonStyle(.borderedProminent)
                .frame(maxWidth: .infinity)

                Spacer()
            }
            .padding()
        }
    }
}
