import { Link } from "@tanstack/react-router";
import { Gem, Plus, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import UserMenu from "./user-menu";

export default function Header() {
	return (
		<header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
			<div className="container mx-auto px-4">
				<div className="flex h-16 items-center justify-between">
					{/* Logo */}
					<Link to="/" className="flex items-center gap-3">
						<div className="relative">
							<Gem className="h-8 w-8 text-primary animate-pulse-glow" />
							<div className="absolute inset-0 h-8 w-8 bg-primary/20 blur-xl rounded-full" />
						</div>
						<div className="flex flex-col">
							<h1 className="text-xl font-bold text-gradient-ruby tracking-wider">
								RubinMarket
							</h1>
							<span className="text-[10px] text-muted-foreground -mt-1">
								Fan Site • Não Oficial
							</span>
						</div>
					</Link>

					{/* Navigation */}
					<nav className="hidden md:flex items-center gap-6">
						<Link 
							to="/marketplace" 
							className="text-sm text-muted-foreground hover:text-foreground transition-colors"
						>
							Ofertas
						</Link>
						<Link 
							to="/chat" 
							className="text-sm text-muted-foreground hover:text-foreground transition-colors"
						>
							Negociações
						</Link>
					</nav>

					{/* Actions */}
					<div className="flex items-center gap-3">
						<span className="hidden sm:flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
							<span>🪙</span> Apenas Gold do Jogo
						</span>
						
						<Button variant="ghost" size="icon" className="relative" asChild>
							<Link to="/chat">
								<MessageSquare className="h-5 w-5" />
								<span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] flex items-center justify-center text-primary-foreground">
									0
								</span>
							</Link>
						</Button>

						<Button className="hidden sm:flex bg-primary hover:bg-primary/90 text-primary-foreground" asChild>
							<Link to="/listings/create">
								<Plus className="h-4 w-4 mr-1" />
								Anunciar
							</Link>
						</Button>

						<UserMenu />
					</div>
				</div>
			</div>
		</header>
	);
}
