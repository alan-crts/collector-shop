import { Item } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";

interface ItemCardProps {
  item: Item;
}

export function ItemCard({ item }: ItemCardProps) {
  const getStatusBadge = (status: Item["status"]) => {
    switch (status) {
      case "APPROVED":
        return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white">Approuvé</Badge>;
      case "PENDING":
        return <Badge className="bg-amber-600 hover:bg-amber-700 text-white">En attente</Badge>;
      case "REJECTED":
        return <Badge variant="destructive">Rejeté</Badge>;
      default:
        return <Badge variant="secondary">Inconnu</Badge>;
    }
  };

  const formattedPrice = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(item.price);

  return (
    <Link href={`/catalog/${item.id}`} className="block h-full outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl">
      <Card className="flex flex-col h-full bg-background/40 hover:bg-background/80 border-border/40 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 overflow-hidden group rounded-xl">
        <CardHeader className="pb-3 border-b border-border/20 bg-accent/20">
          <div className="flex justify-between items-start gap-2">
            <CardTitle className="text-xl font-bold tracking-tight text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
              {item.title}
            </CardTitle>
            {getStatusBadge(item.status)}
          </div>
          <CardDescription className="text-primary font-bold text-lg">
            {formattedPrice}
          </CardDescription>
        </CardHeader>
        
        {item.images && item.images.length > 0 && (
          <div className="w-full h-48 overflow-hidden bg-muted/30 relative">
            <img 
              src={item.images[0]} 
              alt={item.title} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          </div>
        )}
        
        <CardContent className="flex-grow pt-5">
          <p className="text-muted-foreground text-sm line-clamp-3 leading-relaxed">
            {item.description}
          </p>
        </CardContent>
        
        <CardFooter className="pt-4 pb-4 border-t border-border/20 bg-accent/5 flex justify-between items-center text-muted-foreground text-xs">
          <div className="flex items-center gap-2">
            {item.seller?.image ? (
              <img 
                src={item.seller.image} 
                alt={`Avatar de ${item.seller.name}`} 
                className="w-6 h-6 rounded-full object-cover border border-border"
              />
            ) : (
              <UserCircle2 className="w-6 h-6 opacity-70" />
            )}
            <span className="truncate max-w-[120px]">Vendeur: {item.seller?.name || "Anonyme"}</span>
          </div>
          
          <ArrowRight className="w-4 h-4 text-primary opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0" />
        </CardFooter>
      </Card>
    </Link>
  );
}
