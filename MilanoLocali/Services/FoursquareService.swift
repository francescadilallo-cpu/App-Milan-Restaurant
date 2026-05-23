import Foundation

// MARK: - Foursquare response models

private struct FSQResponse: Codable {
    let results: [FSQPlace]
}

private struct FSQPlace: Codable {
    let fsqId: String
    let name: String
    let categories: [FSQCategory]
    let geocodes: FSQGeocodes
    let location: FSQLocation
    let rating: Double?
    let price: Int?
    let photos: [FSQPhoto]?

    enum CodingKeys: String, CodingKey {
        case fsqId = "fsq_id"
        case name, categories, geocodes, location, rating, price, photos
    }
}

private struct FSQCategory: Codable {
    let id: Int
    let name: String
}

private struct FSQGeocodes: Codable {
    let main: FSQCoordinate
}

private struct FSQCoordinate: Codable {
    let latitude: Double
    let longitude: Double
}

private struct FSQLocation: Codable {
    let address: String?
    let formattedAddress: String?
    let neighborhood: [String]?

    enum CodingKeys: String, CodingKey {
        case address, neighborhood
        case formattedAddress = "formatted_address"
    }
}

private struct FSQPhoto: Codable {
    let prefix: String
    let suffix: String

    var originalURL: String { "\(prefix)original\(suffix)" }
}

// MARK: - Service

final class FoursquareService {
    static let shared = FoursquareService()
    private init() {}

    private let baseURL = "https://api.foursquare.com/v3/places/search"

    // Centro approssimativo di ogni quartiere di Milano
    private let zoneCenters: [(zona: Zona, lat: Double, lng: Double)] = [
        (.navigli,      45.4502, 9.1680),
        (.brera,        45.4716, 9.1869),
        (.portaVenezia, 45.4731, 9.2013),
        (.isola,        45.4872, 9.1853),
        (.tortona,      45.4587, 9.1628),
        (.nolo,         45.4870, 9.2073),
        (.centrale,     45.4849, 9.2022),
        (.duomo,        45.4641, 9.1919),
        (.moscova,      45.4773, 9.1863),
        (.lambrate,     45.4803, 9.2293),
        (.citaStudy,    45.4650, 9.2258),
        (.loreto,       45.4822, 9.2131)
    ]

    // Categorie Foursquare: Food (13000), Bar (13003), Café (13032), Restaurant (13065), etc.
    private let categoryFilter = "13000,13003,13032,13065"

    var isConfigured: Bool { !FoursquareConfig.apiKey.isEmpty }

    func fetchAllZones() async throws -> [LocaleDTO] {
        var all: [LocaleDTO] = []
        await withTaskGroup(of: [LocaleDTO].self) { group in
            for center in zoneCenters {
                group.addTask {
                    (try? await self.fetchZone(center.zona, lat: center.lat, lng: center.lng)) ?? []
                }
            }
            for await batch in group {
                all.append(contentsOf: batch)
            }
        }
        // Deduplica per fsq_id
        var seen = Set<String>()
        return all.filter { seen.insert($0.id).inserted }
    }

    private func fetchZone(_ zona: Zona, lat: Double, lng: Double) async throws -> [LocaleDTO] {
        var components = URLComponents(string: baseURL)!
        components.queryItems = [
            URLQueryItem(name: "ll",         value: "\(lat),\(lng)"),
            URLQueryItem(name: "radius",     value: "650"),
            URLQueryItem(name: "categories", value: categoryFilter),
            URLQueryItem(name: "limit",      value: "50"),
            URLQueryItem(name: "fields",     value: "fsq_id,name,categories,geocodes,location,rating,price,photos"),
            URLQueryItem(name: "sort",       value: "RATING")
        ]

        var request = URLRequest(url: components.url!)
        request.setValue("Bearer \(FoursquareConfig.apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.timeoutInterval = 15

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }

        let decoded = try JSONDecoder().decode(FSQResponse.self, from: data)
        return decoded.results.map { map(place: $0, zona: zona) }
    }

    private func map(place: FSQPlace, zona: Zona) -> LocaleDTO {
        let categoria = resolveCategoria(place.categories.first?.id)
        let address = place.location.formattedAddress ?? place.location.address ?? ""
        let imageURL = place.photos?.first?.originalURL
        let priceRange = min(max(place.price ?? 2, 1), 4)
        let tags = Array(Set(place.categories.map(\.name)))

        return LocaleDTO(
            id: place.fsqId,
            name: place.name,
            zona: zona.rawValue,
            categoria: categoria.rawValue,
            address: address,
            description: buildDescription(categoria: categoria, zona: zona, rating: place.rating),
            latitude: place.geocodes.main.latitude,
            longitude: place.geocodes.main.longitude,
            priceRange: priceRange,
            tags: tags,
            instagramHandle: nil,
            websiteURL: nil,
            imageURL: imageURL,
            isNew: false
        )
    }

    private func buildDescription(categoria: Categoria, zona: Zona, rating: Double?) -> String {
        var parts = ["\(categoria.rawValue) nel quartiere \(zona.rawValue)"]
        if let r = rating {
            parts.append("Valutazione Foursquare: \(String(format: "%.1f", r))/10")
        }
        return parts.joined(separator: " · ")
    }

    // Mappa gli ID categoria Foursquare ai nostri tipi
    private func resolveCategoria(_ categoryId: Int?) -> Categoria {
        guard let id = categoryId else { return .ristorante }
        switch id {
        case 13003, 13006, 13007, 13008, 13009, 13010:
            return .cocktailBar
        case 13032, 13033, 13034, 13035, 13052:
            return .caffe
        case 13064, 13245:
            return .pizza
        case 13072, 13073, 13074, 13075:
            return .sushi
        case 13025, 13240, 13241:
            return .osteria
        case 13046, 13047, 13313:
            return .vineria
        case 13045:
            return .rooftop
        case 13304, 13305, 13352:
            return .streetFood
        case 13040, 13041, 13042, 13043:
            return .aperitivo
        default:
            return .ristorante
        }
    }
}
