import { Shield, Coins, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

interface HeroSectionProps {
  onPublish?: () => void;
}

export function HeroSection({ onPublish }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden py-16 md:py-24">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-border mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="text-sm text-muted-foreground">
              Marketplace da Comunidade RubinOT
            </span>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-6xl font-bold mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
            Negocie itens com{" "}
            <span className="text-gradient-ruby">velocidade</span>
          </h1>

          {/* Description */}
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
            Encontre compradores e vendedores para seus itens do RubinOT. 
            Organize suas trades de forma simples, rápida e segura usando apenas moedas do jogo.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
            <Button 
              size="lg" 
              className="bg-primary hover:bg-primary/90 text-primary-foreground ruby-glow"
              onClick={onPublish}
              asChild={!onPublish}
            >
              {onPublish ? (
                "Criar Anúncio Grátis"
              ) : (
                <Link to="/listings/create">Criar Anúncio Grátis</Link>
              )}
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/marketplace">Ver Ofertas</Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 delay-[400ms]">
            <div className="text-center p-4 rounded-lg bg-secondary/50 border border-border/50">
              <Users className="h-6 w-6 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold text-foreground">2.4k+</div>
              <div className="text-xs text-muted-foreground">Jogadores</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-secondary/50 border border-border/50">
              <Coins className="h-6 w-6 text-accent mx-auto mb-2" />
              <div className="text-2xl font-bold text-foreground">15k+</div>
              <div className="text-xs text-muted-foreground">Trades</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-secondary/50 border border-border/50">
              <Shield className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-foreground">100%</div>
              <div className="text-xs text-muted-foreground">In-Game</div>
            </div>
          </div>
        </div>

        {/* Compliance Notice */}
        <div className="mt-12 max-w-2xl mx-auto">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <Shield className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-amber-200/90">
                <strong>Aviso Importante:</strong> Este marketplace permite apenas negociações com moedas do jogo (Gold). 
                Transações com dinheiro real são <strong>estritamente proibidas</strong> e violam os termos de uso.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
