"use client";

import React, { useEffect, useState } from "react";
import { fetchItems, updateItemAsAdmin, deleteItem, type Item } from "@/lib/api";
import { ApiError } from "@/lib/apiClient";
import { useAuth } from "@/providers/AuthProvider";
import { Loader2, AlertCircle, CheckCircle, XCircle, Trash2, Edit } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function AdminPage() {
  const router = useRouter();
  const { session, loading: sessionPending } = useAuth();
  const isAdmin = session?.user?.role === "ADMIN";

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("PENDING");

  const loadItems = async (status: string) => {
    try {
      setLoading(true);
      setError(null);
      // Pass the specific status to the backend
      const data = await fetchItems(status === "ALL" ? undefined : status);
      // Double check filter on client side in case server ignores it, or if server is accurate we just use data.
      setItems(status === "ALL" ? data : data.filter(i => i.status === status));
    } catch (err) {
      console.error(err);
      if (err instanceof ApiError) {
        setError(`Erreur ${err.status}: ${err.message}`);
      } else {
        setError("Impossible de charger les annonces.");
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

    loadItems(activeTab);
  }, [activeTab, isAdmin, sessionPending, router]);

  const handleStatusChange = async (id: string, newStatus: "APPROVED" | "REJECTED") => {
    try {
      await updateItemAsAdmin(id, { status: newStatus });
      setItems(items.filter(item => item.id !== id));
      toast.success(`Annonce ${newStatus === 'APPROVED' ? 'approuvée' : 'rejetée'} avec succès !`);
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(`Erreur ${err.status}: ${err.message}`);
      } else {
        toast.error("Erreur lors de la mise à jour de l'annonce.");
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer définitivement cette annonce ?")) {
      try {
        await deleteItem(id);
        setItems(items.filter(item => item.id !== id));
        toast.success("Annonce supprimée avec succès.");
      } catch (err) {
        if (err instanceof ApiError) {
          toast.error(`Erreur ${err.status}: ${err.message}`);
        } else {
          toast.error("Erreur lors de la suppression de l'annonce.");
        }
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
            Panneau d'Administration
          </h1>
          <p className="text-lg text-muted-foreground">
            Gérez la modération des annonces et le catalogue.
          </p>
        </header>

        <Tabs defaultValue="PENDING" onValueChange={setActiveTab}>
          <TabsList className="mb-8 bg-accent/20 border border-border/40">
            <TabsTrigger value="PENDING">Annonces en attente</TabsTrigger>
            <TabsTrigger value="APPROVED">Catalogue (Approuvé)</TabsTrigger>
            <TabsTrigger value="REJECTED">Refusées</TabsTrigger>
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
                <p className="text-muted-foreground">Aucune annonce trouvée dans cette catégorie.</p>
              </div>
            ) : (
              <div className="bg-card rounded-xl border border-border/40 shadow-sm overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-[100px]">ID</TableHead>
                      <TableHead>Titre</TableHead>
                      <TableHead>Vendeur</TableHead>
                      <TableHead>Prix</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">{item.id.slice(0,8)}...</TableCell>
                        <TableCell className="font-semibold">{item.title}</TableCell>
                        <TableCell>{item.seller?.name || "Anonyme"}</TableCell>
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
                                <CheckCircle className="w-4 h-4 mr-1" /> Valider
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20"
                                onClick={() => handleStatusChange(item.id, "REJECTED")}
                              >
                                <XCircle className="w-4 h-4 mr-1" /> Refuser
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
                                <CheckCircle className="w-4 h-4 mr-1" /> Repêcher
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
        </Tabs>

      </div>
    </div>
  );
}
