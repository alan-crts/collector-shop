"use client";

import { useEffect, useState } from "react";
import { fetchRecommendations, Item } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Loader2 } from "lucide-react";
import { Link } from "@/i18n/routing";
import Image from "next/image";
import { useTranslations } from "next-intl";

export function RecommendedItems() {
    const { session, loading: sessionLoading } = useAuth();
    const t = useTranslations("Common");
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (sessionLoading) return;
        if (!session?.user) {
            setLoading(false);
            return;
        }

        fetchRecommendations()
            .then(data => {
                setItems(data);
                setLoading(false);
            })
            .catch(() => {
                setLoading(false);
            });
    }, [session, sessionLoading]);

    if (loading || sessionLoading) {
        return (
            <section className="py-16 bg-accent/20 border-t">
               <div className="max-w-7xl mx-auto flex justify-center py-12"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>
            </section>
        );
    }

    if (!session?.user || items.length === 0) {
        return null;
    }

    return (
        <section className="py-16 bg-accent/10 border-t">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex items-center gap-2 mb-8">
                    <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                    <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">Recommandé pour vous</h2>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {items.slice(0, 4).map(item => (
                        <Link key={item.id} href={`/products/${item.id}`} className="group block">
                            <Card className="h-full overflow-hidden hover:shadow-2xl transition-all border-border/40 hover:-translate-y-1">
                                <div className="aspect-[4/3] relative bg-muted overflow-hidden">
                                    {item.images && item.images[0] ? (
                                        <Image
                                            src={item.images[0]}
                                            alt={item.title}
                                            fill
                                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                                            sizes="(max-width: 768px) 100vw, 300px"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-accent/50 group-hover:bg-accent/80 transition-colors">
                                            Collector
                                        </div>
                                    )}
                                </div>
                                <CardContent className="p-4 bg-card">
                                    <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">{item.title}</h3>
                                    <p className="text-primary font-bold mt-2 text-xl">{item.price.toFixed(2)} €</p>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
