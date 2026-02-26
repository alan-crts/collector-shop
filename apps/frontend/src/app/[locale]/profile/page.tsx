"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useRouter, Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { fetchItems, getPresignedUrl, type Item, fetchMyPurchases, fetchMySales, fetchUserReviews, type Transaction, fetchCategories, fetchMyProfile, updateMyInterests, type Category } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, User, Mail, Shield, CheckCircle2, AlertCircle, Plus, Eye, Package, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "next-intl";


export default function ProfilePage() {
    const t = useTranslations("Profile");
    const tCommon = useTranslations("Common");
    const { session, loading, refreshSession } = useAuth();
    const [name, setName] = useState(session?.user.name || "");
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [updating, setUpdating] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [myItems, setMyItems] = useState<Item[]>([]);
    const [mySales, setMySales] = useState<(Item & { transaction: Transaction })[]>([]);
    const [myPurchases, setMyPurchases] = useState<Transaction[]>([]);
    const [loadingItems, setLoadingItems] = useState(false);
    const [ratingSummary, setRatingSummary] = useState<{ average: number, count: number } | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [interests, setInterests] = useState<string[]>([]);
    const router = useRouter();

    useEffect(() => {
        if (!loading && !session) {
            router.push("/login?redirectTo=/profile");
        } else if (session) {
            setName(session.user.name);
            loadData(session.user.id);
        }
    }, [session, loading, router]);

    const loadData = async (userId: string) => {
        setLoadingItems(true);
        try {
            const [items, purchases, reviewsRes, cats, profileRes, salesItems, sales] = await Promise.all([
                fetchItems("APPROVED|PENDING|REJECTED", userId),
                fetchMyPurchases(),
                fetchUserReviews(userId),
                fetchCategories(),
                fetchMyProfile(),
                fetchItems("SOLD", userId),
                fetchMySales()
            ]);
            setMyItems(items);
            setMySales(salesItems.map((sale) => {
                const transaction = sales.find((p) => p.itemId === sale.id);
                return { ...sale, transaction: transaction! };
            }));
            setMyPurchases(purchases || []);
            setRatingSummary(reviewsRes.summary);
            setCategories(cats);
            setInterests(profileRes.interests.map((c: Category) => c.id));
        } catch (error) {
            console.error("Failed to fetch data:", error);
        } finally {
            setLoadingItems(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setUpdating(true);
        setMessage(null);

        try {
            let imageUrl = session?.user.image;
            if (imageFile) {
                const { signedUrl, publicUrl } = await getPresignedUrl(imageFile.name, imageFile.type);
                const uploadRes = await fetch(signedUrl, {
                    method: "PUT",
                    body: imageFile,
                    headers: { "Content-Type": imageFile.type }
                });
                if (!uploadRes.ok) throw new Error("Erreur lors de l'upload de l'image");
                imageUrl = publicUrl;
            }

            const { error } = await authClient.updateUser({
                name,
                image: imageUrl,
            });

            if (!error) {
                 await updateMyInterests(interests);
            }

            if (error) {
                setMessage({ type: "error", text: error.message || t("settingsSection.error") });
            } else {
                setMessage({ type: "success", text: t("settingsSection.success") });
                // await refreshSession();
            }
        } catch (err) {
            setMessage({ type: "error", text: t("settingsSection.unexpectedError") });
        } finally {
            setUpdating(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto py-12 px-4 animate-in fade-in duration-500">
            <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
                    <p className="text-muted-foreground mt-2">{t("subtitle")}</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Activity / Info Summary */}
                    <Card className="lg:col-span-1 border-border/40 bg-card/50 backdrop-blur-sm shadow-sm flex flex-col items-center p-6 text-center h-fit">
                        <div className="relative w-24 h-24 mb-4">
                            {imagePreview || session?.user.image ? (
                                <img src={imagePreview || session?.user.image!} alt="Avatar" className="w-full h-full rounded-full object-cover shadow-xl shadow-primary/20 border-2 border-primary/20" />
                            ) : (
                                <div className="w-full h-full rounded-full bg-primary flex items-center justify-center text-white text-4xl font-bold shadow-xl shadow-primary/20">
                                    {session?.user.name.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                        <h2 className="text-xl font-bold">{session?.user.name}</h2>
                        {ratingSummary && ratingSummary.count > 0 && (
                            <div className="flex items-center text-sm font-medium text-amber-500 mt-1">
                                <Star className="w-4 h-4 fill-amber-500 mr-1" />
                                {ratingSummary.average.toFixed(1)} <span className="text-muted-foreground font-normal ml-1">({ratingSummary.count} {t("reviews")})</span>
                            </div>
                        )}
                        <Badge variant="secondary" className="mt-2 uppercase tracking-wider font-bold h-6">
                            {session?.user.role}
                        </Badge>
                        <div className="mt-8 w-full space-y-4">
                            <div className="flex items-center text-sm text-muted-foreground bg-accent/30 p-2 rounded-lg">
                                <Mail className="w-4 h-4 mr-2 text-primary" />
                                <span className="truncate">{session?.user.email}</span>
                            </div>
                            <div className="flex items-center text-sm text-muted-foreground bg-accent/30 p-2 rounded-lg">
                                <Shield className={cn("w-4 h-4 mr-2 text-primary", session?.user.emailVerified ? "text-green-500" : "text-red-500")}    />
                                <span>{session?.user.emailVerified ? t("verified") : t("notVerified")}</span>
                            </div>
                        </div>
                    </Card>

                    {/* Tabs for Settings, Purchases, Sales */}
                    <div className="lg:col-span-2">
                        <Tabs defaultValue="actual_offers" className="w-full">
                            <TabsList className="grid w-full grid-cols-4 mb-8">
                                <TabsTrigger value="actual_offers">{t("tabs.ads")}</TabsTrigger>
                                <TabsTrigger value="sales">{t("tabs.sales")}</TabsTrigger>
                                <TabsTrigger value="purchases">{t("tabs.purchases")}</TabsTrigger>
                                <TabsTrigger value="settings">{t("tabs.settings")}</TabsTrigger>
                            </TabsList>
                            
                            <TabsContent value="actual_offers">
                                <Card className="border-border/40 shadow-lg bg-card/50 backdrop-blur-sm">
                                    <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                                        <div>
                                            <CardTitle>{t("adsSection.title")}</CardTitle>
                                            <CardDescription>{t("adsSection.description")}</CardDescription>
                                        </div>
                                        <Button asChild size="sm">
                                            <Link href="/sell">
                                                <Plus className="w-4 h-4 mr-2" /> {t("adsSection.sellButton")}
                                            </Link>
                                        </Button>
                                    </CardHeader>
                                    <CardContent className="pt-6">
                                        {loadingItems ? (
                                            <div className="flex justify-center py-12">
                                                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                                            </div>
                                        ) : myItems.length === 0 ? (
                                            <div className="text-center py-12 border-2 border-dashed rounded-lg border-muted">
                                                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                                                <h3 className="text-lg font-medium">{t("adsSection.emptyTitle")}</h3>
                                                <p className="text-sm text-muted-foreground mt-1 mb-4">{t("adsSection.emptyText")}</p>
                                                <Button asChild variant="outline">
                                                    <Link href="/sell">{t("adsSection.createFirst")}</Link>
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {myItems.map(item => (
                                                    <div key={item.id} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/10 transition-colors">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-16 h-16 rounded overflow-hidden bg-muted flex-shrink-0">
                                                                {item.images && item.images.length > 0 ? (
                                                                    <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">{tCommon("noImage")}</div>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <h4 className="font-semibold line-clamp-1">{item.title}</h4>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <span className="font-bold text-primary">{item.price} €</span>
                                                                     <Badge variant={
                                                                        item.status === 'APPROVED' ? 'default' : 
                                                                        item.status === 'PENDING' ? 'secondary' : 'destructive'
                                                                    } className="text-[10px] h-5">
                                                                        {tCommon(`status.${item.status.toLowerCase()}`)}
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                        </div>
                                                         <Button variant="ghost" size="sm" asChild>
                                                            <Link href={`/catalog/${item.id}`}>
                                                                <Eye className="w-4 h-4 mr-2" /> {t("adsSection.view")}
                                                            </Link>
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="sales">
                                <Card className="border-border/40 shadow-lg bg-card/50 backdrop-blur-sm">
                                     <CardHeader className="border-b pb-4">
                                        <CardTitle>{t("salesSection.title")}</CardTitle>
                                        <CardDescription>{t("salesSection.description")}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="pt-6">
                                        {loadingItems ? (
                                            <div className="flex justify-center py-12">
                                                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                                            </div>
                                         ) : mySales.length === 0 ? (
                                            <div className="text-center py-12 text-muted-foreground">
                                                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                                <p>{t("salesSection.empty")}</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {mySales.map(item => (
                                                    <div key={item.id} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/10 transition-colors">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-16 h-16 rounded overflow-hidden bg-muted flex-shrink-0">
                                                                {item.images && item.images.length > 0 ? (
                                                                    <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">{tCommon("noImage")}</div>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <h4 className="font-semibold line-clamp-1">{item.title}</h4>
                                                                 <div className="flex items-center gap-2 mt-1">
                                                                    <span className={cn("font-bold text-primary", item.price !== (item.transaction.amount - item.transaction.commission) && "line-through text-destructive")}>{item.price} €</span>
                                                                    {item.price !== (item.transaction.amount - item.transaction.commission) && <span className="font-bold text-primary">{item.transaction.amount - item.transaction.commission} €</span>}
                                                                    <Badge variant={
                                                                        item.status === 'APPROVED' ? 'default' : 
                                                                        item.status === 'PENDING' ? 'secondary' : 'destructive'
                                                                    } className="text-[10px] h-5">
                                                                        {tCommon(`status.${item.status.toLowerCase()}`)}
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                        </div>
                                                         <Button variant="ghost" size="sm" asChild>
                                                            <Link href={`/profile/transactions/${item.transaction.id}`}>
                                                                <Eye className="w-4 h-4 mr-2" /> {t("adsSection.view")}
                                                            </Link>
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="purchases">
                                <Card className="border-border/40 shadow-lg bg-card/50 backdrop-blur-sm">
                                     <CardHeader className="border-b pb-4">
                                        <CardTitle>{t("purchasesSection.title")}</CardTitle>
                                        <CardDescription>{t("purchasesSection.description")}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="pt-6">
                                        {loadingItems ? (
                                            <div className="flex justify-center py-12">
                                                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                                            </div>
                                        ) : myPurchases.length === 0 ? (
                                            <div className="text-center py-12 border-2 border-dashed rounded-lg border-muted">
                                                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                                                <h3 className="text-lg font-medium">{t("purchasesSection.emptyTitle")}</h3>
                                                <p className="text-sm text-muted-foreground mt-1 mb-4">{t("purchasesSection.emptyText")}</p>
                                                <Button variant="outline" asChild>
                                                    <Link href="/catalog">{t("purchasesSection.explore")}</Link>
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {myPurchases.map((tx: Transaction) => (
                                                    <div key={tx.id} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/10 transition-colors">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-16 h-16 rounded overflow-hidden bg-muted flex-shrink-0">
                                                                {tx.item?.images && tx.item.images.length > 0 ? (
                                                                    <img src={tx.item.images[0]} alt={tx.item.title} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">Pas d'image</div>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <h4 className="font-semibold line-clamp-1">{tx.item?.title || "Article inconnu"}</h4>
                                                                <div className="text-xs text-muted-foreground mb-1">
                                                                    Acheté à {tx.seller?.name || "Vendeur supprimé"} le {new Date(tx.createdAt).toLocaleDateString()}
                                                                </div>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <span className="font-bold text-primary">{tx.amount} €</span>
                                                                    <Badge variant={
                                                                        tx.status === 'COMPLETED' ? 'default' : 
                                                                        tx.status === 'PENDING' ? 'secondary' : 'destructive'
                                                                    } className="text-[10px] h-5">
                                                                        {tCommon(`status.${tx.status.toLowerCase()}`)}
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <Button variant="ghost" size="sm" asChild>
                                                            <Link href={`/profile/transactions/${tx.id}`}>
                                                                <Eye className="w-4 h-4 mr-2" /> {t("adsSection.view")}
                                                            </Link>
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="settings" className="space-y-6">
                                <Card className="border-border/40 overflow-hidden shadow-lg bg-card/50 backdrop-blur-sm">
                                    <CardHeader className="border-b bg-accent/10">
                                        <CardTitle>{t("settingsSection.title")}</CardTitle>
                                        <CardDescription>{t("settingsSection.description")}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="pt-6">
                                        {message && (
                                            <div className={`p-4 rounded-lg mb-6 flex items-center gap-3 animate-in slide-in-from-top-2 duration-300 ${
                                                message.type === "success" ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-destructive/10 text-destructive border border-destructive/20"
                                            }`}>
                                                {message.type === "success" ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                                                <span className="text-sm font-medium">{message.text}</span>
                                            </div>
                                        )}

                                        <form onSubmit={handleUpdate} className="space-y-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="name">{t("settingsSection.name")}</Label>
                                                <div className="relative">
                                                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        id="name"
                                                        value={name}
                                                        onChange={(e) => setName(e.target.value)}
                                                        className="pl-10 h-11"
                                                        placeholder="John Doe"
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="image">{t("settingsSection.image")}</Label>
                                                <Input
                                                    id="image"
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => {
                                                        if (e.target.files && e.target.files.length > 0) {
                                                            const file = e.target.files[0];
                                                            setImageFile(file);
                                                            setImagePreview(URL.createObjectURL(file));
                                                        }
                                                    }}
                                                    className="h-11"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="email">{t("settingsSection.email")}</Label>
                                                <div className="relative">
                                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground opacity-50" />
                                                    <Input
                                                        id="email"
                                                        value={session?.user.email}
                                                        className="pl-10 h-11 bg-muted/50 text-muted-foreground cursor-not-allowed border-dashed"
                                                        disabled
                                                    />
                                                </div>
                                                <p className="text-[11px] text-muted-foreground flex items-center gap-1 italic">
                                                    <AlertCircle className="w-3 h-3" />
                                                    {t("settingsSection.emailHint")}
                                                </p>
                                            </div>

                                            <div className="space-y-3 pt-4 border-t">
                                                <Label>{t("settingsSection.interests")}</Label>
                                                <CardDescription className="text-xs">
                                                    {t("settingsSection.interestsHint")}
                                                </CardDescription>
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                                                    {categories.map((cat) => (
                                                        <label key={cat.id} className="flex items-center space-x-2 border rounded-md p-3 cursor-pointer hover:bg-accent/50 transition-colors">
                                                            <input
                                                                type="checkbox"
                                                                className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4"
                                                                checked={interests.includes(cat.id)}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) {
                                                                        setInterests([...interests, cat.id]);
                                                                    } else {
                                                                        setInterests(interests.filter(id => id !== cat.id));
                                                                    }
                                                                }}
                                                            />
                                                            <span className="text-sm font-medium">{cat.name}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="pt-4 flex justify-end">
                                                <Button type="submit" disabled={updating} className="h-11 px-8 min-w-[200px] font-semibold transition-all hover:shadow-lg hover:shadow-primary/20">
                                                    {updating ? (
                                                        <>
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                            {t("settingsSection.updating")}
                                                        </>
                                                    ) : t("settingsSection.save")}
                                                </Button>
                                            </div>
                                        </form>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </div>
        </div>
    );
}
