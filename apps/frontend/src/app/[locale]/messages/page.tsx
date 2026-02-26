"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { 
    fetchConversations, 
    fetchMessageHistory, 
    sendMessage, 
    markMessagesAsRead,
    getItemById,
    sendOffer,
    respondToOffer,
    type Conversation, 
    type Message 
} from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { getSocket } from "@/lib/socketClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Loader2, UserCircle2, MessageSquare, Handshake, Star } from "lucide-react";
import { Link } from "@/i18n/routing";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

function MessagesInboxContent() {
    const t = useTranslations("Messages");
    const searchParams = useSearchParams();
    const forcedReceiverId = searchParams.get("receiverId");
    const forcedItemId = searchParams.get("itemId");

    const { data: session } = authClient.useSession();
    const currentUserId = session?.user.id;

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversation, setActiveConversation] = useState<{ partnerId: string, itemId?: string } | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState("");
    const [loadingConvos, setLoadingConvos] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [isSending, setIsSending] = useState(false);
    
    // Typing indicator state
    const [isTyping, setIsTyping] = useState(false);
    const [partnerTyping, setPartnerTyping] = useState(false);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    
    // Offer Dialog state
    const [isOfferDialogOpen, setIsOfferDialogOpen] = useState(false);
    const [offerAmount, setOfferAmount] = useState("");
    const [isSendingOffer, setIsSendingOffer] = useState(false);

    // Partner Rating State
    const [partnerRating, setPartnerRating] = useState<{ average: number, count: number } | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Fetch Partner Rating when Active Conversation changes
    useEffect(() => {
        async function fetchRating() {
            if (!activeConversation?.partnerId) {
                setPartnerRating(null);
                return;
            }
            try {
                // To fetch their rating, we can use fetchUserReviews
                const { fetchUserReviews } = await import("@/lib/api");
                const res = await fetchUserReviews(activeConversation.partnerId);
                setPartnerRating(res.summary);
            } catch (err) {
                console.error("Failed to fetch partner rating:", err);
            }
        }
        fetchRating();
    }, [activeConversation?.partnerId]);

    // Initial Load - Conversations
    useEffect(() => {
        async function loadData() {
            if (!currentUserId) return;
            try {
                setLoadingConvos(true);
                const data = await fetchConversations();
                setConversations(data || []);
                
                // If a user clicked "Contact Seller" from catalog
                if (forcedReceiverId) {
                    const matchedConvo = (data || []).find(c => c.partnerId === forcedReceiverId && c.item?.id === forcedItemId);
                    
                    setActiveConversation({ 
                        partnerId: forcedReceiverId, 
                        itemId: forcedItemId || undefined 
                    });

                    // If it's a brand new chat for this item, fetch item info to create a UI stub
                    if (!matchedConvo && forcedItemId) {
                        try {
                            const itemInfo = await getItemById(forcedItemId);
                            if (itemInfo && itemInfo.seller) {
                                setConversations(prev => [{
                                    partnerId: forcedReceiverId,
                                    partnerName: itemInfo.seller!.name,
                                    partnerImage: itemInfo.seller!.image,
                                    item: {
                                        id: itemInfo.id,
                                        title: itemInfo.title,
                                        images: itemInfo.images
                                    },
                                    latestMessage: t("newConversation"),
                                    latestMessageAt: new Date().toISOString(),
                                    unreadCount: 0
                                }, ...prev]);
                            }
                        } catch (err) {
                            console.error("Impossible de créer le stub :", err);
                        }
                    }

                } else if ((data || []).length > 0 && !activeConversation) {
                    // Default to first conversation
                    setActiveConversation({
                        partnerId: (data || [])[0].partnerId,
                        itemId: (data || [])[0].item?.id
                    });
                }
            } catch (err) {
                console.error("Failed to load conversations:", err);
            } finally {
                setLoadingConvos(false);
            }
        }
        loadData();
    }, [currentUserId, forcedReceiverId, forcedItemId]);

    // Load Messages for Active Conversation
    useEffect(() => {
        async function loadHistory() {
            if (!activeConversation || !currentUserId) return;
            try {
                setLoadingMessages(true);
                const data = await fetchMessageHistory(activeConversation.partnerId, activeConversation.itemId);
                setMessages(data || []);
                
                // Mark unread messages as read
                const unreadIds = (data || []).filter(m => !m.isRead && m.receiverId === currentUserId).map(m => m.id);
                if (unreadIds.length > 0) {
                    await markMessagesAsRead(unreadIds);
                    // Update state to reflect read
                    setMessages(prev => (prev || []).map(m => unreadIds.includes(m.id) ? { ...m, isRead: true } : m));
                    
                    // Update local unread counter in conversations list
                    setConversations(prev => (prev || []).map(c => {
                        if (c.partnerId === activeConversation.partnerId && c.item?.id === activeConversation.itemId) {
                            return { ...c, unreadCount: 0 };
                        }
                        return c;
                    }));
                }
            } catch (err) {
                console.error("Failed to load history:", err);
            } finally {
                setLoadingMessages(false);
            }
        }
        loadHistory();
    }, [activeConversation, currentUserId]);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, partnerTyping]);

    // WebSocket Integration
    useEffect(() => {
        if (!currentUserId) return;
        
        const socket = getSocket();
        
        const handleReceiveMessage = (newMessage: Message) => {
            // Check if it belongs to current active thread
            const isForActiveThread = activeConversation && 
                (newMessage.senderId === activeConversation.partnerId || newMessage.receiverId === activeConversation.partnerId) &&
                ((newMessage.itemId === null && !activeConversation.itemId) || (newMessage.itemId === activeConversation.itemId));
            
            if (isForActiveThread) {
                setMessages(prev => [...prev, newMessage]);
                // Automatically mark as read if we are looking at it
                if (newMessage.receiverId === currentUserId) {
                    markMessagesAsRead([newMessage.id]).catch(console.error);
                }
            }
            
            // Move thread to top of conversations list
            setConversations(prev => {
                const currentPrev = prev || [];
                const partnerId = newMessage.senderId === currentUserId ? newMessage.receiverId : newMessage.senderId;
                const existingIndex = currentPrev.findIndex(c => c.partnerId === partnerId && c.item?.id === newMessage.itemId);
                
                let updatedConvo: Conversation;
                
                if (existingIndex >= 0) {
                    updatedConvo = {
                        ...currentPrev[existingIndex],
                        latestMessage: newMessage.content,
                        latestMessageAt: newMessage.createdAt,
                        unreadCount: (!isForActiveThread && newMessage.receiverId === currentUserId) ? currentPrev[existingIndex].unreadCount + 1 : currentPrev[existingIndex].unreadCount
                    };
                    const filtered = currentPrev.filter((_, i) => i !== existingIndex);
                    return [updatedConvo, ...filtered];
                } else {
                    // It's a brand new conversation that someone else started
                    // For a robust system we'd fetch the partner details, but for now we create a stub
                    fetchConversations().then(res => setConversations(res || [])); // Safest bet to just refresh
                    return currentPrev;
                }
            });
        };

        const handleTyping = (data: { senderId: string, itemId: string, isTyping: boolean }) => {
            if (activeConversation && data.senderId === activeConversation.partnerId && 
                ((!data.itemId && !activeConversation.itemId) || (data.itemId === activeConversation.itemId))) {
                setPartnerTyping(data.isTyping);
            }
        };

        const handleOfferUpdated = (updatedOffer: Message) => {
            setMessages(prev => prev.map(m => m.id === updatedOffer.id ? updatedOffer : m));
            setConversations(prev => (prev || []).map(c => {
                if (c.partnerId === updatedOffer.senderId || c.partnerId === updatedOffer.receiverId) {
                    if (c.item?.id === updatedOffer.itemId) {
                        return { ...c, latestOfferStatus: updatedOffer.offerStatus };
                    }
                }
                return c;
            })); 
        };

        socket.on("receive_message", handleReceiveMessage);
        socket.on("typing", handleTyping);
        socket.on("offer_updated", handleOfferUpdated);

        return () => {
            socket.off("receive_message", handleReceiveMessage);
            socket.off("typing", handleTyping);
            socket.off("offer_updated", handleOfferUpdated);
        };
    }, [currentUserId, activeConversation]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim() || !activeConversation || !currentUserId) return;

        const content = inputText.trim();
        setInputText("");
        setIsSending(true);
        
        // Broadcast stopped typing immediately
        emitTypingState(false);

        try {
            const data = await sendMessage(activeConversation.partnerId, content, activeConversation.itemId);
            
            // Optimistically update UI
            setMessages(prev => [...(prev || []), data]);
            
            // Update conversation list latest message
            setConversations(prev => (prev || []).map(c => {
                if (c.partnerId === activeConversation.partnerId && c.item?.id === activeConversation.itemId) {
                    return { ...c, latestMessage: content, latestMessageAt: data.createdAt };
                }
                return c;
            }));
        } catch (error: any) {
            alert(error.response?.data?.error || t("errorSending"));
        } finally {
            setIsSending(false);
        }
    };

    const handleSendOffer = async () => {
        if (!activeConversation?.itemId || !activeConversation.partnerId || !offerAmount) return;
        const amount = parseFloat(offerAmount);
        if (isNaN(amount) || amount <= 0) {
            alert(t("offer.invalidAmount"));
            return;
        }

        setIsSendingOffer(true);
        try {
            const data = await sendOffer(activeConversation.partnerId, activeConversation.itemId, amount);
            setMessages(prev => [...(prev || []), data]);
            setIsOfferDialogOpen(false);
            setOfferAmount("");
        } catch (error: any) {
            alert(error.response?.data?.error || t("offer.error"));
        } finally {
            setIsSendingOffer(false);
        }
    };

    const handleRespondOffer = async (messageId: string, action: "ACCEPTED" | "REJECTED") => {
        try {
            await respondToOffer(messageId, action);
            // The UI will update optimistically via WebSocket "offer_updated" and "receive_message"
        } catch (error: any) {
            alert(error.response?.data?.error || "Erreur.");
        }
    };

    const emitTypingState = (typing: boolean) => {
        if (!activeConversation) return;
        const socket = getSocket();
        socket.emit("typing", {
            receiverId: activeConversation.partnerId,
            itemId: activeConversation.itemId || "",
            isTyping: typing
        });
        setIsTyping(typing);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputText(e.target.value);
        
        if (!isTyping) {
            emitTypingState(true);
        }
        
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
        
        // Stop typing indicator after 2 seconds of inactivity
        typingTimeoutRef.current = setTimeout(() => {
            emitTypingState(false);
        }, 2000);
    };

    // Format utility
    const formatTime = (isoString: string) => {
        try {
            return format(new Date(isoString), "HH:mm", { locale: fr });
        } catch (e) {
            return "";
        }
    };
    
    const formatDate = (isoString: string) => {
        try {
            return format(new Date(isoString), "dd MMM yyyy", { locale: fr });
        } catch (e) {
            return "";
        }
    };

    const activeConvoDetails = (conversations || []).find(c => 
        c.partnerId === activeConversation?.partnerId && c.item?.id === activeConversation.itemId
    );

    const isBuyer = currentUserId && activeConvoDetails?.item?.sellerId ? currentUserId !== activeConvoDetails.item.sellerId : true; // default true if unknown
    const isSold = activeConvoDetails?.item?.status === "SOLD";

    const commonT = useTranslations("Common");

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl h-[calc(100vh-64px)] overflow-hidden font-sans">
            <div className="bg-background border border-border/40 shadow-sm rounded-xl h-full flex flex-col md:flex-row overflow-hidden">
                
                {/* Conversations Sidebar */}
                <div className={`w-full md:w-1/3 lg:w-1/4 flex flex-col border-r border-border/40 overflow-hidden h-full ${activeConversation ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-4 border-b border-border/40 bg-accent/10">
                        <h2 className="text-xl font-bold font-serif">{t("title")}</h2>
                    </div>
                    
                    <ScrollArea className="flex-grow overflow-y-auto">
                        {loadingConvos ? (
                            <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                        ) : (conversations || []).length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                                <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
                                <p>{t("noConversations")}</p>
                            </div>
                        ) : (
                            <div className="flex flex-col">
                                {(conversations || []).map((convo, idx) => {
                                    const isActive = activeConversation?.partnerId === convo.partnerId && activeConversation?.itemId === convo.item?.id;
                                    return (
                                        <button
                                            key={`${convo.partnerId}-${convo.item?.id || idx}`}
                                            onClick={() => setActiveConversation({ partnerId: convo.partnerId, itemId: convo.item?.id })}
                                            className={`w-full text-left p-4 border-b border-border/20 flex gap-3 transition-colors hover:bg-accent/30 ${isActive ? 'bg-accent/40 block' : ''}`}
                                        >
                                            <Avatar className="h-10 w-10 flex-shrink-0">
                                                <AvatarImage src={convo.partnerImage || undefined} />
                                                <AvatarFallback><UserCircle2 className="w-6 h-6" /></AvatarFallback>
                                            </Avatar>
                                            <div className="flex-grow min-w-0">
                                                <div className="flex justify-between items-baseline mb-0.5">
                                                    <span className="font-semibold text-sm truncate pr-2">{convo.partnerName}</span>
                                                    <span className="text-xs text-muted-foreground flex-shrink-0">{formatDate(convo.latestMessageAt)}</span>
                                                </div>
                                                {convo.item && (
                                                    <p className="text-xs font-medium text-primary line-clamp-1 mb-1">
                                                        📦 {convo.item.title}
                                                    </p>
                                                )}
                                                <p className={`text-sm truncate ${convo.unreadCount > 0 ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                                                    {convo.latestMessage}
                                                </p>
                                            </div>
                                            {convo.unreadCount > 0 && (
                                                <div className="flex-shrink-0 flex items-center justify-center w-5 h-5 bg-primary rounded-full text-[10px] font-bold text-primary-foreground">
                                                    {convo.unreadCount}
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </ScrollArea>
                </div>

                {/* Main Chat Area */}
                <div className={`w-full md:w-2/3 lg:w-3/4 flex flex-col bg-accent/5 ${!activeConversation ? 'hidden md:flex' : 'flex'}`}>
                    {activeConversation ? (
                        <>
                            {/* Chat Header */}
                            <div className="p-4 border-b border-border/40 bg-background flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <button 
                                        className="md:hidden text-primary text-sm font-medium mr-2"
                                        onClick={() => setActiveConversation(null)}
                                    >
                                        &larr; {t("back")}
                                    </button>
                                    <Link href={`/users/${activeConvoDetails?.partnerId}`} className="group flex items-center gap-3 hover:opacity-80 transition-opacity">
                                        <Avatar className="h-10 w-10 border border-border/40 group-hover:border-primary/50 transition-colors">
                                            <AvatarImage src={activeConvoDetails?.partnerImage || undefined} />
                                            <AvatarFallback><UserCircle2 className="w-6 h-6" /></AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold group-hover:text-primary transition-colors">{activeConvoDetails?.partnerName || t("loading")}</h3>
                                                {partnerRating && partnerRating.count > 0 && (
                                                    <span className="flex items-center text-xs text-muted-foreground bg-accent/50 px-2 py-0.5 rounded-full">
                                                        <Star className="w-3 h-3 text-amber-500 fill-amber-500 mr-1" />
                                                        {partnerRating.average.toFixed(1)} ({partnerRating.count})
                                                    </span>
                                                )}
                                            </div>
                                            {activeConvoDetails?.item && (
                                                <span className="text-xs text-muted-foreground mt-0.5">
                                                    {t("about")} {activeConvoDetails.item.title}
                                                </span>
                                            )}
                                        </div>
                                    </Link>
                                    {/* Action Buttons */}
                                    <div className="ml-auto flex items-center gap-2">
                                        {isSold && (
                                            <span className="text-sm font-bold text-destructive bg-destructive/10 px-3 py-1.5 rounded-lg flex-shrink-0">{commonT("status.sold")}</span>
                                        )}
                                        {activeConvoDetails?.item && !isSold && (
                                            <Button variant="secondary" size="sm" onClick={() => setIsOfferDialogOpen(true)}>
                                                <Handshake className="w-4 h-4 mr-2" />
                                                {t("offer.button")}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Chat Messages */}
                            <ScrollArea className="flex-grow p-4 overflow-y-auto">
                                {loadingMessages ? (
                                    <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                                ) : (messages || []).length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
                                        <p>{t("startPrompt")}</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-4 pb-4">
                                        {(messages || []).map((msg, idx) => {
                                            const isMe = msg.senderId === currentUserId;
                                            
                                            if (msg.type === "OFFER") {
                                                return (
                                                    <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                        <div className={`max-w-[75%] md:max-w-md rounded-2xl px-5 py-4 ${isMe ? 'bg-primary/10 border border-primary/20 text-foreground rounded-br-none' : 'bg-background border border-border/60 rounded-bl-none shadow-md'}`}>
                                                            <div className="flex items-center gap-2 font-bold mb-2">
                                                                <Handshake className="w-5 h-5 text-primary" />
                                                                {t("offer.price", { price: msg.offerPrice || 0 })}
                                                            </div>
                                                            <p className="text-sm text-muted-foreground mb-4">
                                                                {isMe ? t("offer.proposed") : t("offer.partnerProposed", { name: msg.sender?.name || commonT("anonymous") })}
                                                            </p>
                                                            
                                                            {/* Offer Status Badge */}
                                                            {msg.offerStatus === "ACCEPTED" && <div className="text-sm font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1.5 rounded-lg text-center mb-2">{t("offer.accepted")}</div>}
                                                            {msg.offerStatus === "REJECTED" && <div className="text-sm font-bold text-destructive bg-destructive/10 px-3 py-1.5 rounded-lg text-center mb-2">{t("offer.rejected")}</div>}
                                                            {msg.offerStatus === "PENDING" && <div className="text-sm font-semibold text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-3 py-1.5 rounded-lg text-center mb-2">{t("offer.pending")}</div>}

                                                            {/* Answer Actions */}
                                                            {!isMe && msg.offerStatus === "PENDING" && !isSold && (
                                                                <div className="flex gap-2 mt-3">
                                                                    <Button size="sm" variant="default" className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleRespondOffer(msg.id, "ACCEPTED")}>
                                                                        {t("offer.accept")}
                                                                    </Button>
                                                                    <Button size="sm" variant="destructive" className="flex-1" onClick={() => handleRespondOffer(msg.id, "REJECTED")}>
                                                                        {t("offer.reject")}
                                                                    </Button>
                                                                </div>
                                                            )}
                                                            {msg.offerStatus === "ACCEPTED" && isBuyer && !isSold && (
                                                                <Button size="sm" variant="default" className="w-full mt-2" asChild>
                                                                    <Link href={`/checkout?itemId=${msg.itemId}&offerId=${msg.id}&offerPrice=${msg.offerPrice}`}>
                                                                        {t("offer.payNow", { price: msg.offerPrice || 0 })}
                                                                    </Link>
                                                                </Button>
                                                            )}
                                                            <span className={`text-[10px] block mt-2 text-right text-muted-foreground`}>
                                                                {formatTime(msg.createdAt)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${isMe ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-background border border-border/40 rounded-bl-none shadow-sm'}`}>
                                                        <p className="whitespace-pre-wrap break-words text-sm">{msg.content}</p>
                                                        <span className={`text-[10px] block mt-1 text-right ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                                            {formatTime(msg.createdAt)}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {partnerTyping && (
                                            <div className="flex justify-start">
                                                <div className="bg-background border border-border/40 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex gap-1">
                                                    <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce"></span>
                                                    <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce delay-75"></span>
                                                    <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce delay-150"></span>
                                                </div>
                                            </div>
                                        )}
                                        <div ref={messagesEndRef} />
                                    </div>
                                )}
                            </ScrollArea>

                            {/* Chat Input */}
                            <div className="p-4 border-t border-border/40 bg-background">
                                <form onSubmit={handleSend} className="flex gap-2">
                                    <Input
                                        value={inputText}
                                        onChange={handleInputChange}
                                        placeholder={t("placeholder")}
                                        className="flex-grow rounded-full bg-accent/20 border-border/40 focus-visible:ring-primary"
                                        disabled={isSending || loadingMessages}
                                    />
                                    <Button 
                                        type="submit" 
                                        disabled={!inputText.trim() || isSending || loadingMessages}
                                        className="rounded-full w-10 h-10 p-0 flex-shrink-0"
                                    >
                                        {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    </Button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex-grow flex flex-col items-center justify-center text-muted-foreground">
                            <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
                            <p className="text-lg">{t("selectConversation")}</p>
                        </div>
                    )}
                </div>

                {/* Offer Dialog */}
                <Dialog open={isOfferDialogOpen} onOpenChange={setIsOfferDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t("offer.dialogTitle")}</DialogTitle>
                            <DialogDescription>
                                {t("offer.dialogDesc", { 
                                    partner: isBuyer ? commonT("seller").toLowerCase() : "l'acheteur", 
                                    title: activeConvoDetails?.item?.title || ""
                                })}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <div className="flex items-center gap-4">
                                <Input 
                                    type="number" 
                                    placeholder={t("offer.amountPlaceholder")} 
                                    value={offerAmount} 
                                    onChange={(e) => setOfferAmount(e.target.value)} 
                                    className="text-lg w-full"
                                    min="1"
                                    step="0.50"
                                />
                                <span className="text-xl font-bold">€</span>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsOfferDialogOpen(false)} disabled={isSendingOffer}>
                                {t("offer.cancel")}
                            </Button>
                            <Button onClick={handleSendOffer} disabled={!offerAmount || isSendingOffer}>
                                {isSendingOffer ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Handshake className="w-4 h-4 mr-2" />}
                                {t("offer.sendOffer")}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

            </div>
        </div>
    );
}

export default function MessagesInboxPage() {
    return (
        <Suspense fallback={<div className="flex h-[calc(100vh-64px)] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
            <MessagesInboxContent />
        </Suspense>
    );
}
