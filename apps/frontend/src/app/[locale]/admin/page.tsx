"use client";

import React, { useEffect, useState } from "react";
import { fetchItems, updateItemAsAdmin, deleteItem, type Item, fetchAllUsers, toggleUserBan, type User, fetchCategories, createCategory, deleteCategory, type Category } from "@/lib/api";
import { ApiError } from "@/lib/apiClient";
import { useAuth } from "@/providers/AuthProvider";
import { Loader2, AlertCircle, CheckCircle, XCircle, Trash2, ShieldCheck, Ban, PlusCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "@/i18n/routing";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export default function AdminPage() {
  const t = useTranslations("Admin");
  const commonT = useTranslations("Common");
  const router = useRouter();
  const { session, loading: sessionPending } = useAuth();
  const isAdmin = session?.user?.role === "ADMIN";

  const [items, setItems] = useState<Item[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("PENDING");
  const [newCatName, setNewCatName] = useState("");
  const [newCatSlug, setNewCatSlug] = useState("");

  const loadData = async (tab: string) => {
    try {
      setLoading(true);
      setError(null);
      if (tab === "USERS") {
        const data = await fetchAllUsers();
        setUsers(data);
      } else if (tab === "CATEGORIES") {
        const data = await fetchCategories();
        setCategories(data);
      } else {
        const data = await fetchItems(tab === "ALL" ? undefined : tab);
        setItems(tab === "ALL" ? data : data.filter((i) => i.status === tab));
      }
    } catch (err) {
      console.error(err);
      if (err instanceof ApiError) {
        setError(`Erreur ${err.status}: ${err.message}`);
      } else {
        setError(t("errorFetch") || "Impossible de charger les données.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionPending) return;

    if (!isAdmin) {
      router.replace("/");
      return;
    }

    loadData(activeTab);
  }, [activeTab, isAdmin, sessionPending, router]);

  const handleStatusChange = async (id: string, newStatus: "APPROVED" | "REJECTED") => {
    try {
      await updateItemAsAdmin(id, { status: newStatus });
      setItems(items.filter(item => item.id !== id));
      toast.success(newStatus === 'APPROVED' ? t("toast.approved") : t("toast.rejected"));
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(`Erreur ${err.status}: ${err.message}`);
      } else {
        toast.error(t("toast.errorUpdate"));
      }
    }
  };


  const handleDelete = async (id: string) => {
    if (window.confirm(commonT("confirmDelete"))) {
      try {
        await deleteItem(id);
        setItems(items.filter(item => item.id !== id));
        toast.success(t("toast.deleted"));
      } catch (err) {
        if (err instanceof ApiError) {
          toast.error(`Erreur ${err.status}: ${err.message}`);
        } else {
          toast.error(t("toast.errorDelete"));
        }
      }
    }
  };

  const handleToggleUserBan = async (id: string, currentlyBanned: boolean) => {
    try {
      await toggleUserBan(id, !currentlyBanned);
      setUsers(users.map(u => u.id === id ? { ...u, isBanned: !currentlyBanned } : u));
      toast.success(currentlyBanned ? t("toast.unbanned") : t("toast.banned"));
    } catch {
      toast.error(t("toast.errorBan"));
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName || !newCatSlug) return;
    try {
      const cat = await createCategory({ name: newCatName, slug: newCatSlug });
      setCategories([...categories, cat]);
      setNewCatName("");
      setNewCatSlug("");
      toast.success(t("toast.catAdded"));
    } catch {
      toast.error(t("toast.errorCatAdd"));
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (window.confirm(commonT("confirmDeleteCategory"))) {
      try {
        await deleteCategory(id);
        setCategories(categories.filter(c => c.id !== id));
        toast.success(t("toast.catDeleted"));
      } catch {
        toast.error(t("toast.errorCatDelete"));
      }
    }
  };

  if (sessionPending) {
    return <div className="min-h-screen flex justify-center items-center"><Loader2 className="animate-spin w-10 h-10 text-primary" /></div>;
  }

  if (!isAdmin) {
    return null; // Layout/Router will redirect
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-background relative overflow-hidden font-sans pb-20">
      <div className="max-w-7xl mx-auto px-4 py-12 relative z-10">
        <header className="mb-12 border-b border-border/40 pb-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-2">
            {t("title")}
          </h1>
          <p className="text-lg text-muted-foreground">
            {t("subtitle")}
          </p>
        </header>

        <Tabs defaultValue="PENDING" onValueChange={setActiveTab}>
          <TabsList className="mb-8 bg-accent/20 border border-border/40">
            <TabsTrigger value="PENDING">{t("tabs.pending")}</TabsTrigger>
            <TabsTrigger value="APPROVED">{t("tabs.approved")}</TabsTrigger>
            <TabsTrigger value="REJECTED">{t("tabs.rejected")}</TabsTrigger>
            <TabsTrigger value="USERS">{t("tabs.users")}</TabsTrigger>
            <TabsTrigger value="CATEGORIES">{t("tabs.categories")}</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {loading ? (
              <div className="flex justify-center p-12">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : error ? (
              <div className="text-destructive flex items-center gap-2 p-4 bg-destructive/10 rounded-md">
                <AlertCircle className="w-5 h-5" />
                {error}
              </div>
            ) : items.length === 0 ? (
              <div className="text-center p-12 bg-accent/10 border border-border/40 rounded-xl">
                <p className="text-muted-foreground">{t("empty")}</p>
              </div>
            ) : (
              <div className="bg-card rounded-xl border border-border/40 shadow-sm overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-[100px]">{t("table.id")}</TableHead>
                      <TableHead>{t("table.title")}</TableHead>
                      <TableHead>{t("table.seller")}</TableHead>
                      <TableHead>{t("table.price")}</TableHead>
                      <TableHead className="text-right">{t("table.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">{item.id.slice(0,8)}...</TableCell>
                        <TableCell className="font-semibold">{item.title}</TableCell>
                        <TableCell>{item.seller?.name || commonT("anonymous")}</TableCell>
                        <TableCell>{item.price} €</TableCell>
                        <TableCell className="text-right space-x-2">
                          {activeTab === "PENDING" && (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20"
                                onClick={() => handleStatusChange(item.id, "APPROVED")}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" /> {t("actions.approve")}
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20"
                                onClick={() => handleStatusChange(item.id, "REJECTED")}
                              >
                                <XCircle className="w-4 h-4 mr-1" /> {t("actions.reject")}
                              </Button>
                            </>
                          )}
                          {activeTab === "REJECTED" && (
                            <Button 
                                size="sm" 
                                variant="outline" 
                                className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20"
                                onClick={() => handleStatusChange(item.id, "APPROVED")}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" /> {t("actions.rescue")}
                              </Button>
                          )}
                          <Button size="icon" variant="destructive" onClick={() => handleDelete(item.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
          <TabsContent value="USERS">
            <div className="bg-card rounded-xl border border-border/40 shadow-sm overflow-hidden p-6">
              <h2 className="text-xl font-bold mb-4">{t("users.title")}</h2>
              {loading ? (
                <div className="flex justify-center p-12">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              ) : error ? (
                <div className="text-destructive flex items-center gap-2 p-4 bg-destructive/10 rounded-md">
                  <AlertCircle className="w-5 h-5" />
                  {error}
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>{t("table.email")}</TableHead>
                      <TableHead>{t("table.name")}</TableHead>
                      <TableHead>{t("table.role")}</TableHead>
                      <TableHead>{t("table.since")}</TableHead>
                      <TableHead className="text-right">{t("table.action")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id} className={u.isBanned ? "bg-destructive/5" : ""}>
                        <TableCell className="font-semibold">{u.email}</TableCell>
                        <TableCell>{u.name}</TableCell>
                        <TableCell><Badge variant={u.role === "ADMIN" ? "default" : "outline"}>{u.role}</Badge></TableCell>
                        <TableCell className="text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant={u.isBanned ? "outline" : "destructive"}                             size="sm" 
                             disabled={u.id === session?.user?.id || u.role === "ADMIN"}
                             onClick={() => handleToggleUserBan(u.id, u.isBanned)}
                           >
                             {u.isBanned ? <><ShieldCheck className="w-4 h-4 mr-2" /> {t("actions.unban")}</> : <><Ban className="w-4 h-4 mr-2"/> {t("actions.ban")}</>}
                           </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>

          <TabsContent value="CATEGORIES">
            <div className="bg-card rounded-xl border border-border/40 shadow-sm overflow-hidden p-6 grid md:grid-cols-2 gap-8">
              <div>
                <h2 className="text-xl font-bold mb-4">{t("categories.existing")}</h2>
                {loading ? (
                  <div className="flex justify-center p-12">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  </div>
                ) : (
                  <Table>
                       <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead>{t("table.name")}</TableHead>
                          <TableHead>{t("table.slug")}</TableHead>
                          <TableHead className="text-right">{t("table.action")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categories.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell className="font-semibold">{c.name}</TableCell>
                            <TableCell className="text-muted-foreground">{c.slug}</TableCell>
                            <TableCell className="text-right">
                              <Button size="icon" variant="destructive" onClick={() => handleDeleteCategory(c.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                  </Table>
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold mb-4">{t("categories.add")}</h2>
                <form onSubmit={handleAddCategory} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">{t("categories.nameLabel")}</Label>
                        <Input id="name" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder={t("categories.namePlaceholder")} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="slug">{t("categories.slugLabel")}</Label>
                        <Input id="slug" value={newCatSlug} onChange={(e) => setNewCatSlug(e.target.value)} placeholder={t("categories.slugPlaceholder")} required />
                    </div>
                    <Button type="submit" className="w-full"><PlusCircle className="mr-2 h-4 w-4" /> {t("actions.add")}</Button>
                </form>
              </div>
            </div>
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}
