import { createFileRoute } from "@tanstack/react-router";
import { trpc } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { SearchFilters } from "@/components/SearchFilters";
import { OfferCard, type Offer } from "@/components/OfferCard";

export const Route = createFileRoute("/marketplace")({
	component: MarketplaceComponent,
});

function MarketplaceComponent() {
	const [search, setSearch] = useState("");
	const [type, setType] = useState("Todos");
	const [currency, setCurrency] = useState("Todas");

	const currencyFilter = currency === "Todas" ? undefined : currency.toLowerCase() as "gold" | "rubin";

	const listings = useQuery(
		trpc.listings.search.queryOptions({
			query: search || undefined,
			currency: currencyFilter,
			sortBy: "date_desc",
			limit: 20,
		}),
	);

	const offers: Offer[] = (listings.data?.items || []).map((listing: any) => ({
		id: listing.id,
		itemName: listing.item?.name || "Item",
		price: listing.price,
		currency: listing.currency,
		type: "selling" as const,
		rarity: "common" as const,
		category: listing.item?.category,
		seller: {
			id: listing.seller?.id || "",
			name: listing.seller?.name || "Vendedor",
		},
		createdAt: listing.createdAt,
		description: listing.description,
	}));

	const filteredOffers = offers.filter((offer) => {
		if (type === "Todos") return true;
		if (type === "Comprando") return offer.type === "buying";
		if (type === "Vendendo") return offer.type === "selling";
		return true;
	});

	return (
		<div className="min-h-screen">
			<div className="bg-secondary/30 border-b border-border/50 py-8">
				<div className="container mx-auto px-4">
					<h1 className="text-3xl font-bold mb-2">Marketplace</h1>
					<p className="text-muted-foreground">
						Encontre os melhores itens do RubinOT
					</p>
				</div>
			</div>

			<SearchFilters
				searchQuery={search}
				onSearchChange={setSearch}
				selectedType={type}
				onTypeChange={setType}
				selectedCurrency={currency}
				onCurrencyChange={setCurrency}
			/>

			<section className="py-8">
				<div className="container mx-auto px-4">
					<div className="flex items-center justify-between mb-6">
						<h2 className="text-2xl font-bold text-foreground">
							Ofertas Ativas
							<span className="ml-2 text-sm font-normal text-muted-foreground">
								({filteredOffers.length} resultados)
							</span>
						</h2>
					</div>

					{listings.isLoading ? (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
							{[...Array(6)].map((_, i) => (
								<div key={i} className="h-64 rounded-lg bg-secondary/50 animate-pulse" />
							))}
						</div>
					) : filteredOffers.length === 0 ? (
						<div className="text-center py-16">
							<div className="text-6xl mb-4">🔍</div>
							<h3 className="text-xl font-semibold text-foreground mb-2">
								Nenhuma oferta encontrada
							</h3>
							<p className="text-muted-foreground">
								Tente ajustar os filtros ou faça uma busca diferente.
							</p>
						</div>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
							{filteredOffers.map((offer, index) => (
								<div
									key={offer.id}
									className="animate-in fade-in slide-in-from-bottom-4 duration-500"
									style={{ animationDelay: `${index * 50}ms` }}
								>
									<OfferCard offer={offer} />
								</div>
							))}
						</div>
					)}
				</div>
			</section>
		</div>
	);
}
