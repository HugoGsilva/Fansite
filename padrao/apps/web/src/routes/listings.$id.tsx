import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc, trpcClient } from "@/utils/trpc";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Coins, Package, MessageSquare, User, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/listings/$id")({
	component: ListingDetailPage,
});

function ListingDetailPage() {
	const { id } = Route.useParams();
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const { data: listing, isLoading } = useQuery(
		trpc.listings.getById.queryOptions({ id }),
	);

	const createRoomMutation = useMutation({
		mutationFn: () => trpcClient.chat.createRoom.mutate({ listingId: id }),
		onSuccess: (room) => {
			toast.success("Chat iniciado!");
			navigate({ to: "/chat/$roomId", params: { roomId: room.id } });
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-full">
				<div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
			</div>
		);
	}

	if (!listing) {
		return (
			<div className="container max-w-4xl mx-auto py-8 px-4 text-center">
				<Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
				<h1 className="text-2xl font-bold mb-2">Anúncio não encontrado</h1>
				<Button variant="outline" onClick={() => navigate({ to: "/marketplace" })}>
					<ArrowLeft className="h-4 w-4 mr-2" />
					Voltar ao Marketplace
				</Button>
			</div>
		);
	}

	return (
		<div className="container max-w-4xl mx-auto py-8 px-4">
			<Button
				variant="ghost"
				className="mb-4"
				onClick={() => navigate({ to: "/marketplace" })}
			>
				<ArrowLeft className="h-4 w-4 mr-2" />
				Voltar
			</Button>

			<div className="grid md:grid-cols-2 gap-6">
				<Card>
					<CardContent className="p-6">
						<div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
							{listing.item?.image ? (
								<img
									src={listing.item.image}
									alt={listing.item?.name}
									className="w-full h-full object-contain"
								/>
							) : (
								<Package className="h-24 w-24 text-muted-foreground" />
							)}
						</div>
					</CardContent>
				</Card>

				<div className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle className="text-2xl">{listing.item?.name}</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="flex items-center gap-2 text-3xl font-bold">
								<Coins className="h-8 w-8 text-yellow-500" />
								{listing.price.toLocaleString()}
								<span className="text-lg text-muted-foreground capitalize">
									{listing.currency}
								</span>
							</div>

							{listing.description && (
								<p className="text-muted-foreground">{listing.description}</p>
							)}

							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<User className="h-4 w-4" />
								Vendedor: {listing.seller?.name}
							</div>

							<Button
								className="w-full"
								size="lg"
								onClick={() => createRoomMutation.mutate()}
								disabled={createRoomMutation.isPending}
							>
								<MessageSquare className="h-4 w-4 mr-2" />
								{createRoomMutation.isPending ? "Iniciando..." : "Negociar"}
							</Button>
						</CardContent>
					</Card>

					{listing.attributes && Object.keys(listing.attributes).length > 0 && (
						<Card>
							<CardHeader>
								<CardTitle className="text-lg">Atributos</CardTitle>
							</CardHeader>
							<CardContent>
								<dl className="grid grid-cols-2 gap-2 text-sm">
									{Object.entries(listing.attributes).map(([key, value]) => (
										<div key={key}>
											<dt className="text-muted-foreground capitalize">{key}</dt>
											<dd className="font-medium">{String(value)}</dd>
										</div>
									))}
								</dl>
							</CardContent>
						</Card>
					)}
				</div>
			</div>
		</div>
	);
}
