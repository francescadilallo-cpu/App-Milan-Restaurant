import SwiftUI
import MapKit
import SwiftData

struct LocaleDetailView: View {
    @Environment(LocaliViewModel.self) private var vm
    @Environment(\.modelContext) private var modelContext
    let locale: LocaleDTO

    private static let dayNames = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"]
    private var todayIndex: Int {
        (Calendar.current.component(.weekday, from: Date()) + 5) % 7
    }

    var isFavorite: Bool { vm.isFavorite(id: locale.id, context: modelContext) }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                heroSection
                VStack(alignment: .leading, spacing: 20) {
                    headerSection
                    if !locale.tags.isEmpty { tagsSection }
                    Text(locale.description).font(.body)
                    Divider()
                    if locale.hours != nil { hoursSection }
                    infoRow(icon: "mappin.circle", text: locale.address.isEmpty ? "Indirizzo non disponibile" : locale.address)
                    if let ig = locale.instagramHandle {
                        infoRow(icon: "camera", text: "@\(ig)")
                    }
                    if let site = locale.websiteURL, let url = URL(string: site) {
                        Link(destination: url) {
                            infoRow(icon: "globe", text: site)
                        }
                    }
                    if locale.imageURL != nil { miniMap }
                    openInMapsButton
                }
                .padding()
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .ignoresSafeArea(edges: .top)
    }

    // MARK: - Hero

    @ViewBuilder
    private var heroSection: some View {
        if let urlStr = locale.imageURL, let url = URL(string: urlStr) {
            AsyncImage(url: url) { phase in
                switch phase {
                case .success(let img):
                    img.resizable().scaledToFill()
                        .frame(maxWidth: .infinity).frame(height: 280).clipped()
                case .empty:
                    Rectangle().fill(Color(.systemGray5)).frame(height: 280)
                        .overlay(ProgressView())
                default:
                    fullMapPreview
                }
            }
        } else {
            fullMapPreview
        }
    }

    private var fullMapPreview: some View {
        mapView.frame(height: 220)
    }

    private var miniMap: some View {
        mapView
            .frame(height: 160)
            .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    private var mapView: some View {
        let region = MKCoordinateRegion(
            center: locale.coordinate,
            span: MKCoordinateSpan(latitudeDelta: 0.005, longitudeDelta: 0.005)
        )
        return Map(initialPosition: .region(region)) {
            Marker(locale.name, coordinate: locale.coordinate)
        }
        .disabled(true)
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(locale.name).font(.title2.bold())
                    HStack(spacing: 6) {
                        Text(locale.zona).font(.subheadline).foregroundStyle(.secondary)
                        Text("·").foregroundStyle(.secondary)
                        Text(locale.priceSymbol).font(.subheadline).foregroundStyle(.secondary)
                        if let open = locale.isOpenNow {
                            Text("·").foregroundStyle(.secondary)
                            Text(open ? "Aperto" : "Chiuso")
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(open ? .green : .red)
                        }
                    }
                }
                Spacer()
                Button {
                    vm.toggleFavorite(locale, context: modelContext)
                } label: {
                    Image(systemName: isFavorite ? "heart.fill" : "heart")
                        .font(.title2).foregroundStyle(.pink)
                        .contentTransition(.symbolEffect(.replace))
                }
            }
            if let rating = locale.rating {
                HStack(spacing: 4) {
                    ForEach(1...5, id: \.self) { star in
                        Image(systemName: starSymbol(star: star, rating: rating))
                            .font(.subheadline).foregroundStyle(.orange)
                    }
                    Text(String(format: "%.1f", rating))
                        .font(.subheadline.weight(.semibold))
                    if let count = locale.reviewCount {
                        Text("(\(count) recensioni)").font(.caption).foregroundStyle(.secondary)
                    }
                }
            }
        }
    }

    // MARK: - Tags

    private var tagsSection: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(locale.tags, id: \.self) { tag in
                    Text("#\(tag)")
                        .font(.caption.weight(.medium))
                        .padding(.horizontal, 10).padding(.vertical, 5)
                        .background(Color.accentColor.opacity(0.12))
                        .foregroundStyle(.accentColor)
                        .clipShape(Capsule())
                }
            }
        }
    }

    // MARK: - Hours

    private var hoursSection: some View {
        DisclosureGroup {
            VStack(spacing: 8) {
                ForEach(0..<7, id: \.self) { i in
                    HStack {
                        Text(Self.dayNames[i])
                            .font(.subheadline)
                            .fontWeight(i == todayIndex ? .bold : .regular)
                            .frame(width: 36, alignment: .leading)
                        if let slot = locale.hours?[i] {
                            Text(slot)
                                .font(.subheadline)
                                .fontWeight(i == todayIndex ? .bold : .regular)
                        } else {
                            Text("Chiuso").font(.subheadline).foregroundStyle(.red)
                                .fontWeight(i == todayIndex ? .bold : .regular)
                        }
                        Spacer()
                    }
                }
            }
            .padding(.top, 6)
        } label: {
            HStack(spacing: 10) {
                Image(systemName: "clock").foregroundStyle(.accentColor).frame(width: 22)
                VStack(alignment: .leading, spacing: 2) {
                    Text(todayHoursLabel).font(.subheadline)
                }
            }
        }
    }

    private var todayHoursLabel: String {
        let day = Self.dayNames[todayIndex]
        if let slot = locale.hours?[todayIndex] { return "\(day): \(slot)" }
        return "\(day): Chiuso"
    }

    // MARK: - Info rows

    private func infoRow(icon: String, text: String) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: icon).foregroundStyle(.accentColor).frame(width: 22)
            Text(text).font(.subheadline)
        }
    }

    // MARK: - Open in Maps

    private var openInMapsButton: some View {
        Button { openInMaps() } label: {
            Label("Apri in Mappe", systemImage: "map.fill")
                .frame(maxWidth: .infinity).padding()
                .background(Color.accentColor).foregroundStyle(.white)
                .clipShape(RoundedRectangle(cornerRadius: 14))
        }
    }

    private func openInMaps() {
        let placemark = MKPlacemark(coordinate: locale.coordinate)
        let item = MKMapItem(placemark: placemark)
        item.name = locale.name
        item.openInMaps(launchOptions: [MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeWalking])
    }

    private func starSymbol(star: Int, rating: Double) -> String {
        if Double(star) <= rating        { return "star.fill" }
        if Double(star) - 0.5 <= rating { return "star.leadinghalf.filled" }
        return "star"
    }
}
