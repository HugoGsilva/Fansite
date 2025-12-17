import { Clock, MessageSquare, User, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

export interface Offer {
  id: string;
  itemName: string;
  itemImage?: string;
  price: number;
  currency: "gold" | "rubin";
  type: "buying" | "selling";
  rarity?: "common" | "rare" | "epic" | "legendary";
  category?: string;
  seller: {
    id: string;
    name: string;
  };
  createdAt: string;
  description?: string;
}

interface OfferCardProps {
  offer: Offer;
  onContact?: (offer: Offer) => void;
}

const rarityStyles = {
  common: "rarity-common",
  rare: "rarity-rare",
  epic: "rarity-epic",
  legendary: "rarity-legendary",
};

const rarityBadgeStyles = {
  common: "bg-gray-500/20 text-gray-300 border-gray-500/30",
  rare: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  epic: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  legendary: "bg-amber-500/20 text-amber-300 border-amber-500/30",
};

function formatPrice(price: number): string {
  return price.toLocaleString("pt-BR");
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "agora";
  if (diffMins < 60) return `há ${diffMins} min`;
  if (diffHours < 24) return `há ${diffHours}h`;
  return `há ${diffDays}d`;
}

export function OfferCard({ offer, onContact }: OfferCardProps) {
  const rarity = offer.rarity || "common";

  return (
    <div
      className={`group relative rounded-lg border-2 bg-card overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 ${rarityStyles[rarity]}`}
    >
      {/* Rarity Glow Effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className={`absolute inset-0 blur-xl ${
          rarity === "legendary" ? "bg-amber-500/20" :
          rarity === "epic" ? "bg-purple-500/20" :
          rarity === "rare" ? "bg-blue-500/20" :
          "bg-gray-500/10"
        }`} />
      </div>

      <div className="relative p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${
                offer.type === "buying" 
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" 
                  : "bg-primary/20 text-primary border-primary/30"
              }`}>
                {offer.type === "buying" ? "Comprando" : "Vendendo"}
              </span>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full border capitalize ${rarityBadgeStyles[rarity]}`}>
                {rarity}
              </span>
            </div>
            <h3 className="font-semibold text-foreground truncate text-lg">
              {offer.itemName}
            </h3>
          </div>
          
          {/* Item Icon Placeholder */}
          <div className="w-16 h-16 rounded-lg bg-secondary border border-border flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">⚔️</span>
          </div>
        </div>

        {/* Price */}
        <div className="flex items-center gap-2 mb-3 p-2 rounded-md bg-accent/10 border border-accent/20">
          <Coins className="h-5 w-5 text-accent" />
          <span className="font-bold text-accent text-lg">{formatPrice(offer.price)}</span>
          <span className="text-xs text-muted-foreground capitalize">{offer.currency}</span>
        </div>

        {/* Description */}
        {offer.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {offer.description}
          </p>
        )}

        {/* Meta Info */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-4">
          {offer.category && (
            <div className="flex items-center gap-1">
              {offer.category}
            </div>
          )}
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDate(offer.createdAt)}
          </div>
        </div>

        {/* Seller & Action */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="text-sm font-medium text-foreground">{offer.seller.name}</span>
          </div>
          
          {onContact ? (
            <Button 
              size="sm" 
              className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30"
              onClick={() => onContact(offer)}
            >
              <MessageSquare className="h-4 w-4 mr-1" />
              Contato
            </Button>
          ) : (
            <Button 
              size="sm" 
              className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30"
              asChild
            >
              <Link to="/listings/$id" params={{ id: offer.id }}>
                <MessageSquare className="h-4 w-4 mr-1" />
                Ver mais
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
