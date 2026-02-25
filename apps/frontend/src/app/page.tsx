import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Star, ShieldCheck, Zap, ArrowRight, Sparkles } from "lucide-react";

export default function Page() {
    return (
        <div className="flex flex-col min-h-screen overflow-hidden">
            {/* Hero Section */}

            <section className="relative py-20 lg:py-32 px-4 overflow-hidden">
                {/* Decorative background blobs */}
                <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/20 rounded-full blur-[100px] -z-10 animate-pulse" />
                <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] -z-10 animate-pulse delay-1000" />
                
                <div className="max-w-7xl mx-auto text-center space-y-8 relative">
                    <Badge variant="outline" className="px-4 py-1.5 border-primary/20 bg-primary/5 text-primary animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <Sparkles className="w-3.5 h-3.5 mr-2 inline" />
                        Nouvelle Collection 2026 est arrivée
                    </Badge>
                    
                    <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                        Collectionnez l'Exceptionnel <br />
                        <span className="text-primary italic">Collector Shop</span>
                    </h1>
                    
                    <p className="max-w-2xl mx-auto text-lg lg:text-xl text-muted-foreground animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-200">
                        La destination numéro un pour les collectionneurs passionnés. Découvrez des pièces uniques, authentifiées et rares du monde entier.
                    </p>
                    
                    <div className="flex flex-wrap items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
                        <Button asChild size="lg" className="h-12 px-8 rounded-full text-base font-semibold group shadow-xl shadow-primary/20">
                            <Link href="/products">
                                Explorer les Objets
                                <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                            </Link>
                        </Button>
                        <Button variant="outline" size="lg" className="h-12 px-8 rounded-full text-base font-semibold">
                            <Link href="/register">Vendre un Objet</Link>
                        </Button>
                    </div>

                    {/* Stats or trust markers */}
                    <div className="pt-8 flex justify-center gap-8 text-sm font-medium text-muted-foreground animate-in fade-in duration-1000 delay-500">
                        <div className="flex items-center gap-2">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            <span>4.9/5 par +10k acheteurs</span>
                        </div>
                        <div className="hidden sm:flex items-center gap-2 border-l border-border pl-8">
                            <ShieldCheck className="w-4 h-4 text-primary" />
                            <span>100% Authentique</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20 bg-accent/50 backdrop-blur-sm border-y">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center mb-16 space-y-4">
                        <h2 className="text-3xl font-bold tracking-tight">Pourquoi choisir Collector Shop ?</h2>
                        <p className="text-muted-foreground">Une expérience d'achat et de vente sécurisée et transparente.</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <Card className="bg-background/40 hover:bg-background/60 transition-all border-border/40 hover:shadow-lg">
                            <CardHeader>
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
                                    <ShieldCheck className="w-6 h-6 text-primary" />
                                </div>
                                <CardTitle>Authenticité Garantie</CardTitle>
                                <CardDescription className="text-base pt-2">
                                    Chaque objet est vérifié par nos experts avant d'être mis en vente sur notre plateforme.
                                </CardDescription>
                            </CardHeader>
                        </Card>

                        <Card className="bg-background/40 hover:bg-background/60 transition-all border-border/40 hover:shadow-lg">
                            <CardHeader>
                                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4 border border-blue-500/20">
                                    <Zap className="w-6 h-6 text-blue-500" />
                                </div>
                                <CardTitle>Vente Instantanée</CardTitle>
                                <CardDescription className="text-base pt-2">
                                    Mettez vos objets en vente en quelques clics et atteignez des milliers de collectionneurs.
                                </CardDescription>
                            </CardHeader>
                        </Card>

                        <Card className="bg-background/40 hover:bg-background/60 transition-all border-border/40 hover:shadow-lg">
                            <CardHeader>
                                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-4 border border-purple-500/20">
                                    <ShoppingCart className="w-6 h-6 text-purple-500" />
                                </div>
                                <CardTitle>Paiement Sécurisé</CardTitle>
                                <CardDescription className="text-base pt-2">
                                    Vos fonds sont en sécurité avec notre système de paiement de pointe et protection acheteur.
                                </CardDescription>
                            </CardHeader>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Call to Action */}
            <section className="py-24 px-4">
                <div className="max-w-5xl mx-auto rounded-[3rem] bg-gradient-to-br from-primary to-blue-600 p-12 lg:p-20 text-center space-y-8 relative overflow-hidden shadow-2xl shadow-primary/20">
                    <div className="absolute top-0 right-0 p-8 opacity-20 rotate-12">
                        <Sparkles className="w-48 h-48 text-white" />
                    </div>
                    
                    <h2 className="text-3xl lg:text-5xl font-bold text-white relative z-10">
                        Prêt à commencer votre collection ?
                    </h2>
                    <p className="text-primary-foreground/80 max-w-xl mx-auto text-lg relative z-10">
                        Rejoignez la plus grande communauté de collectionneurs aujourd'hui. L'inscription est gratuite et prend moins d'une minute.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-4 relative z-10">
                        <Button asChild size="lg" variant="secondary" className="h-12 px-10 rounded-full font-bold shadow-xl">
                            <Link href="/register">Créer mon compte</Link>
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    );
}