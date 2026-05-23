import SwiftUI

struct HomeView: View {
    @Environment(LocaliViewModel.self) private var vm
    @State private var showFilters = false

    var body: some View {
        NavigationStack {
            Group {
                if vm.isLoading {
                    ProgressView("Caricamento locali…")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    ScrollView {
                        VStack(spacing: 0) {
                            categoryFilterBar
                            zoneGrid
                        }
                    }
                    .refreshable { await vm.refresh() }
                }
            }
            .navigationTitle("Milano Locali")
            .searchable(text: Bindable(vm).searchText, prompt: "Cerca locale o zona…")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showFilters.toggle() } label: {
                        Image(systemName: vm.selectedZona != nil ? "line.3.horizontal.decrease.circle.fill" : "line.3.horizontal.decrease.circle")
                    }
                }
            }
            .sheet(isPresented: $showFilters) {
                FilterSheet()
                    .environment(vm)
            }
        }
    }

    // MARK: - Category scroll bar

    private var categoryFilterBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                ForEach(Categoria.allCases) { cat in
                    let isSelected = vm.selectedCategoria == cat
                    Button {
                        withAnimation(.spring(duration: 0.25)) {
                            vm.selectedCategoria = isSelected ? nil : cat
                        }
                    } label: {
                        HStack(spacing: 4) {
                            Text(cat.emoji)
                            Text(cat.rawValue)
                                .font(.subheadline.weight(.medium))
                        }
                        .padding(.horizontal, 14)
                        .padding(.vertical, 8)
                        .background(isSelected ? Color.accentColor : Color(.systemGray6))
                        .foregroundStyle(isSelected ? .white : .primary)
                        .clipShape(Capsule())
                    }
                }
            }
            .padding(.horizontal)
            .padding(.vertical, 10)
        }
    }

    // MARK: - Zone grid

    private var zoneGrid: some View {
        let columns = [GridItem(.flexible()), GridItem(.flexible())]
        let altriCount = Zona.allCases
            .filter { !$0.isMain }
            .flatMap { vm.locali(for: $0) }
            .count
        return LazyVGrid(columns: columns, spacing: 12) {
            ForEach(Zona.allCases.filter { $0.isMain }) { zona in
                let count = vm.locali(for: zona).count
                if count > 0 {
                    NavigationLink(destination: ZonaListView(zona: zona)) {
                        ZonaCard(zona: zona, count: count)
                    }
                    .buttonStyle(.plain)
                }
            }
            if altriCount > 0 {
                NavigationLink(destination: AltriQuartieriView().environment(vm)) {
                    AltriZoneCard(count: altriCount)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal)
        .padding(.bottom, 20)
    }
}

// MARK: - ZonaCard

struct ZonaCard: View {
    let zona: Zona
    let count: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(zona.emoji)
                .font(.system(size: 36))
            Text(zona.rawValue)
                .font(.headline)
            Text("\(count) \(count == 1 ? "locale" : "locali")")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

// MARK: - AltriZoneCard

struct AltriZoneCard: View {
    let count: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("🗺️")
                .font(.system(size: 36))
            Text("Altri quartieri")
                .font(.headline)
            Text("\(count) \(count == 1 ? "locale" : "locali")")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

// MARK: - AltriQuartieriView

struct AltriQuartieriView: View {
    @Environment(LocaliViewModel.self) private var vm

    var body: some View {
        let columns = [GridItem(.flexible()), GridItem(.flexible())]
        ScrollView {
            LazyVGrid(columns: columns, spacing: 12) {
                ForEach(Zona.allCases.filter { !$0.isMain }) { zona in
                    let count = vm.locali(for: zona).count
                    if count > 0 {
                        NavigationLink(destination: ZonaListView(zona: zona)) {
                            ZonaCard(zona: zona, count: count)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .padding()
        }
        .navigationTitle("Altri quartieri")
        .navigationBarTitleDisplayMode(.large)
    }
}

// MARK: - FilterSheet

struct FilterSheet: View {
    @Environment(LocaliViewModel.self) private var vm
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                Section("Zona") {
                    Button("Tutte le zone") {
                        vm.selectedZona = nil
                        dismiss()
                    }
                    .foregroundStyle(vm.selectedZona == nil ? .accentColor : .primary)

                    ForEach(Zona.allCases) { zona in
                        Button {
                            vm.selectedZona = zona
                            dismiss()
                        } label: {
                            HStack {
                                Text("\(zona.emoji) \(zona.rawValue)")
                                    .foregroundStyle(.primary)
                                Spacer()
                                if vm.selectedZona == zona {
                                    Image(systemName: "checkmark").foregroundStyle(.accentColor)
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("Filtra")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Chiudi") { dismiss() }
                }
            }
        }
    }
}
