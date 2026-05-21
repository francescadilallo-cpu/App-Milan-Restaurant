import Foundation

final class DataService {
    static let shared = DataService()
    private init() {}

    // Update this URL whenever you push a new locali.json to the repo
    private let remoteURL = URL(string:
        "https://raw.githubusercontent.com/francescadilallo-cpu/app-milan-restaurant/main/MilanoLocali/Resources/locali.json"
    )!

    func fetchLocali() async throws -> [LocaleDTO] {
        // 1. Try remote
        if let remote = try? await fetchRemote() {
            return remote
        }
        // 2. Fallback to bundled JSON
        return try loadBundled()
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
              let data = try? Data(contentsOf: url) else {
            return []
        }
        return try JSONDecoder().decode([LocaleDTO].self, from: data)
    }
}
