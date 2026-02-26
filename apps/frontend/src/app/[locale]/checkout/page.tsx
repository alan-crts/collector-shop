"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createCheckoutSession, getItemById, type Item } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, ShieldCheck } from "lucide-react";
import { Link } from "@/i18n/routing";
import Image from "next/image";

function CheckoutContent() {
    const searchParams = useSearchParams();
    const itemId = searchParams.get("itemId");
    const offerId = searchParams.get("offerId") || undefined;
    const offerPriceStr = searchParams.get("offerPrice");

    const [item, setItem] = useState<Item | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [redirecting, setRedirecting] = useState(false);

    useEffect(() => {
        if (!itemId) {
            setError("Identifiant de l'objet manquant.");
            setLoading(false);
            return;
        }

        getItemById(itemId)
            .then(data => {
                setItem(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setError("Impossible de charger les détails de l'objet.");
                setLoading(false);
            });
    }, [itemId]);

    const handleCheckout = async () => {
        if (!itemId) return;
        setRedirecting(true);
        try {
            const { url } = await createCheckoutSession(itemId, offerId);
            window.location.href = url; // Redirect to Stripe
        } catch (err: any) {
            setError(err.response?.data?.error || "Erreur lors de l'initialisation du paiement.");
            setRedirecting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col flex-grow items-center justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground animate-pulse">Préparation de votre commande...</p>
            </div>
        );
    }

    if (error || !item) {
        return (
            <div className="flex flex-col flex-grow items-center justify-center p-8">
                <AlertCircle className="w-12 h-12 text-destructive mb-4" />
                <h1 className="text-2xl font-bold font-serif mb-2 text-center text-foreground">Aïe, une erreur est survenue</h1>
                <p className="text-muted-foreground text-center mb-6 max-w-sm">{error}</p>
                <Button asChild>
                    <Link href="/">Retour à l'accueil</Link>
                </Button>
            </div>
        );
    }

    // Since we don't necessarily know the offer price from the Item object, 
    // it will be correctly calculated on the backend. This summary is approximate 
    // to the actual Stripe invoice if an offer is in play, but accurate enough for UX review.
    const priceToDisplay = (offerId && offerPriceStr) ? parseFloat(offerPriceStr) : item.price; 
    const isOffer = !!offerId;
    const fee = priceToDisplay * 0.05;
    const total = priceToDisplay + fee + (item.shippingCost || 0);

    return (
        <div className="flex flex-col flex-grow items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-background border border-border mt-8 p-6 md:p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300">
                <h1 className="text-3xl font-bold font-serif mb-6 text-foreground flex items-center gap-2">
                    <ShieldCheck className="w-8 h-8 text-emerald-500" />
                    Paiement Sécurisé
                </h1>

                <div className="flex flex-col md:flex-row gap-8">
                    {/* Item Details */}
                    <div className="flex-1">
                        <h2 className="text-lg font-semibold text-foreground border-b border-border/40 pb-2 mb-4">Détails de l'objet</h2>
                        <div className="flex gap-4 mb-4">
                            {item.images && item.images.length > 0 ? (
                                <div className="relative w-24 h-24 rounded-xl overflow-hidden shadow-sm flex-shrink-0">
                                    <Image src={item.images[0]} alt={item.title} fill className="object-cover" />
                                </div>
                            ) : (
                                <div className="w-24 h-24 bg-accent/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <span className="text-xs text-muted-foreground">Sans image</span>
                                </div>
                            )}
                            <div>
                                <h3 className="font-semibold text-lg line-clamp-2 leading-tight mb-2 text-foreground">{item.title}</h3>
                                <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                            </div>
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="w-full md:w-[320px] bg-accent/5 rounded-xl border border-border/40 p-5 shrink-0 flex flex-col justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-foreground border-b border-border/40 pb-2 mb-4">Récapitulatif</h2>
                            
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between items-center text-foreground font-medium">
                                    <span className="text-muted-foreground">Sous-total {isOffer && "(Offre estimée)"}</span>
                                    <span>~ {priceToDisplay.toFixed(2)} €</span>
                                </div>
                                <div className="flex justify-between items-center text-foreground font-medium">
                                    <span className="text-muted-foreground flex items-center gap-1">
                                        Protection Acheteur (5%)
                                    </span>
                                    <span>~ {fee.toFixed(2)} €</span>
                                </div>
                                <div className="flex justify-between items-center text-foreground font-medium">
                                    <span className="text-muted-foreground">Frais de port</span>
                                    <span>{(item.shippingCost || 0).toFixed(2)} €</span>
                                </div>
                            </div>
                            
                            <div className="mt-6 pt-4 border-t border-border/40 flex justify-between items-center font-bold text-xl text-foreground">
                                <span>Total estimé</span>
                                <span>~ {total.toFixed(2)} €</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground text-right mt-1">* Le montant exact final sera calculé par Stripe</p>
                        </div>

                        <Button 
                            className="w-full mt-6 bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-6 shadow-md transition-transform active:scale-[0.98]" 
                            onClick={handleCheckout}
                            disabled={redirecting}
                        >
                            {redirecting ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Redirection...
                                </>
                            ) : (
                                "Procéder au paiement"
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function CheckoutPage() {
    return (
        <Suspense fallback={<div className="flex flex-grow items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
            <CheckoutContent />
        </Suspense>
    );
}
