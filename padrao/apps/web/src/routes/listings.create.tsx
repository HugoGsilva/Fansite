import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc, trpcClient } from "@/utils/trpc";
import { useQuery, useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Package, Save, Search } from "lucide-react";

export const Route = createFileRoute("/listings/create")({
	component: CreateListingPage,
});

function CreateListingPage() {
	const navigate = useNavigate();
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedItem, setSelectedItem] = useState<{ id: string; name: string } | null>(null);
	const [price, setPrice] = useState("");
	const [currency, setCurrency] = useState<"gold" | "rubin">("gold");
	const [description, setDescription] = useState("");

	const { data: searchResults } = useQuery({
		...trpc.dataset.search.queryOptions({ query: searchQuery, limit: 10 }),
		enabled: searchQuery.length >= 2,
	});

	const createMutation = useMutation({
		mutationFn: (data: {
			itemId: string;
			price: number;
			currency: "gold" | "rubin";
			description: string | null;
			attributes: Record<string, unknown>;
		}) => trpcClient.listings.create.mutate(data),
		onSuccess: (listing) => {
			toast.success("Anúncio criado com sucesso!");
			navigate({ to: "/listings/$id", params: { id: listing.id } });
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		if (!selectedItem) {
			toast.error("Selecione um item");
			return;
		}

		const priceNumber = parseInt(price, 10);
		if (isNaN(priceNumber) || priceNumber <= 0) {
			toast.error("Preço inválido");
			return;
		}

		createMutation.mutate({
			itemId: selectedItem.id,
			price: priceNumber,
			currency,
			description: description.trim() || null,
			attributes: {},
		});
	};

	return (
		<div className="container max-w-2xl mx-auto py-8 px-4">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Package className="h-5 w-5" />
						Criar Anúncio
					</CardTitle>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-6">
						<div className="space-y-2">
							<Label>Item</Label>
							{selectedItem ? (
								<div className="flex items-center gap-2 p-3 border rounded-lg">
									<Package className="h-5 w-5 text-muted-foreground" />
									<span className="flex-1">{selectedItem.name}</span>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={() => setSelectedItem(null)}
									>
										Trocar
									</Button>
								</div>
							) : (
								<div className="space-y-2">
									<div className="relative">
										<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
										<Input
											placeholder="Buscar item..."
											className="pl-10"
											value={searchQuery}
											onChange={(e) => setSearchQuery(e.target.value)}
										/>
									</div>
									{searchResults && searchResults.length > 0 && (
										<div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
											{searchResults.map((item) => (
												<button
													key={item.id}
													type="button"
													className="w-full p-3 text-left hover:bg-muted transition-colors flex items-center gap-2"
													onClick={() => {
														setSelectedItem({ id: item.id, name: item.name });
														setSearchQuery("");
													}}
												>
													<Package className="h-4 w-4 text-muted-foreground" />
													{item.name}
												</button>
											))}
										</div>
									)}
								</div>
							)}
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="price">Preço</Label>
								<Input
									id="price"
									type="number"
									min="1"
									placeholder="1000"
									value={price}
									onChange={(e) => setPrice(e.target.value)}
								/>
							</div>

							<div className="space-y-2">
								<Label>Moeda</Label>
								<Select value={currency} onValueChange={(v: "gold" | "rubin") => setCurrency(v)}>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="gold">Gold Coins</SelectItem>
										<SelectItem value="rubin">Rubin Coins</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="description">Descrição (opcional)</Label>
							<Input
								id="description"
								placeholder="Detalhes adicionais sobre o item..."
								value={description}
								onChange={(e) => setDescription(e.target.value)}
							/>
						</div>

						<Button
							type="submit"
							className="w-full"
							disabled={!selectedItem || !price || createMutation.isPending}
						>
							<Save className="h-4 w-4 mr-2" />
							{createMutation.isPending ? "Criando..." : "Criar Anúncio"}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
