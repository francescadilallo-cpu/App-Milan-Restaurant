import SwiftUI
import SwiftData

struct FavoritesView: View {
    @Environment(LocaliViewModel.self) private var vm
    @Environment(\.modelContext) private var modelContext
    @Query private var favorites: [FavoriteLocale]

    var matchedLocali: [LocaleDTO] {
        let ids = Set(favorites.map(\.id))
        return vm.locali.filter { ids.contains($0.id) }
    }

    var body: some View {
        NavigationStack {
            Group {
                if favorites.isEmpty {
                    ContentUnavailableView(
                        "Nessun preferito",
                        systemImage: "heart.slash",
                        description: Text("Scorri su un locale o premi il cuore per salvarlo qui.")
                    )
                } else {
                    List {
                        ForEach(matchedLocali) { locale in
                            NavigationLink(destination: LocaleDetailView(locale: locale).environment(vm)) {
                                LocaleRow(locale: locale, isFavorite: true)
                            }
                            .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                                Button(role: .destructive) {
                                    vm.toggleFavorite(locale, context: modelContext)
                                } label: {
                                    Label("Rimuovi", systemImage: "heart.slash")
                                }
                            }
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Preferiti")
        }
    }
}
