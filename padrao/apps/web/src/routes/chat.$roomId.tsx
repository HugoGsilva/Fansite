import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc, trpcClient } from "@/utils/trpc";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Send, ArrowLeft, AlertTriangle, Package, Flag } from "lucide-react";

export const Route = createFileRoute("/chat/$roomId")({
	component: ChatRoomPage,
});

function ChatRoomPage() {
	const { roomId } = Route.useParams();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [message, setMessage] = useState("");
	const messagesEndRef = useRef<HTMLDivElement>(null);

	const { data: room } = useQuery(trpc.chat.getRoom.queryOptions({ roomId }));

	const { data: rmtWarning } = useQuery(trpc.chat.getRmtWarning.queryOptions());

	const { data: messagesData, refetch: refetchMessages } = useQuery(
		trpc.chat.getMessages.queryOptions({ roomId, limit: 50 }),
	);

	const sendMutation = useMutation({
		mutationFn: (content: string) =>
			trpcClient.chat.sendMessage.mutate({ roomId, content }),
		onSuccess: () => {
			setMessage("");
			refetchMessages();
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const handleSend = (e: React.FormEvent) => {
		e.preventDefault();
		if (message.trim()) {
			sendMutation.mutate(message.trim());
		}
	};

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messagesData?.messages]);

	// Poll for new messages
	useEffect(() => {
		const interval = setInterval(() => {
			refetchMessages();
		}, 3000);
		return () => clearInterval(interval);
	}, [refetchMessages]);

	return (
		<div className="container max-w-3xl mx-auto py-4 px-4 h-[calc(100vh-4rem)] flex flex-col">
			<div className="flex items-center gap-4 mb-4">
				<Button variant="ghost" size="icon" onClick={() => navigate({ to: "/chat" })}>
					<ArrowLeft className="h-5 w-5" />
				</Button>
				<div className="flex-1">
					<h1 className="font-semibold truncate">
						{room?.listing?.item?.name || "Chat"}
					</h1>
					<p className="text-sm text-muted-foreground">
						Negociação com{" "}
						{room?.buyer?.name === room?.seller?.name
							? room?.buyer?.name
							: `${room?.buyer?.name} e ${room?.seller?.name}`}
					</p>
				</div>
				<Button variant="outline" size="icon" title="Denunciar">
					<Flag className="h-4 w-4" />
				</Button>
			</div>

			{rmtWarning && (
				<div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg mb-4">
					<AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
					<p className="text-sm text-red-500">{rmtWarning.message}</p>
				</div>
			)}

			<Card className="flex-1 flex flex-col min-h-0">
				<CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
					{messagesData?.messages.map((msg) => (
						<div
							key={msg.id}
							className={`flex ${
								msg.senderId === room?.buyerId ? "justify-end" : "justify-start"
							}`}
						>
							<div
								className={`max-w-[80%] rounded-lg px-4 py-2 ${
									msg.senderId === room?.buyerId
										? "bg-primary text-primary-foreground"
										: "bg-muted"
								}`}
							>
								<p className="text-sm">{msg.content}</p>
								<p className="text-xs opacity-70 mt-1">
									{new Date(msg.createdAt).toLocaleTimeString()}
								</p>
							</div>
						</div>
					))}
					<div ref={messagesEndRef} />
				</CardContent>

				<div className="p-4 border-t">
					<form onSubmit={handleSend} className="flex gap-2">
						<Input
							placeholder="Digite sua mensagem..."
							value={message}
							onChange={(e) => setMessage(e.target.value)}
							disabled={room?.status !== "active"}
						/>
						<Button
							type="submit"
							disabled={!message.trim() || sendMutation.isPending || room?.status !== "active"}
						>
							<Send className="h-4 w-4" />
						</Button>
					</form>
				</div>
			</Card>
		</div>
	);
}
