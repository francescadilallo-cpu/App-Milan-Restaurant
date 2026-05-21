import SwiftUI
import SwiftData

@main
struct MilanoLocaliApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
                .modelContainer(for: FavoriteLocale.self)
        }
    }
}
