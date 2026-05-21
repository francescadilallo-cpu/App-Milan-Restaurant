import SwiftUI
import MapKit

struct MapaView: View {
    @Environment(LocaliViewModel.self) private var vm
    @State private var selectedLocale: LocaleDTO?
    @State private var position: MapCameraPosition = .region(MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 45.4654, longitude: 9.1859),
        span: MKCoordinateSpan(latitudeDelta: 0.08, longitudeDelta: 0.08)
    ))

    var body: some View {
        NavigationStack {
            Map(position: $position, selection: $selectedLocale) {
                ForEach(vm.filteredLocali) { locale in
                    let categoria = Categoria.allCases.first { $0.rawValue == locale.categoria }
                    Annotation(locale.name, coordinate: locale.coordinate, anchor: .bottom) {
                        ZStack {
                            Circle()
                                .fill(Color.accentColor)
                                .frame(width: 36, height: 36)
                            Text(categoria?.emoji ?? "📍")
                                .font(.system(size: 18))
                        }
                        .shadow(radius: 3)
                        .onTapGesture { selectedLocale = locale }
                    }
                }
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
