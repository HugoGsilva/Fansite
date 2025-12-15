import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Filter, Coins, Package } from "lucide-react";

export const Route = createFileRoute("/marketplace")({
	component: MarketplacePage,
});

function MarketplacePage() {
	const [searchQuery, setSearchQuery] = useState("");
	const [currency, setCurrency] = useState<"gold" | "rubin" | undefined>();
	const [sortBy, setSortBy] = useState<"price_asc" | "price_desc" | "date_desc">("date_desc");

	const { data: listings, isLoading } = useQuery(
		trpc.listings.search.queryOptions({
			query: searchQuery || undefined,
			currency,
			sortBy,
			limit: 20,
		}),
	);

	const { data: categories } = useQuery(trpc.dataset.getCategories.queryOptions());

	return (
		<div className="container mx-auto py-6 px-4">
			<div className="flex flex-col gap-6">
				<div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
					<h1 className="text-2xl font-bold">RubinMarket</h1>
					<Link to="/listings/create">
						<Button>
							<Package className="h-4 w-4 mr-2" />
							Criar Anúncio
						</Button>
					</Link>
				</div>

				<div className="flex flex-col md:flex-row gap-4">
					<div className="relative flex-1">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Buscar itens..."
							className="pl-10"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
					</div>

					<div className="flex gap-2">
						<Select value={currency || "all"} onValueChange={(v) => setCurrency(v === "all" ? undefined : v as "gold" | "rubin")}>
							<SelectTrigger className="w-32">
								<SelectValue placeholder="Moeda" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">Todas</SelectItem>
								<SelectItem value="gold">Gold</SelectItem>
								<SelectItem value="rubin">Rubin</SelectItem>
							</SelectContent>
						</Select>

						<Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
							<SelectTrigger className="w-40">
								<SelectValue placeholder="Ordenar" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="date_desc">Mais Recentes</SelectItem>
								<SelectItem value="price_asc">Menor Preço</SelectItem>
								<SelectItem value="price_desc">Maior Preço</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>

				{isLoading ? (
					<div className="flex items-center justify-center py-12">
						<div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
					</div>
				) : listings?.items.length === 0 ? (
					<div className="text-center py-12 text-muted-foreground">
						<Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
						<p>Nenhum item encontrado</p>
					</div>
				) : (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
						{listings?.items.map((listing) => (
							<Link key={listing.id} to="/listings/$id" params={{ id: listing.id }}>
								<Card className="hover:border-primary transition-colors cursor-pointer h-full">
									<CardContent className="p-4">
										<div className="aspect-square bg-muted rounded-lg mb-3 flex items-center justify-center">
											{listing.item?.image ? (
												<img
													src={listing.item.image}
													alt={listing.item.name}
													className="w-full h-full object-contain"
												/>
											) : (
												<Package className="h-12 w-12 text-muted-foreground" />
											)}
										</div>
										<h3 className="font-medium truncate">{listing.item?.name}</h3>
										<p className="text-sm text-muted-foreground truncate">
											por {listing.seller?.name}
										</p>
										<div className="flex items-center gap-1 mt-2">
											<Coins className="h-4 w-4 text-yellow-500" />
											<span className="font-bold">
												{listing.price.toLocaleString()}
											</span>
											<span className="text-sm text-muted-foreground capitalize">
												{listing.currency}
											</span>
										</div>
									</CardContent>
								</Card>
							</Link>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
