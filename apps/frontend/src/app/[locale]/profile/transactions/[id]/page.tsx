"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/routing";
import { useAuth } from "@/providers/AuthProvider";
import { fetchTransactionById, type Transaction } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, ArrowLeft, Package, User, Calendar, Euro, ShieldCheck, Star } from "lucide-react";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { createReview } from "@/lib/api";

export default function TransactionDetailPage() {
    const { id } = useParams() as { id: string };
    const { session, loading } = useAuth();
    const router = useRouter();
    const [transaction, setTransaction] = useState<Transaction | null>(null);
    const [fetching, setFetching] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Review Modal State
    const [reviewOpen, setReviewOpen] = useState(false);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");
    const [submittingReview, setSubmittingReview] = useState(false);
    const [reviewSuccess, setReviewSuccess] = useState(false);
    const [reviewError, setReviewError] = useState<string | null>(null);

    useEffect(() => {
        if (!loading && !session) {
            router.push(`/login?redirectTo=/profile/transactions/${id}`);
            return;
        }

        if (session && id) {
            loadTransaction(id);
        }
    }, [session, loading, id, router]);

    const loadTransaction = async (txId: string) => {
        setFetching(true);
        setError(null);
        try {
            const data = await fetchTransactionById(txId);
            setTransaction(data);
        } catch (err: any) {
            console.error("Failed to load transaction:", err);
            setError(err.response?.data?.error || "Erreur lors du chargement de la transaction.");
        } finally {
            setFetching(false);
        }
    };

    const submitReview = async () => {
        if (rating < 1 || rating > 5) return;
        setSubmittingReview(true);
        setReviewError(null);
        try {
            await createReview({
                revieweeId: otherParty!.id,
                rating,
                comment: comment.trim() || undefined,
                transactionId: transaction!.id
            });
            setReviewSuccess(true);
            setTimeout(() => setReviewOpen(false), 2000);
        } catch (err: any) {
            setReviewError(err.response?.data?.error || "Erreur lors de l'envoi de l'avis.");
        } finally {
            setSubmittingReview(false);
        }
    };

    if (loading || fetching) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !transaction) {
        return (
            <div className="max-w-3xl mx-auto py-12 px-4 text-center">
                <div className="mb-6 mb-8 text-destructive">{error || "Transaction introuvable."}</div>
                <Button variant="outline" onClick={() => router.push("/profile")}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Retour au profil
                </Button>
            </div>
        );
    }

    const isBuyer = session?.user.id === transaction.buyerId;
    const isSeller = session?.user.id === transaction.sellerId;
    const otherParty = isBuyer ? transaction.seller : transaction.buyer;
    const otherRoleName = isBuyer ? "Vendeur" : "Acheteur";

    return (
        <div className="max-w-3xl mx-auto py-12 px-4 animate-in fade-in duration-500">
            <Button variant="ghost" className="mb-6 -ml-4" asChild>
                <Link href="/profile">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Retour au profil
                </Link>
            </Button>

            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Détails de la Transaction</h1>
                    <p className="text-muted-foreground mt-1">Transaction #{transaction.id}</p>
                </div>
                <Badge variant={
                    transaction.status === 'COMPLETED' ? 'default' : 
                    transaction.status === 'PENDING' ? 'secondary' : 'destructive'
                } className="text-sm px-4 py-1.5 w-fit">
                    {transaction.status}
                </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2 border-border/40 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center">
                            <Package className="w-5 h-5 mr-2 text-primary" />
                            Article
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col sm:flex-row gap-6">
                            <div className="w-full sm:w-40 h-40 rounded-lg overflow-hidden bg-muted flex-shrink-0 border border-border/50">
                                {transaction.item?.images && transaction.item.images.length > 0 ? (
                                    <img src={transaction.item.images[0]} alt={transaction.item.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">Pas d'image</div>
                                )}
                            </div>
                            <div className="flex flex-col justify-center">
                                <h3 className="text-xl font-bold mb-2">{transaction.item?.title || "Article inconnu"}</h3>
                                <div className="space-y-3 mt-2">
                                    <div className="flex items-center text-muted-foreground">
                                        <Calendar className="w-4 h-4 mr-2" />
                                        Date: <span className="text-foreground font-medium ml-1">{new Date(transaction.createdAt).toLocaleDateString()} à {new Date(transaction.createdAt).toLocaleTimeString()}</span>
                                    </div>
                                    <div className="flex items-center text-muted-foreground">
                                        <Euro className="w-4 h-4 mr-2" />
                                        Montant: <span className="text-foreground font-bold ml-1 text-lg">{transaction.amount.toFixed(2)} €</span>
                                    </div>
                                    {isSeller && (
                                        <div className="flex items-center text-muted-foreground">
                                            <ShieldCheck className="w-4 h-4 mr-2 text-amber-500" />
                                            Commission plateforme: <span className="text-foreground font-medium ml-1 text-amber-500">{transaction.commission.toFixed(2)} €</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        <div className="mt-8 pt-6 border-t flex justify-end">
                            <Button asChild>
                                <Link href={`/catalog/${transaction.itemId}`}>
                                    Voir l'annonce
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/40 shadow-sm h-fit">
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center">
                            <User className="w-5 h-5 mr-2 text-primary" />
                            {otherRoleName}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center text-center">
                        <div className="w-20 h-20 rounded-full overflow-hidden bg-muted mb-4 border-2 border-primary/20">
                            {otherParty?.image ? (
                                <img src={otherParty.image} alt={otherParty.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-2xl">
                                    {otherParty?.name?.charAt(0).toUpperCase() || "?"}
                                </div>
                            )}
                        </div>
                        <h4 className="font-bold text-lg">{otherParty?.name || "Utilisateur inconnu"}</h4>
                        
                        <div className="w-full mt-6 space-y-3">
                            <Button variant="outline" className="w-full" disabled>
                                Contacter (Bientôt)
                            </Button>
                            
                            <Dialog open={reviewOpen} onOpenChange={(open: boolean) => {
                                setReviewOpen(open);
                                if (!open) { setReviewSuccess(false); setRating(0); setComment(""); setReviewError(null); }
                            }}>
                                <DialogTrigger asChild>
                                    <Button variant="secondary" className="w-full" disabled={transaction.status !== "COMPLETED"}>
                                        Laisser un avis
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Évaluer {otherParty?.name}</DialogTitle>
                                        <DialogDescription>
                                            Partagez votre expérience suite à cette transaction.
                                        </DialogDescription>
                                    </DialogHeader>
                                    
                                    {reviewSuccess ? (
                                        <div className="py-6 text-center text-green-600 font-medium">
                                            Avis publié avec succès !
                                        </div>
                                    ) : (
                                        <div className="space-y-4 py-4">
                                            {reviewError && <div className="text-sm text-destructive">{reviewError}</div>}
                                            <div className="flex justify-center space-x-2">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <Star
                                                        key={star}
                                                        className={cn("w-8 h-8 cursor-pointer transition-colors", rating >= star ? "fill-amber-400 text-amber-400" : "text-muted-foreground")}
                                                        onClick={() => setRating(star)}
                                                    />
                                                ))}
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Commentaire (optionnel)</label>
                                                <Textarea 
                                                    value={comment} 
                                                    onChange={(e) => setComment(e.target.value)} 
                                                    placeholder="Très bien passé, vendeur sérieux..."
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {!reviewSuccess && (
                                        <DialogFooter>
                                            <Button variant="outline" onClick={() => setReviewOpen(false)}>Annuler</Button>
                                            <Button onClick={submitReview} disabled={rating === 0 || submittingReview}>
                                                {submittingReview ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                                Envoyer
                                            </Button>
                                        </DialogFooter>
                                    )}
                                </DialogContent>
                            </Dialog>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
