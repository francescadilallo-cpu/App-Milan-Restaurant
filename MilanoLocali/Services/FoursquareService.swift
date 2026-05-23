import Foundation

// MARK: - Foursquare response models

struct FSQResponse: Codable {
    let results: [FSQPlace]
}

struct FSQPlace: Codable {
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

struct FSQCategory: Codable {
    let id: Int
    let name: String
}

struct FSQGeocodes: Codable {
    let main: FSQCoordinate
}

struct FSQCoordinate: Codable {
    let latitude: Double
    let longitude: Double
}

struct FSQLocation: Codable {
    let address: String?
    let formattedAddress: String?
    let neighborhood: [String]?

    enum CodingKeys: String, CodingKey {
        case address, neighborhood
        case formattedAddress = "formatted_address"
    }
}

struct FSQPhoto: Codable {
    let prefix: String
    let suffix: String

    var originalURL: String { "\(prefix)original\(suffix)" }
}

// MARK: - Service

// @unchecked Sendable: tutte le stored properties sono let immutabili
final class FoursquareService: @unchecked Sendable {
    static let shared = FoursquareService()

    private let session: URLSession
    private let baseURL = "https://api.foursquare.com/v3/places/search"
    private let categoryFilter = "13000,13003,13032,13065"

    private init() {
        // Headers fissi configurati una volta sola nella URLSession,
        // così fetchZone non ha bisogno di mutare URLRequest
        let config = URLSessionConfiguration.default
        config.httpAdditionalHeaders = [
            "Authorization": "Bearer \(FoursquareConfig.apiKey)",
            "Accept": "application/json"
        ]
        config.timeoutIntervalForRequest = 15
        session = URLSession(configuration: config)
    }

    var isConfigured: Bool { !FoursquareConfig.apiKey.isEmpty }

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

    func fetchAllZones() async -> [LocaleDTO] {
        var all: [LocaleDTO] = []
        for center in zoneCenters {
            let batch = (try? await fetchZone(center.zona, lat: center.lat, lng: center.lng)) ?? []
            all.append(contentsOf: batch)
        }
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
        guard let url = components.url else { throw URLError(.badURL) }

        let (data, response) = try await session.data(from: url)
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

    private func resolveCategoria(_ categoryId: Int?) -> Categoria {
        guard let id = categoryId else { return .ristorante }
        switch id {
        case 13003, 13006, 13007, 13008, 13009, 13010: return .cocktailBar
        case 13032, 13033, 13034, 13035, 13052:         return .caffe
        case 13064, 13245:                              return .pizza
        case 13072, 13073, 13074, 13075:                return .sushi
        case 13025, 13240, 13241:                       return .osteria
        case 13046, 13047, 13313:                       return .vineria
        case 13045:                                     return .rooftop
        case 13304, 13305, 13352:                       return .streetFood
        case 13040, 13041, 13042, 13043:                return .aperitivo
        default:                                        return .ristorante
        }
    }
}
