import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc, trpcClient } from "@/utils/trpc";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AlertCircle, Save, User } from "lucide-react";

export const Route = createFileRoute("/profile")({
	component: ProfilePage,
});

function ProfilePage() {
	const queryClient = useQueryClient();
	const [discordUsername, setDiscordUsername] = useState("");

	const { data: profile, isLoading } = useQuery(trpc.profile.get.queryOptions());

	const { data: discordAlert } = useQuery(trpc.profile.getDiscordAlert.queryOptions());

	const updateMutation = useMutation({
		mutationFn: (data: { discordUsername: string | null }) =>
			trpcClient.profile.update.mutate(data),
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ["profile"] });
			toast.success("Perfil atualizado com sucesso!");
			if (data.showDiscordAlert) {
				toast.info(discordAlert?.message || "Habilite DMs no servidor oficial.");
			}
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const handleSave = () => {
		updateMutation.mutate({
			discordUsername: discordUsername.trim() || null,
		});
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-full">
				<div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
			</div>
		);
	}

	return (
		<div className="container max-w-2xl mx-auto py-8 px-4">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<User className="h-5 w-5" />
						Configurações do Perfil
					</CardTitle>
					<CardDescription>
						Gerencie suas configurações de conta e notificações
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="space-y-2">
						<Label htmlFor="name">Nome</Label>
						<Input id="name" value={profile?.name || ""} disabled />
					</div>

					<div className="space-y-2">
						<Label htmlFor="email">Email</Label>
						<Input id="email" value={profile?.email || ""} disabled />
					</div>

					<div className="space-y-2">
						<Label htmlFor="discord">Username do Discord</Label>
						<Input
							id="discord"
							placeholder="seu_usuario_discord"
							defaultValue={profile?.discordUsername || ""}
							onChange={(e) => setDiscordUsername(e.target.value)}
						/>
						<p className="text-sm text-muted-foreground">
							Configure para receber notificações via Discord DM
						</p>
					</div>

					{discordAlert && (
						<div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
							<AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
							<p className="text-sm text-amber-500">{discordAlert.message}</p>
						</div>
					)}

					<div className="flex items-center gap-2 pt-4">
						<span className="text-sm text-muted-foreground">
							Role: <span className="font-medium capitalize">{profile?.role}</span>
						</span>
						{profile?.isBanned && (
							<span className="text-sm text-red-500 font-medium">
								(Conta Suspensa)
							</span>
						)}
					</div>

					<Button
						onClick={handleSave}
						disabled={updateMutation.isPending}
						className="w-full"
					>
						<Save className="h-4 w-4 mr-2" />
						{updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
