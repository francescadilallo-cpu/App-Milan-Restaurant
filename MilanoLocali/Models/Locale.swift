import Foundation
import CoreLocation
import SwiftData

// MARK: - Remote data model (decoded from JSON)

struct LocaleDTO: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let zona: String
    let categoria: String
    let address: String
    let description: String
    let latitude: Double
    let longitude: Double
    let priceRange: Int        // 1–4 (€ €€ €€€ €€€€)
    let tags: [String]
    let instagramHandle: String?
    let websiteURL: String?
    let imageURL: String?
    let isNew: Bool

    var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }

    var priceSymbol: String {
        String(repeating: "€", count: priceRange)
    }
}

// MARK: - SwiftData persisted model for favorites

@Model
final class FavoriteLocale {
    @Attribute(.unique) var id: String
    var name: String
    var zona: String
    var categoria: String
    var address: String

    init(from dto: LocaleDTO) {
        self.id = dto.id
        self.name = dto.name
        self.zona = dto.zona
        self.categoria = dto.categoria
        self.address = dto.address
    }
}

// MARK: - Enums

enum Zona: String, CaseIterable, Identifiable {
    case navigli = "Navigli"
    case brera = "Brera"
    case portaVenezia = "Porta Venezia"
    case isola = "Isola"
    case tortona = "Tortona"
    case nolo = "NoLo"
    case centrale = "Centrale"
    case duomo = "Duomo"
    case moscova = "Moscova"
    case lambrate = "Lambrate"
    case citaStudy = "Città Studi"
    case loreto = "Loreto"
    case chinatown = "Chinatown"

    var id: String { rawValue }

    var emoji: String {
        switch self {
        case .navigli: return "🌊"
        case .brera: return "🎨"
        case .portaVenezia: return "🌳"
        case .isola: return "🏝️"
        case .tortona: return "🏭"
        case .nolo: return "✨"
        case .centrale: return "🚉"
        case .duomo: return "⛪"
        case .moscova: return "🌿"
        case .lambrate: return "🍺"
        case .citaStudy: return "📚"
        case .loreto: return "🎯"
        case .chinatown: return "🏮"
        }
    }
}

enum Categoria: String, CaseIterable, Identifiable {
    case ristorante = "Ristorante"
    case cocktailBar = "Cocktail Bar"
    case aperitivo = "Aperitivo"
    case caffe = "Caffè"
    case pizza = "Pizza"
    case osteria = "Osteria"
    case sushi = "Sushi"
    case streetFood = "Street Food"
    case rooftop = "Rooftop"
    case vineria = "Vineria"

    var id: String { rawValue }

    var emoji: String {
        switch self {
        case .ristorante: return "🍽️"
        case .cocktailBar: return "🍸"
        case .aperitivo: return "🥂"
        case .caffe: return "☕"
        case .pizza: return "🍕"
        case .osteria: return "🫕"
        case .sushi: return "🍣"
        case .streetFood: return "🌮"
        case .rooftop: return "🌆"
        case .vineria: return "🍷"
        }
    }
}
