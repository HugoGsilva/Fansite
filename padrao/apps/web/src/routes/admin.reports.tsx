import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc, trpcClient } from "@/utils/trpc";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { toast } from "sonner";
import { Shield, AlertTriangle, Ban, Trash2, X, MessageSquare, Package } from "lucide-react";

export const Route = createFileRoute("/admin/reports")({
	component: AdminReportsPage,
	beforeLoad: async () => {
		const session = await authClient.getSession();
		if (!session.data) {
			redirect({
				to: "/login",
				throw: true,
			});
		}
		// Verificação de role será feita pela API, mas redirecionamos se não autenticado
		return { session };
	},
});

function AdminReportsPage() {
	const queryClient = useQueryClient();

	const { data: reports, isLoading } = useQuery(trpc.reports.getQueue.queryOptions());

	const resolveMutation = useMutation({
		mutationFn: (data: { id: string; action: "dismiss" | "remove_listing" | "ban_user" }) =>
			trpcClient.reports.resolve.mutate(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["reports"] });
			toast.success("Report resolvido");
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const getReasonLabel = (reason: string) => {
		const labels: Record<string, string> = {
			spam: "Spam",
			scam: "Golpe",
			unrealistic_price: "Preço Irreal",
			offense: "Ofensa",
		};
		return labels[reason] || reason;
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-full">
				<div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
			</div>
		);
	}

	return (
		<div className="container max-w-4xl mx-auto py-8 px-4">
			<h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
				<Shield className="h-6 w-6" />
				Fila de Moderação
			</h1>

			{reports?.length === 0 ? (
				<div className="text-center py-12 text-muted-foreground">
					<Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
					<p>Nenhum report pendente</p>
				</div>
			) : (
				<div className="space-y-4">
					{reports?.map((report) => (
						<Card key={report.id}>
							<CardHeader className="pb-3">
								<div className="flex items-center justify-between">
									<CardTitle className="text-lg flex items-center gap-2">
										<AlertTriangle className="h-5 w-5 text-amber-500" />
										{report.targetType === "listing" ? "Denúncia de Anúncio" : "Denúncia de Usuário"}
									</CardTitle>
									<span className="text-sm px-2 py-1 bg-amber-500/10 text-amber-500 rounded">
										{getReasonLabel(report.reason)}
									</span>
								</div>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="text-sm text-muted-foreground">
									<p>Target ID: {report.targetId}</p>
									<p>Reportado em: {new Date(report.createdAt).toLocaleString()}</p>
								</div>

								{report.encryptedChatLog && (
									<div className="flex items-center gap-2 text-sm text-muted-foreground">
										<MessageSquare className="h-4 w-4" />
										Log de chat disponível
									</div>
								)}

								<div className="flex gap-2 pt-2">
									<Button
										variant="outline"
										size="sm"
										onClick={() => resolveMutation.mutate({ id: report.id, action: "dismiss" })}
										disabled={resolveMutation.isPending}
									>
										<X className="h-4 w-4 mr-1" />
										Dispensar
									</Button>

									{report.targetType === "listing" && (
										<Button
											variant="destructive"
											size="sm"
											onClick={() => resolveMutation.mutate({ id: report.id, action: "remove_listing" })}
											disabled={resolveMutation.isPending}
										>
											<Trash2 className="h-4 w-4 mr-1" />
											Remover Anúncio
										</Button>
									)}

									<Button
										variant="destructive"
										size="sm"
										onClick={() => resolveMutation.mutate({ id: report.id, action: "ban_user" })}
										disabled={resolveMutation.isPending}
									>
										<Ban className="h-4 w-4 mr-1" />
										Banir Usuário
									</Button>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}
