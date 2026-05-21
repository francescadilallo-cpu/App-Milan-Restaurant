import SwiftUI

struct ContentView: View {
    @State private var vm = LocaliViewModel()
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            HomeView()
                .tabItem { Label("Scopri", systemImage: "mappin.and.ellipse") }
                .tag(0)

            MapaView()
                .tabItem { Label("Mappa", systemImage: "map") }
                .tag(1)

            FavoritesView()
                .tabItem { Label("Preferiti", systemImage: "heart.fill") }
                .tag(2)
        }
        .environment(vm)
        .task { await vm.load() }
    }
}
