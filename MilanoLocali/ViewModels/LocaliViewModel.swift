import Foundation
import SwiftData
import Observation

@Observable
final class LocaliViewModel {
    var locali: [LocaleDTO] = []
    var isLoading = false
    var error: String?

    var selectedZona: Zona?
    var selectedCategoria: Categoria?
    var searchText = ""

    // MARK: - Computed

    var filteredLocali: [LocaleDTO] {
        locali.filter { locale in
            let matchZona = selectedZona == nil || locale.zona == selectedZona?.rawValue
            let matchCat = selectedCategoria == nil || locale.categoria == selectedCategoria?.rawValue
            let matchSearch = searchText.isEmpty ||
                locale.name.localizedCaseInsensitiveContains(searchText) ||
                locale.description.localizedCaseInsensitiveContains(searchText) ||
                locale.tags.contains { $0.localizedCaseInsensitiveContains(searchText) }
            return matchZona && matchCat && matchSearch
        }
    }

    var localiByZona: [String: [LocaleDTO]] {
        Dictionary(grouping: filteredLocali, by: \.zona)
    }

    var sortedZone: [String] {
        localiByZona.keys.sorted()
    }

    func locali(for zona: Zona) -> [LocaleDTO] {
        filteredLocali.filter { $0.zona == zona.rawValue }
    }

    // MARK: - Actions

    func load() async {
        isLoading = true
        error = nil
        do {
            locali = try await DataService.shared.fetchLocali()
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func isFavorite(id: String, context: ModelContext) -> Bool {
        let descriptor = FetchDescriptor<FavoriteLocale>(
            predicate: #Predicate { $0.id == id }
        )
        return (try? context.fetchCount(descriptor) ?? 0) ?? 0 > 0
    }

    func toggleFavorite(_ locale: LocaleDTO, context: ModelContext) {
        let descriptor = FetchDescriptor<FavoriteLocale>(
            predicate: #Predicate { $0.id == locale.id }
        )
        if let existing = try? context.fetch(descriptor).first {
            context.delete(existing)
        } else {
            context.insert(FavoriteLocale(from: locale))
        }
        try? context.save()
    }
}
