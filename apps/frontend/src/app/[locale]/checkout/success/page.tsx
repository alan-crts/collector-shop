"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { Link } from "@/i18n/routing";
import confetti from "canvas-confetti";

function SuccessContent() {
    const searchParams = useSearchParams();
    const sessionId = searchParams.get("session_id");

    useEffect(() => {
        if (sessionId) {
            // Trigger confetti
            const duration = 3 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

            const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

            const interval: any = setInterval(function() {
                const timeLeft = animationEnd - Date.now();

                if (timeLeft <= 0) {
                    return clearInterval(interval);
                }

                const particleCount = 50 * (timeLeft / duration);
                confetti({
                    ...defaults,
                    particleCount,
                    origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
                });
                confetti({
                    ...defaults,
                    particleCount,
                    origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
                });
            }, 250);
        }
    }, [sessionId]);

    return (
        <div className="flex flex-col flex-grow items-center justify-center p-4">
            <div className="w-full max-w-lg bg-background border border-border mt-8 p-8 rounded-2xl shadow-xl text-center">
                <CheckCircle2 className="w-20 h-20 text-emerald-500 mx-auto mb-6" />
                <h1 className="text-3xl font-bold font-serif mb-4 text-foreground">Paiement Réussi !</h1>
                <p className="text-muted-foreground mb-8">
                    Votre commande a bien été confirmée. Le vendeur a été notifié de votre achat. 
                    Vous pouvez suivre l'état de votre commande depuis votre profil.
                </p>
                
                <div className="flex flex-col gap-3">
                    <Button asChild className="w-full text-lg py-6 bg-emerald-600 hover:bg-emerald-700 text-white">
                        <Link href="/profile">
                            Voir mes achats
                            <ArrowRight className="w-5 h-5 ml-2" />
                        </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full py-6">
                        <Link href="/">
                            Retour à l'accueil
                        </Link>
                    </Button>
                </div>
                {sessionId && (
                    <p className="text-xs text-muted-foreground mt-6 break-all">
                        Session: {sessionId}
                    </p>
                )}
            </div>
        </div>
    );
}

export default function CheckoutSuccessPage() {
    return (
        <Suspense fallback={<div className="flex flex-grow items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
            <SuccessContent />
        </Suspense>
    );
}
