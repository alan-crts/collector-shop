"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getUserPublicProfile, fetchItems, fetchUserReviews, type PublicProfile, type Item, type Review } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Package, Star, Calendar, MessageSquare } from "lucide-react";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

export default function PublicProfilePage() {
    const t = useTranslations("UserProfile");
    const commonT = useTranslations("Common");
    const { id } = useParams() as { id: string };
    const [profile, setProfile] = useState<PublicProfile | null>(null);
    const [items, setItems] = useState<Item[]>([]);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [ratingSummary, setRatingSummary] = useState<{ average: number, count: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (id) {
            loadProfileData();
        }
    }, [id]);

    const loadProfileData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [profileData, itemsData, reviewsRes] = await Promise.all([
                getUserPublicProfile(id),
                fetchItems("APPROVED", id),
                fetchUserReviews(id)
            ]);
            setProfile(profileData);
            setItems(itemsData);
            setReviews(reviewsRes.reviews);
            setRatingSummary(reviewsRes.summary);
        } catch (err: any) {
            console.error("Failed to load public profile:", err);
            setError(t("error"));
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

     if (error || !profile) {
        return (
            <div className="max-w-4xl mx-auto py-12 px-4 text-center">
                <div className="text-xl font-semibold mb-4 text-destructive">{error || t("notFound")}</div>
                <Button variant="outline" asChild>
                    <Link href="/catalog">{t("backToCatalog") || "Retour au catalogue"}</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl">
            {/* Header section */}
            <div className="flex flex-col md:flex-row gap-8 items-start mb-12">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-background shadow-xl bg-card flex-shrink-0 flex items-center justify-center">
                    {profile.image ? (
                        <img src={profile.image} alt={profile.name} className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-4xl font-bold text-muted-foreground uppercase">{profile.name.charAt(0)}</span>
                    )}
                </div>
                <div className="flex-1">
                    <h1 className="text-4xl font-extrabold tracking-tight mb-2">{profile.name}</h1>
                    <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" /> {t("memberSince", { year: new Date(profile.createdAt).getFullYear() })}
                        </span>
                        <span className="flex items-center gap-1">
                            <Package className="w-4 h-4" /> {t("sales", { count: profile.salesCount })}
                        </span>
                        {ratingSummary && ratingSummary.count > 0 && (
                            <span className="flex items-center gap-1">
                                <Star className="w-4 h-4 fill-amber-400 text-amber-400" /> 
                                {t("reviewsSummary", { average: ratingSummary.average.toFixed(1), count: ratingSummary.count })}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <Tabs defaultValue="annonces" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8 max-w-md mx-auto md:mx-0 !h-full">
                    <TabsTrigger value="annonces" className="text-lg py-3 rounded-3xl">{t("tabs.annonces", { count: items.length })}</TabsTrigger>
                    <TabsTrigger value="avis" className="text-lg py-3 rounded-3xl">{t("tabs.avis", { count: reviews.length })}</TabsTrigger>
                </TabsList>
                
                <TabsContent value="annonces" className="animate-in fade-in duration-500">
                    {items.length === 0 ? (
                        <div className="text-center py-16 bg-card/30 rounded-xl border border-dashed">
                            <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                            <h3 className="text-lg font-medium text-muted-foreground">{t("emptyAds")}</h3>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                            {items.map(item => (
                                <Link href={`/catalog/${item.id}`} key={item.id} className="group block">
                                    <Card className="overflow-hidden border-border/40 hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-md h-full flex flex-col">
                                        <div className="aspect-square w-full overflow-hidden bg-muted relative">
                                            {item.images && item.images.length > 0 ? (
                                                <img 
                                                    src={item.images[0]} 
                                                    alt={item.title} 
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-muted-foreground">Pas d'image</div>
                                            )}
                                        </div>
                                        <CardContent className="p-4 flex-1 flex flex-col">
                                            <h3 className="font-bold text-lg line-clamp-1 mb-1 group-hover:text-primary transition-colors">{item.title}</h3>
                                            <div className="flex items-center justify-between mt-auto pt-2">
                                                <span className="text-xl font-extrabold text-foreground">{item.price} €</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="avis" className="animate-in fade-in duration-500">
                    <Card className="border-border/40 shadow-sm">
                        <CardHeader>
                            <CardTitle>{t("receivedReviews")}</CardTitle>
                            <CardDescription>{t("receivedReviewsDesc", { name: profile.name })}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {reviews.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
                                    <p>{t("noReviews")}</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {reviews.map(review => (
                                        <div key={review.id} className="border-b last:border-0 pb-6 last:pb-0">
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-muted overflow-hidden">
                                                        {review.reviewer?.image ? (
                                                            <img src={review.reviewer.image} alt={review.reviewer.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-xs font-bold uppercase">
                                                                {review.reviewer?.name.charAt(0)}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <span className="font-semibold block">{review.reviewer?.name}</span>
                                                        <span className="text-xs text-muted-foreground">{new Date(review.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center">
                                                    {[1, 2, 3, 4, 5].map(star => (
                                                        <Star 
                                                            key={star} 
                                                            className={`w-4 h-4 ${star <= review.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} 
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                            {review.comment && (
                                                <p className="text-muted-foreground text-sm mt-3 bg-secondary/30 p-4 rounded-lg italic">
                                                    "{review.comment}"
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
