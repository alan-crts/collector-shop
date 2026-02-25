"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getPresignedUrl } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, User, Mail, Shield, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
    const { session, loading, refreshSession } = useAuth();
    const [name, setName] = useState(session?.user.name || "");
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [updating, setUpdating] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const router = useRouter();

    useEffect(() => {
        if (!loading && !session) {
            router.push("/login?redirectTo=/profile");
        } else if (session) {
            setName(session.user.name);
        }
    }, [session, loading, router]);

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

            if (error) {
                setMessage({ type: "error", text: error.message || "Une erreur est survenue." });
            } else {
                setMessage({ type: "success", text: "Profil mis à jour avec succès !" });
                router.refresh();
                // Refresh global session to be sure
                await refreshSession();
            }
        } catch (err) {
            setMessage({ type: "error", text: "Une erreur inattendue est survenue." });
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
        <div className="max-w-4xl mx-auto py-12 px-4 animate-in fade-in duration-500">
            <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Mon Profil</h1>
                    <p className="text-muted-foreground mt-2">Gérez vos informations personnelles et préférences.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Activity / Info Summary */}
                    <Card className="lg:col-span-1 border-border/40 bg-card/50 backdrop-blur-sm shadow-sm flex flex-col items-center p-6 text-center">
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
                                <span>Compte {session?.user.emailVerified ? "vérifié" : "non vérifié"}</span>
                            </div>
                        </div>
                    </Card>

                    {/* Form */}
                    <Card className="lg:col-span-2 border-border/40 overflow-hidden shadow-lg bg-card/50 backdrop-blur-sm">
                        <CardHeader className="border-b bg-accent/10">
                            <CardTitle>Informations Personnelles</CardTitle>
                            <CardDescription>Mettez à jour votre nom d'affichage ici.</CardDescription>
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
                                    <Label htmlFor="name">Nom complet</Label>
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
                                    <Label htmlFor="image">Photo de profil</Label>
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
                                    <Label htmlFor="email">Email</Label>
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
                                        L'adresse email ne peut pas être modifiée pour des raisons de sécurité.
                                    </p>
                                </div>

                                <div className="pt-4 flex justify-end">
                                    <Button type="submit" disabled={updating} className="h-11 px-8 min-w-[200px] font-semibold transition-all hover:shadow-lg hover:shadow-primary/20">
                                        {updating ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Mise à jour...
                                            </>
                                        ) : "Enregistrer les modifications"}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
