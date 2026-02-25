"use client";

import { useAuth } from "@/providers/AuthProvider";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, LogOut, Package, Home, ShieldCheck } from "lucide-react";
import DefaultUserImage from "./DefaultUserImage";

export default function Navbar() {
    const { session, logout } = useAuth();
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogout = async () => {
        setLoading(true);
        await logout();
        setLoading(false);
        router.push("/");
    };

    return (
        <nav className="bg-background/80 backdrop-blur-md border-b sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center">
                        <Link href="/" className="text-2xl font-bold hover:text-primary transition-colors">
                            Collector Shop
                        </Link>
                    </div>
                    <div className="flex items-center space-x-6">
                        <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                            <Home className="w-4 h-4" />
                            Accueil
                        </Link>
                        <Link href="/catalog" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                            <Package className="w-4 h-4" />
                            Catalogue
                        </Link>
                        {session?.user ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="relative flex items-center gap-2 px-2 hover:bg-accent rounded-full transition-all h-auto py-1">
                                        <div className="flex flex-col items-end mr-1">
                                            <span className="text-xs font-semibold">{session.user.name}</span>
                                            <Badge variant="secondary" className="text-[10px] h-4 px-1 leading-none uppercase tracking-tighter">
                                                {session.user.role}
                                            </Badge>
                                        </div>
                                        <DefaultUserImage name={session.user.name} image={session.user.image} />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 mt-2">
                                    <DropdownMenuLabel className="font-normal">
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-sm font-medium leading-none">{session.user.name}</p>
                                            <p className="text-xs leading-none text-muted-foreground">
                                                {session.user.email}
                                            </p>
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild className="cursor-pointer">
                                        <Link href="/profile" className="flex items-center w-full">
                                            <User className="mr-2 h-4 w-4" />
                                            <span>Mon Profil</span>
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />

                                    {session.user.role === "ADMIN" && (
                                        <>
                                            <DropdownMenuItem asChild className="cursor-pointer">
                                                <Link href="/admin" className="flex items-center w-full">
                                                    <ShieldCheck className="mr-2 h-4 w-4 text-emerald-500" />
                                                    <span className="text-emerald-600 font-medium">Administration</span>
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                        </>
                                    )}

                                    <DropdownMenuItem 
                                        className="text-destructive focus:text-destructive cursor-pointer"
                                        onSelect={handleLogout}
                                        disabled={loading}
                                    >
                                        <LogOut className="mr-2 h-4 w-4" />
                                        <span>{loading ? "Déconnexion..." : "Déconnexion"}</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <Button asChild variant="default" size="sm" className="rounded-full px-6">
                                <Link href="/login">Connexion</Link>
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}