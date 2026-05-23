import Foundation

final class DataService {
    static let shared = DataService()
    private init() {}

    private let remoteURL = URL(string:
        "https://raw.githubusercontent.com/francescadilallo-cpu/app-milan-restaurant/main/MilanoLocali/Resources/locali.json"
    )!

    private let cacheKey       = "fsq_cache_data"
    private let cacheTimeKey   = "fsq_cache_timestamp"
    private let cacheTTL: TimeInterval = 7200 // 2 ore

    // MARK: - Public

    func fetchLocali() async throws -> [LocaleDTO] {
        async let curated = fetchCurated()
        async let foursquare = fetchFoursquareCached()

        let (base, fsq) = await (curated, foursquare)

        // I locali curati hanno la precedenza; i risultati Foursquare vengono aggiunti
        // solo se non già presenti (confronto per nome normalizzato).
        let curatedNames = Set(base.map { $0.name.lowercased() })
        let extra = fsq.filter { !curatedNames.contains($0.name.lowercased()) }
        return base + extra
    }

    // MARK: - Curated (GitHub JSON + bundle fallback)

    private func fetchCurated() async -> [LocaleDTO] {
        if let remote = try? await fetchRemote() { return remote }
        return (try? loadBundled()) ?? []
    }

    private func fetchRemote() async throws -> [LocaleDTO] {
        let (data, response) = try await URLSession.shared.data(from: remoteURL)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }
        return try JSONDecoder().decode([LocaleDTO].self, from: data)
    }

    private func loadBundled() throws -> [LocaleDTO] {
        guard let url = Bundle.main.url(forResource: "locali", withExtension: "json"),
              let data = try? Data(contentsOf: url) else { return [] }
        return try JSONDecoder().decode([LocaleDTO].self, from: data)
    }

    // MARK: - Foursquare con cache UserDefaults

    private func fetchFoursquareCached() async -> [LocaleDTO] {
        guard FoursquareService.shared.isConfigured else { return [] }

        // Usa la cache se ancora valida
        if let cached = loadCache(), !isCacheStale() { return cached }

        // Altrimenti recupera dalla rete (fetchAllZones gestisce internamente gli errori)
        let fresh = await FoursquareService.shared.fetchAllZones()
        if !fresh.isEmpty {
            saveCache(fresh)
            return fresh
        }

        // Se la rete non restituisce nulla, usa la cache scaduta
        return loadCache() ?? []
    }

    private func isCacheStale() -> Bool {
        guard let ts = UserDefaults.standard.object(forKey: cacheTimeKey) as? Date else { return true }
        return Date().timeIntervalSince(ts) > cacheTTL
    }

    private func loadCache() -> [LocaleDTO]? {
        guard let data = UserDefaults.standard.data(forKey: cacheKey) else { return nil }
        return try? JSONDecoder().decode([LocaleDTO].self, from: data)
    }

    private func saveCache(_ locali: [LocaleDTO]) {
        guard let data = try? JSONEncoder().encode(locali) else { return }
        UserDefaults.standard.set(data, forKey: cacheKey)
        UserDefaults.standard.set(Date(), forKey: cacheTimeKey)
    }

    // Permette di forzare il refresh da Foursquare (es. pull-to-refresh)
    func invalidateFoursquareCache() {
        UserDefaults.standard.removeObject(forKey: cacheKey)
        UserDefaults.standard.removeObject(forKey: cacheTimeKey)
    }
}
