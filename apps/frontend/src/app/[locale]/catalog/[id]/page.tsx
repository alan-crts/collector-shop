"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/routing";
import { getItemById, createCheckoutSession, type Item } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ArrowLeft, ShieldCheck, UserCircle2, AlertCircle, ShoppingCart, MessageSquare, Star, Zap } from "lucide-react";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { useTranslations } from "next-intl";

export default function ProductPage() {
    const t = useTranslations("Product");
    const commonT = useTranslations("Common");
    const params = useParams();
    const router = useRouter();
    const [item, setItem] = useState<Item | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeImage, setActiveImage] = useState<string | null>(null);
    const [sellerRating, setSellerRating] = useState<{ average: number, count: number } | null>(null);
    const { session } = useAuth();

    useEffect(() => {
        async function fetchProduct() {
            try {
                if (!params.id || typeof params.id !== "string") {
                    throw new Error("Invalid product ID");
                }
                const data = await getItemById(params.id);
                setItem(data);
                if (data.images && data.images.length > 0) {
                    setActiveImage(data.images[0]);
                }
                if (data.sellerId) {
                    import("@/lib/api").then(api => {
                        api.fetchUserReviews(data.sellerId!).then(res => {
                            setSellerRating(res.summary);
                        }).catch(console.error);
                    });
                }
            } catch (err) {
                console.error(err);
                setError(t("errorDesc"));
            } finally {
                setLoading(false);
            }
        }
        fetchProduct();
    }, [params.id]);

    const handleBuy = () => {
        if (!session) {
            router.push("/login");
            return;
        }

        if (!item) return;
        router.push(`/checkout?itemId=${item.id}`);
    };

    if (loading) {
        return (
            <div className="min-h-[calc(100vh-64px)] bg-background flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                <p className="text-muted-foreground text-lg">{t("loading")}</p>
            </div>
        );
    }

    if (error || !item) {
        return (
            <div className="min-h-[calc(100vh-64px)] bg-background p-4 flex items-center justify-center">
                <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-8 max-w-lg text-center shadow-lg">
                    <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-foreground mb-2">{t("errorTitle")}</h2>
                    <p className="text-muted-foreground mb-6">{error}</p>
                    <Button onClick={() => router.push("/catalog")} variant="outline">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        {t("back")}
                    </Button>
                </div>
            </div>
        );
    }

    const formattedPrice = new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "EUR",
    }).format(item.price);

    const isAvailable = item.status === "APPROVED";

    return (
        <div className="min-h-[calc(100vh-64px)] bg-background relative overflow-hidden font-sans pb-20">
            {/* Background Effects */}
            <div className="absolute top-20 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-[120px] -z-10 pointer-events-none" />
            <div className="absolute bottom-20 -right-32 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px] -z-10 pointer-events-none" />

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Back Button */}
                <Button variant="ghost" className="mb-8 text-muted-foreground hover:text-foreground" asChild>
                    <Link href="/catalog">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        {t("back")}
                    </Link>
                </Button>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 xl:gap-20">
                    {/* Left Column - Images */}
                    <div className="space-y-6">
                        <div className="aspect-square rounded-3xl overflow-hidden bg-muted/30 border border-border/40 shadow-xl shadow-black/5 relative group">
                            {activeImage ? (
                                <img
                                    src={activeImage}
                                    alt={item.title}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                    {t("noImage")}
                                </div>
                            )}
                            
                            {/* Badges over image */}
                            <div className="absolute top-4 left-4 flex gap-2">
                                {isAvailable ? (
                                    <Badge className="bg-emerald-600 text-white border-0 shadow-md">
                                        <ShieldCheck className="w-3 h-3 mr-1" /> {t("authenticated")}
                                    </Badge>
                                ) : (
                                    <Badge variant="secondary" className="bg-amber-500 text-white border-0 shadow-md">
                                        {t("validating")}
                                    </Badge>
                                )}
                            </div>
                        </div>

                        {/* Thumbnail Gallery */}
                        {item.images && item.images.length > 1 && (
                            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                                {item.images.map((img, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setActiveImage(img)}
                                        className={cn(
                                            "relative w-24 h-24 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0",
                                            activeImage === img ? "border-primary opacity-100 shadow-md" : "border-transparent opacity-70 hover:opacity-100"
                                        )}
                                    >
                                        <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right Column - Details */}
                    <div className="flex flex-col">
                        <div className="mb-6">
                            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground leading-tight mb-4">
                                {item.title}
                            </h1>
                            <div className="text-4xl font-bold text-primary">
                                {formattedPrice}
                            </div>
                        </div>

                        <div className="prose prose-stone dark:prose-invert max-w-none mb-8">
                            <p className="text-lg text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                {item.description}
                            </p>
                        </div>

                        {/* Seller Info Card */}
                        {item.sellerId && (
                            <Link href={`/users/${item.sellerId}`} className="block mb-8 group">
                                <Card className="bg-accent/20 border-border/40 shadow-none transition-colors group-hover:bg-accent/40">
                                    <CardContent className="p-6 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            {item.seller?.image ? (
                                                <img
                                                    src={item.seller.image}
                                                    alt={item.seller.name}
                                                    className="w-14 h-14 rounded-full object-cover border-2 border-primary/20"
                                                />
                                            ) : (
                                                <UserCircle2 className="w-14 h-14 text-muted-foreground opacity-50" />
                                            )}
                                            <div>
                                                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1 group-hover:text-primary transition-colors">
                                                    {t("verifiedSeller")}
                                                </p>
                                                <p className="text-xl font-bold text-foreground">
                                                    {item.seller?.name || commonT("anonymous")}
                                                </p>
                                            </div>
                                        </div>
                                        {sellerRating && sellerRating.count > 0 && (
                                            <div className="flex flex-col items-end">
                                                <div className="flex items-center">
                                                    <Star className="w-5 h-5 text-amber-500 fill-amber-500 mr-1.5" />
                                                    <span className="text-xl font-bold">{sellerRating.average.toFixed(1)}</span>
                                                </div>
                                                <span className="text-sm text-muted-foreground">{t("reviews", { count: sellerRating.count })}</span>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </Link>
                        )}

                        {/* Actions */}
                        <div className="mt-auto space-y-4 pt-8 border-t border-border/40">
                            {item.sellerId && (
                                <Button 
                                    variant="outline"
                                    size="lg"
                                    disabled={session?.user?.id === item.sellerId}
                                    className="w-full h-14 text-lg font-bold rounded-xl border-2 hover:bg-accent/50"
                                    asChild
                                    onClick={() => {
                                        router.push(`/messages?receiverId=${item.sellerId}&itemId=${item.id}`);
                                    }}
                                >
                                    <button className="flex items-center gap-2">
                                        <MessageSquare className="w-5 h-5" />
                                        {t("contactSeller")}
                                    </button>
                                </Button>
                            )}

                            <Button 
                                size="lg" 
                                className="w-full h-14 text-lg font-bold rounded-xl shadow-xl shadow-primary/20"
                                disabled={!isAvailable || session?.user?.id === item.sellerId}
                                onClick={handleBuy}
                            >
                                <Zap className="w-5 h-5 mr-2 fill-current" />
                                {isAvailable ? t("addToCart") : t("unavailable")}
                            </Button>
                            
                            <p className="text-center text-sm text-muted-foreground flex items-center justify-center gap-1.5">
                                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                {t("securePurchase")}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
