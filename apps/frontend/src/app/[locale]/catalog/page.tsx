"use client";

import React, { useEffect, useState } from "react";
import { ItemCard } from "@/components/ItemCard";
import { SellItemModal } from "@/components/SellItemModal";
import { fetchItems, fetchCategories, type Item, type Category } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { Loader2, PackageOpen, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";

export default function CatalogPage() {
  const t = useTranslations("Catalog");
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use better-auth client to check session
  const { data: session } = authClient.useSession();
  const isSeller = session?.user?.role === "SELLER";

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const [itemsData, categoriesData] = await Promise.all([
          fetchItems(undefined, undefined, selectedCategory || undefined),
          categories.length === 0 ? fetchCategories() : Promise.resolve(categories)
        ]);
        setItems(itemsData);
        if (categories.length === 0) {
            setCategories(categoriesData);
        }
      } catch (err) {
        setError(t("errorLoading"));
        console.error("Error loading catalog:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [selectedCategory]);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-background relative overflow-hidden font-sans pb-20">
      {/* Decorative background blobs */}
      <div className="absolute top-0 -left-20 w-96 h-96 bg-primary/10 rounded-full blur-[100px] -z-10 animate-pulse pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] -z-10 animate-pulse delay-1000 pointer-events-none" />

      <main className="container mx-auto px-4 py-12 max-w-7xl relative z-10">
        <header className="mb-12 flex flex-col md:flex-row justify-between items-center gap-6 border-b border-border/40 pb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-transparent">
              {t("title")}
            </h1>
            <p className="text-lg text-muted-foreground mt-2">
              {t("subtitle")}
            </p>
          </div>
          
          {/* Only render the Sell button if the user is a SELLER, or maybe just authenticated. We'll show to SELLERS. */}
          {isSeller && (
            <div className="flex-shrink-0">
              <SellItemModal />
            </div>
          )}
        </header>
        
        <div className="mb-8 flex flex-wrap gap-2">
            <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedCategory === null ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
            >
                {t("allCategories")}
            </button>
            {categories.map((cat) => (
                <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedCategory === cat.id ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
                >
                    {cat.name}
                </button>
            ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 min-h-[50vh]">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground text-lg">{t("loadingText")}</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start gap-4 shadow-sm max-w-2xl mx-auto mt-10">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-red-800 font-medium text-lg">{t("errorTitle")}</h3>
              <p className="text-red-600 mt-1">{error}</p>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-32 bg-accent/20 rounded-3xl border border-border/40 backdrop-blur-sm shadow-sm animate-in fade-in duration-500">
            <PackageOpen className="w-20 h-20 text-muted-foreground mx-auto mb-6 opacity-80" />
            <h2 className="text-2xl font-bold mb-3">{t("emptyTitle")}</h2>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">{t("emptyText")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
