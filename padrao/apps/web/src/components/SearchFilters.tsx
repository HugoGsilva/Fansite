import { Search, Filter, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SearchFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedType: string;
  onTypeChange: (type: string) => void;
  selectedCurrency: string;
  onCurrencyChange: (currency: string) => void;
}

const types = ["Todos", "Comprando", "Vendendo"];
const currencies = ["Todas", "Gold", "Rubin"];

export function SearchFilters({
  searchQuery,
  onSearchChange,
  selectedType,
  onTypeChange,
  selectedCurrency,
  onCurrencyChange,
}: SearchFiltersProps) {
  return (
    <section className="sticky top-16 z-40 py-4 bg-background/95 backdrop-blur-lg border-b border-border/50">
      <div className="container mx-auto px-4">
        {/* Search Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar itens... (ex: Espada do Dragão, Poção de Mana)"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 h-12 bg-secondary border-border"
            />
          </div>
          <Button variant="outline" className="h-12 gap-2">
            <Filter className="h-4 w-4" />
            Filtros Avançados
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap gap-3">
          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Tipo:</span>
            <div className="flex gap-1">
              {types.map((type) => (
                <button
                  key={type}
                  onClick={() => onTypeChange(type)}
                  className={`px-3 py-1 text-xs rounded-full transition-all ${
                    selectedType === type
                      ? type === "Comprando"
                        ? "bg-emerald-600 text-white"
                        : type === "Vendendo"
                        ? "bg-primary text-primary-foreground"
                        : "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="w-px h-6 bg-border hidden md:block" />

          {/* Currency Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Moeda:</span>
            <div className="flex gap-1">
              {currencies.map((currency) => (
                <button
                  key={currency}
                  onClick={() => onCurrencyChange(currency)}
                  className={`px-3 py-1 text-xs rounded-full transition-all ${
                    selectedCurrency === currency
                      ? "bg-accent text-accent-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {currency}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
