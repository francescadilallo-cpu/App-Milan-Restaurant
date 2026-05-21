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
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(locale.name)
                    .font(.headline)
                Spacer()
                if locale.isNew {
                    Text("NUOVO")
                        .font(.caption2.weight(.bold))
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(.orange)
                        .foregroundStyle(.white)
                        .clipShape(Capsule())
                }
                if isFavorite {
                    Image(systemName: "heart.fill")
                        .foregroundStyle(.pink)
                        .imageScale(.small)
                }
            }

            HStack(spacing: 6) {
                categoryChip(locale.categoria)
                Text(locale.priceSymbol)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Text(locale.address)
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(1)
        }
        .padding(.vertical, 4)
    }

    private func categoryChip(_ cat: String) -> some View {
        let categoria = Categoria.allCases.first { $0.rawValue == cat }
        return Text("\(categoria?.emoji ?? "") \(cat)")
            .font(.caption.weight(.medium))
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(Color(.systemGray5))
            .clipShape(Capsule())
    }
}
