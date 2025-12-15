import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageSquare, Package } from "lucide-react";

export const Route = createFileRoute("/chat/")({
	component: ChatListPage,
});

function ChatListPage() {
	const { data: rooms, isLoading } = useQuery(trpc.chat.getMyRooms.queryOptions());

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-full">
				<div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
			</div>
		);
	}

	return (
		<div className="container max-w-2xl mx-auto py-8 px-4">
			<h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
				<MessageSquare className="h-6 w-6" />
				Minhas Negociações
			</h1>

			{rooms?.length === 0 ? (
				<div className="text-center py-12 text-muted-foreground">
					<MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
					<p>Nenhuma negociação em andamento</p>
				</div>
			) : (
				<div className="space-y-3">
					{rooms?.map((room) => (
						<Link key={room.id} to="/chat/$roomId" params={{ roomId: room.id }}>
							<Card className="hover:border-primary transition-colors cursor-pointer">
								<CardContent className="p-4 flex items-center gap-4">
									<div className="h-12 w-12 bg-muted rounded-lg flex items-center justify-center">
										{room.listing?.item?.image ? (
											<img
												src={room.listing.item.image}
												alt={room.listing.item.name}
												className="w-full h-full object-contain rounded-lg"
											/>
										) : (
											<Package className="h-6 w-6 text-muted-foreground" />
										)}
									</div>
									<div className="flex-1 min-w-0">
										<h3 className="font-medium truncate">
											{room.listing?.item?.name}
										</h3>
										<p className="text-sm text-muted-foreground truncate">
											com {room.buyer?.name} / {room.seller?.name}
										</p>
									</div>
									<div className="text-xs text-muted-foreground">
										{new Date(room.updatedAt).toLocaleDateString()}
									</div>
								</CardContent>
							</Card>
						</Link>
					))}
				</div>
			)}
		</div>
	);
}
