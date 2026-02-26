"use client";

import { Suspense, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Link, useRouter } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Mail, Lock, Loader2, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

function SignInContent() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const t = useTranslations("Auth.login");
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectTo = searchParams.get("redirectTo") || "/";

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            await authClient.signIn.email({
                email,
                password,
                callbackURL: redirectTo,
            }, {
                onSuccess: () => {
                    router.push(redirectTo);
                    router.refresh();
                },
                onError: (ctx) => {
                    setError(ctx.error.message || t("errorDefault"));
                }
            });
        } catch (err) {
            setError(t("errorUnexpected"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="w-full max-w-md relative z-10 border-border/40 bg-background/60 backdrop-blur-xl shadow-2xl">
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-3xl font-bold tracking-tight">{t("title")}</CardTitle>
                    <CardDescription className="text-muted-foreground text-base">
                        {t("description")}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {error && (
                        <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-lg text-sm mb-6 flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-destructive" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSignIn} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">{t("email")}</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder={t("emailPlaceholder")}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="pl-10"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label htmlFor="password">{t("password")}</Label>
                                <Link href="#" className="text-xs text-primary hover:underline">
                                    {t("forgot")}
                                </Link>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pl-10"
                                    required
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-4 h-11 text-base font-semibold transition-all hover:scale-[1.01] active:scale-[0.99] group"
                        >
                            {loading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    {t("submit")}
                                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                                </>
                            )}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter>
                    <div className="w-full text-center text-sm text-muted-foreground">
                        Vous n'avez pas de compte ?{" "}
                        <Link href="/register" className="text-primary font-semibold hover:underline">
                            Inscription
                        </Link>
                    </div>
                </CardFooter>
            </Card>
    );
}

export default function SignInPage() {
    return (
        <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-background p-4 relative overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute top-0 -left-4 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 -right-4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
            
            <Suspense fallback={<div className="w-full max-w-md h-96 relative z-10 border-border/40 bg-card/60 rounded-xl" />}>
                <SignInContent />
            </Suspense>
        </div>
    );
}

