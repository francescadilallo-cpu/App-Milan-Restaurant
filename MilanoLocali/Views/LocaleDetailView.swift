import SwiftUI
import MapKit
import SwiftData

struct LocaleDetailView: View {
    @Environment(LocaliViewModel.self) private var vm
    @Environment(\.modelContext) private var modelContext
    let locale: LocaleDTO

    var isFavorite: Bool { vm.isFavorite(id: locale.id, context: modelContext) }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Hero map preview
                mapPreview

                VStack(alignment: .leading, spacing: 16) {
                    // Header
                    HStack(alignment: .top) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(locale.name)
                                .font(.title2.bold())
                            HStack(spacing: 6) {
                                Text(locale.zona)
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                                Text("·")
                                    .foregroundStyle(.secondary)
                                Text(locale.priceSymbol)
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        Spacer()
                        Button {
                            vm.toggleFavorite(locale, context: modelContext)
                        } label: {
                            Image(systemName: isFavorite ? "heart.fill" : "heart")
                                .font(.title2)
                                .foregroundStyle(.pink)
                                .contentTransition(.symbolEffect(.replace))
                        }
                    }

                    // Tags
                    if !locale.tags.isEmpty {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(locale.tags, id: \.self) { tag in
                                    Text("#\(tag)")
                                        .font(.caption.weight(.medium))
                                        .padding(.horizontal, 10)
                                        .padding(.vertical, 5)
                                        .background(Color.accentColor.opacity(0.12))
                                        .foregroundStyle(.accentColor)
                                        .clipShape(Capsule())
                                }
                            }
                        }
                    }

                    // Description
                    Text(locale.description)
                        .font(.body)
                        .foregroundStyle(.primary)

                    Divider()

                    // Info rows
                    infoRow(icon: "mappin.circle", text: locale.address)

                    if let instagram = locale.instagramHandle {
                        infoRow(icon: "camera", text: "@\(instagram)")
                    }

                    if let website = locale.websiteURL, let url = URL(string: website) {
                        Link(destination: url) {
                            infoRow(icon: "globe", text: website)
                        }
                    }

                    // Open in Maps button
                    Button {
                        openInMaps()
                    } label: {
                        Label("Apri in Mappe", systemImage: "map.fill")
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.accentColor)
                            .foregroundStyle(.white)
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                    }
                    .padding(.top, 4)
                }
                .padding(.horizontal)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .ignoresSafeArea(edges: .top)
    }

    // MARK: - Subviews

    private var mapPreview: some View {
        let region = MKCoordinateRegion(
            center: locale.coordinate,
            span: MKCoordinateSpan(latitudeDelta: 0.005, longitudeDelta: 0.005)
        )
        return Map(initialPosition: .region(region)) {
            Marker(locale.name, coordinate: locale.coordinate)
        }
        .frame(height: 220)
        .disabled(true)
    }

    private func infoRow(icon: String, text: String) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: icon)
                .foregroundStyle(.accentColor)
                .frame(width: 22)
            Text(text)
                .font(.subheadline)
        }
    }

    private func openInMaps() {
        let coords = locale.coordinate
        let placemark = MKPlacemark(coordinate: coords)
        let item = MKMapItem(placemark: placemark)
        item.name = locale.name
        item.openInMaps(launchOptions: [MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeWalking])
    }
}
