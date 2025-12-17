import { createFileRoute, Link } from "@tanstack/react-router";
import { trpc } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";
import { HeroSection } from "@/components/HeroSection";
import { OfferCard, type Offer } from "@/components/OfferCard";

export const Route = createFileRoute("/")({
	component: HomeComponent,
});

function HomeComponent() {
	const healthCheck = useQuery(trpc.healthCheck.queryOptions());
	const recentListings = useQuery(trpc.listings.search.queryOptions({ limit: 6, sortBy: "date_desc" }));

	const offers: Offer[] = (recentListings.data?.items || []).map((listing: any) => ({
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

	return (
		<div className="min-h-screen">
			<HeroSection />
			
			{/* Recent Offers Section */}
			<section className="py-12">
				<div className="container mx-auto px-4">
					<div className="flex items-center justify-between mb-8">
						<div>
							<h2 className="text-2xl font-bold text-foreground">
								Ofertas Recentes
							</h2>
							<p className="text-muted-foreground text-sm mt-1">
								Últimos itens publicados no marketplace
							</p>
						</div>
						<Link 
							to="/marketplace"
							className="text-sm text-primary hover:text-primary/80 transition-colors"
						>
							Ver todas →
						</Link>
					</div>

					{recentListings.isLoading ? (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
							{[...Array(3)].map((_, i) => (
								<div key={i} className="h-64 rounded-lg bg-secondary/50 animate-pulse" />
							))}
						</div>
					) : offers.length > 0 ? (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
							{offers.map((offer, index) => (
								<div
									key={offer.id}
									className="animate-in fade-in slide-in-from-bottom-4 duration-500"
									style={{ animationDelay: `${index * 100}ms` }}
								>
									<OfferCard offer={offer} />
								</div>
							))}
						</div>
					) : (
						<div className="text-center py-16 bg-secondary/30 rounded-lg border border-border/50">
							<div className="text-6xl mb-4">📦</div>
							<h3 className="text-xl font-semibold text-foreground mb-2">
								Nenhuma oferta ainda
							</h3>
							<p className="text-muted-foreground mb-6">
								Seja o primeiro a criar um anúncio!
							</p>
							<Link 
								to="/listings/create"
								className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
							>
								Criar Anúncio
							</Link>
						</div>
					)}
				</div>
			</section>

			{/* API Status - Small indicator */}
			<div className="fixed bottom-4 right-4">
				<div className="flex items-center gap-2 px-3 py-2 rounded-full bg-secondary/80 backdrop-blur-sm border border-border/50 text-xs">
					<div
						className={`h-2 w-2 rounded-full ${healthCheck.data ? "bg-emerald-500" : "bg-red-500"}`}
					/>
					<span className="text-muted-foreground">
						{healthCheck.isLoading
							? "..."
							: healthCheck.data
								? "API Online"
								: "API Offline"}
					</span>
				</div>
			</div>
		</div>
	);
}
