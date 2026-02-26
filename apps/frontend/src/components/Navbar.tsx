"use client";

import { useAuth } from "@/providers/AuthProvider";
import { Link, useRouter, usePathname } from "@/i18n/routing";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useTranslations, useLocale } from "next-intl";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, LogOut, Package, Home, ShieldCheck, MessageSquare, Bell, Globe } from "lucide-react";
import DefaultUserImage from "./DefaultUserImage";
import { fetchUnreadCounts, markNotificationsAsRead, fetchNotifications, type Notification } from "@/lib/api";
import { getSocket } from "@/lib/socketClient";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function Navbar() {
    const { session, logout } = useAuth();
    const [loading, setLoading] = useState(false);
    
    // Notification states
    const [unreadTotal, setUnreadTotal] = useState(0);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loadingNotifications, setLoadingNotifications] = useState(false);
    
    const router = useRouter();
    const pathname = usePathname();
    const t = useTranslations("Navigation");
    const locale = useLocale();

    const switchLocale = (newLocale: string) => {
        router.replace(pathname, { locale: newLocale });
    };

    const handleLogout = async () => {
        setLoading(true);
        await logout();
        setLoading(false);
        router.push("/");
    };

    // Load initial unread counts and setup webSockets
    useEffect(() => {
        if (!session?.user) return;

        // Fetch initial unread counts
        fetchUnreadCounts().then(res => {
            if (res) {
                setUnreadTotal(res.total);
                setUnreadMessages(res.messages);
            }
        }).catch(console.error);

        // Pre-fetch notifications
        fetchNotifications().then(setNotifications).catch(console.error);

        // WebSockets
        const socket = getSocket();
        
        const handleNewMessage = () => {
             setUnreadTotal(prev => prev + 1);
             setUnreadMessages(prev => prev + 1);
        };
        
        const handleNewNotification = (notif: Notification) => {
             setUnreadTotal(prev => prev + 1);
             setNotifications(prev => [notif, ...prev]);
        };

        socket.on("receive_message", handleNewMessage);
        socket.on("receive_notification", handleNewNotification);

        return () => {
            socket.off("receive_message", handleNewMessage);
            socket.off("receive_notification", handleNewNotification);
        };
    }, [session?.user]);

    const handleOpenNotifications = async (open: boolean) => {
        if (open) {
            setLoadingNotifications(true);
            try {
                const data = await fetchNotifications();
                setNotifications(data || []);
                
                const unreadIds = (data || []).filter(n => !n.isRead).map(n => n.id);
                if (unreadIds.length > 0) {
                    await markNotificationsAsRead(unreadIds);
                    setUnreadTotal(prev => Math.max(0, prev - unreadIds.length));
                    setNotifications(prev => prev.map(n => unreadIds.includes(n.id) ? { ...n, isRead: true } : n));
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoadingNotifications(false);
            }
        }
    };
    
    const formatTime = (iso: string) => {
        try {
            return format(new Date(iso), "dd MMM à HH:mm", { locale: locale === 'fr' ? fr : undefined });
        } catch {
            return "";
        }
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
                            {t("home")}
                        </Link>
                        <Link href="/catalog" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                            <Package className="w-4 h-4" />
                            {t("catalog")}
                        </Link>
                        
                        {/* Language Switcher */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="rounded-full">
                                    <Globe className="w-4 h-4 text-muted-foreground" />
                                    <span className="sr-only">{t("language")}</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => switchLocale('fr')} className={locale === 'fr' ? 'font-bold' : ''}>
                                    Français (FR)
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => switchLocale('en')} className={locale === 'en' ? 'font-bold' : ''}>
                                    English (EN)
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {session?.user ? (
                            <div className="flex items-center space-x-2">
                                {/* Notifications Bell */}
                                <DropdownMenu onOpenChange={handleOpenNotifications}>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="relative rounded-full">
                                            <Bell className="w-5 h-5 text-muted-foreground" />
                                            {unreadTotal > unreadMessages && (
                                                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
                                            )}
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-80">
                                        <DropdownMenuLabel>{t("notifications")}</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <ScrollArea className="h-72">
                                            {loadingNotifications ? (
                                                <div className="p-4 text-center text-sm text-muted-foreground">{t("loading")}</div>
                                            ) : notifications.length === 0 ? (
                                                <div className="p-4 text-center text-sm text-muted-foreground">{t("noNotifications")}</div>
                                            ) : (
                                                <div className="flex flex-col">
                                                    {notifications.map(n => (
                                                        <div key={n.id} className={`p-3 border-b border-border/40 text-sm ${!n.isRead ? 'bg-accent/20 font-medium' : 'text-muted-foreground'}`}>
                                                            <div className="flex justify-between items-start mb-1">
                                                                <span className="font-semibold text-foreground">{n.title}</span>
                                                                <span className="text-[10px]">{formatTime(n.createdAt)}</span>
                                                            </div>
                                                            <p className="line-clamp-2 text-xs">{n.content}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </ScrollArea>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                {/* User Dropdown */}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="relative flex items-center gap-2 px-2 hover:bg-accent rounded-full transition-all h-auto py-1">
                                            <div className="flex flex-col items-end mr-1">
                                                <span className="text-xs font-semibold">{session.user.name}</span>
                                                <Badge variant="secondary" className="text-[10px] h-4 px-1 leading-none uppercase tracking-tighter">
                                                    {session.user.role}
                                                </Badge>
                                            </div>
                                            <div className="relative">
                                                <DefaultUserImage name={session.user.name} image={session.user.image} />
                                                {unreadMessages > 0 && (
                                                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground border-2 border-background">
                                                        {unreadMessages > 9 ? '9+' : unreadMessages}
                                                    </span>
                                                )}
                                            </div>
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
                                            <span>{t("profile")}</span>
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild className="cursor-pointer font-medium text-primary">
                                        <Link href="/messages" className="flex items-center w-full justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <MessageSquare className="mr-2 h-4 w-4" />
                                                <span>{t("messages")}</span>
                                            </div>
                                            {unreadMessages > 0 && (
                                                <Badge variant="default" className="ml-auto h-5 px-1.5">{unreadMessages}</Badge>
                                            )}
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />

                                    {session.user.role === "ADMIN" && (
                                        <>
                                            <DropdownMenuItem asChild className="cursor-pointer">
                                                <Link href="/admin" className="flex items-center w-full">
                                                    <ShieldCheck className="mr-2 h-4 w-4 text-emerald-500" />
                                                    <span className="text-emerald-600 font-medium">{t("admin")}</span>
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
                                        <span>{loading ? "..." : t("logout")}</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        ) : (
                            <Button asChild variant="default" size="sm" className="rounded-full px-6">
                                <Link href="/login">{t("login")}</Link>
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}