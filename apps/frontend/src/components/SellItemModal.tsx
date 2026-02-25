"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createItem, getPresignedUrl } from "@/lib/api";
import { ApiError } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PlusCircle, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Field } from "@/components/ui/field";

export function SellItemModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
  });
  const [files, setFiles] = useState<File[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const priceNum = parseFloat(formData.price.replace(",", "."));
    
    if (!formData.title || !formData.description || isNaN(priceNum) || priceNum <= 0) {
      setError("Veuillez remplir tous les champs avec des valeurs valides.");
      setLoading(false);
      return;
    }

    try {
      // 1. Upload images if any
      const uploadedImages: string[] = [];
      for (const file of files) {
        const { signedUrl, publicUrl } = await getPresignedUrl(file.name, file.type);
        
        const uploadRes = await fetch(signedUrl, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type,
          }
        });
        
        if (!uploadRes.ok) {
          throw new Error(`Erreur lors de l'upload de l'image ${file.name}`);
        }
        
        uploadedImages.push(publicUrl);
      }

      // 2. Create the item
      await createItem({
        title: formData.title,
        description: formData.description,
        price: priceNum,
        images: uploadedImages,
      });
      
      setIsOpen(false);
      setFormData({ title: "", description: "", price: "" });
      setFiles([]);
      router.refresh(); // Refresh the page to show the new item
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message || "Erreur serveur : impossible de créer l'objet.");
      } else {
        setError(err.message || "Une erreur s'est produite lors de la création de l'objet.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button className="bg-[#b45309] hover:bg-[#92400e] text-white shadow-md rounded-full px-6 flex items-center gap-2">
          <PlusCircle className="w-5 h-5" />
          <span>Vendre un Objet</span>
        </Button>
      </AlertDialogTrigger>
      
      <AlertDialogContent className="sm:max-w-[425px] bg-[#f8f5f0] border-stone-200 shadow-xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl font-serif text-stone-800">
            Proposer un objet
          </AlertDialogTitle>
          <AlertDialogDescription className="text-stone-600">
            Mettez en vente votre objet de collection. Il sera soumis à validation si sa valeur dépasse 1 000 €.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4 relative">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm border border-red-200" role="alert">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <Field>
              <Label htmlFor="title" className="text-stone-700 font-medium">Titre de l'objet</Label>
              <Input 
                id="title" 
                name="title" 
                value={formData.title}
                onChange={handleChange}
                placeholder="Ex: Appareil Photo Leica M3" 
                maxLength={100}
                required
                className="bg-white border-stone-300 focus-visible:ring-amber-500"
                aria-required="true"
              />
            </Field>

            <Field>
              <Label htmlFor="price" className="text-stone-700 font-medium">Prix estimé (€)</Label>
              <Input 
                id="price" 
                name="price" 
                type="number"
                step="0.01"
                min="0.1"
                value={formData.price}
                onChange={handleChange}
                placeholder="Ex: 1250.00" 
                required
                className="bg-white border-stone-300 focus-visible:ring-amber-500"
                aria-required="true"
              />
              <p className="text-xs text-stone-500 mt-1">
                Une commission de 5% sera appliquée.
              </p>
            </Field>

            <Field>
              <Label htmlFor="description" className="text-stone-700 font-medium">Description détaillée</Label>
              <Textarea 
                id="description" 
                name="description" 
                value={formData.description}
                onChange={handleChange}
                placeholder="Décrivez l'état, l'histoire et les particularités de l'objet..." 
                rows={4}
                required
                className="bg-white border-stone-300 focus-visible:ring-amber-500 resize-none"
                aria-required="true"
              />
            </Field>

            <Field>
              <Label htmlFor="images" className="text-stone-700 font-medium">Photos (optionnel)</Label>
              <Input 
                id="images" 
                name="images" 
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="bg-white border-stone-300 focus-visible:ring-amber-500"
              />
              <p className="text-xs text-stone-500 mt-1">
                Sélectionnez plusieurs images pour mieux mettre en valeur votre objet.
              </p>
            </Field>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              disabled={loading}
              className="border-stone-300 text-stone-700 hover:bg-stone-100"
            >
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-stone-800 hover:bg-stone-900 text-white min-w-[120px]"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Envoi...
                </>
              ) : (
                "Publier l'objet"
              )}
            </Button>
          </div>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
