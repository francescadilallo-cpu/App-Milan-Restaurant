import SwiftUI
import SwiftData

struct ZonaListView: View {
    @Environment(LocaliViewModel.self) private var vm
    @Environment(\.modelContext) private var modelContext
    let zona: Zona

    var locali: [LocaleDTO] { vm.locali(for: zona) }

    var body: some View {
        List(locali) { locale in
            NavigationLink(destination: LocaleDetailView(locale: locale)) {
                LocaleRow(locale: locale, isFavorite: vm.isFavorite(id: locale.id, context: modelContext))
            }
            .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                Button {
                    vm.toggleFavorite(locale, context: modelContext)
                } label: {
                    Label(
                        vm.isFavorite(id: locale.id, context: modelContext) ? "Rimuovi" : "Salva",
                        systemImage: vm.isFavorite(id: locale.id, context: modelContext) ? "heart.slash" : "heart"
                    )
                }
                .tint(.pink)
            }
        }
        .listStyle(.plain)
        .navigationTitle("\(zona.emoji) \(zona.rawValue)")
        .navigationBarTitleDisplayMode(.large)
    }
}

// MARK: - LocaleRow

struct LocaleRow: View {
    let locale: LocaleDTO
    let isFavorite: Bool

    var body: some View {
        HStack(spacing: 12) {
            thumbnail
            VStack(alignment: .leading, spacing: 4) {
                HStack(alignment: .top) {
                    Text(locale.name)
                        .font(.headline)
                        .lineLimit(1)
                    Spacer()
                    HStack(spacing: 4) {
                        if locale.isNew {
                            Text("NUOVO")
                                .font(.caption2.weight(.bold))
                                .padding(.horizontal, 6).padding(.vertical, 2)
                                .background(.orange).foregroundStyle(.white)
                                .clipShape(Capsule())
                        }
                        if isFavorite {
                            Image(systemName: "heart.fill").foregroundStyle(.pink).imageScale(.small)
                        }
                    }
                }
                HStack(spacing: 6) {
                    categoryChip(locale.categoria)
                    Text(locale.priceSymbol).font(.caption).foregroundStyle(.secondary)
                    Spacer()
                    if let open = locale.isOpenNow {
                        openBadge(open)
                    }
                }
                if let rating = locale.rating {
                    HStack(spacing: 3) {
                        ForEach(1...5, id: \.self) { star in
                            Image(systemName: starSymbol(star: star, rating: rating))
                                .font(.caption2).foregroundStyle(.orange)
                        }
                        if let count = locale.reviewCount {
                            Text("(\(count))").font(.caption2).foregroundStyle(.secondary)
                        }
                    }
                }
                Text(locale.address).font(.caption).foregroundStyle(.secondary).lineLimit(1)
            }
        }
        .padding(.vertical, 4)
    }

    // MARK: - Subviews

    private var thumbnail: some View {
        Group {
            if let urlStr = locale.imageURL, let url = URL(string: urlStr) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let img): img.resizable().scaledToFill()
                    default: placeholder
                    }
                }
            } else {
                placeholder
            }
        }
        .frame(width: 72, height: 72)
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    private var placeholder: some View {
        let cat = Categoria.allCases.first { $0.rawValue == locale.categoria }
        return ZStack {
            Color(.systemGray5)
            Text(cat?.emoji ?? "🍽️").font(.system(size: 28))
        }
    }

    private func categoryChip(_ cat: String) -> some View {
        let categoria = Categoria.allCases.first { $0.rawValue == cat }
        return Text("\(categoria?.emoji ?? "") \(cat)")
            .font(.caption.weight(.medium))
            .padding(.horizontal, 8).padding(.vertical, 3)
            .background(Color(.systemGray5))
            .clipShape(Capsule())
    }

    private func openBadge(_ isOpen: Bool) -> some View {
        Text(isOpen ? "Aperto" : "Chiuso")
            .font(.caption2.weight(.semibold))
            .padding(.horizontal, 7).padding(.vertical, 2)
            .background(isOpen ? Color.green.opacity(0.15) : Color.red.opacity(0.12))
            .foregroundStyle(isOpen ? .green : .red)
            .clipShape(Capsule())
    }

    private func starSymbol(star: Int, rating: Double) -> String {
        if Double(star) <= rating            { return "star.fill" }
        if Double(star) - 0.5 <= rating     { return "star.leadinghalf.filled" }
        return "star"
    }
}
