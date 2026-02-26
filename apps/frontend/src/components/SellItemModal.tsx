"use client";

import React, { useState } from "react";
import { useRouter } from "@/i18n/routing";
import { createItem, getPresignedUrl, fetchCategories, type Category } from "@/lib/api";
import { ApiError } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PlusCircle, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("Sell");
  const router = useRouter();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    categoryId: "",
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [files, setFiles] = useState<File[]>([]);

  React.useEffect(() => {
    if (isOpen && categories.length === 0) {
      fetchCategories().then(setCategories).catch(console.error);
    }
  }, [isOpen, categories.length]);

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
    
    if (!formData.title || !formData.description || isNaN(priceNum) || priceNum <= 0 || !formData.categoryId) {
      setError(t("errorFields"));
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
          throw new Error(`${t("errorUpload")} ${file.name}`);
        }
        
        uploadedImages.push(publicUrl);
      }

      // 2. Create the item
      await createItem({
        title: formData.title,
        description: formData.description,
        price: priceNum,
        images: uploadedImages,
        categoryId: formData.categoryId,
      });
      
      setIsOpen(false);
      setFormData({ title: "", description: "", price: "", categoryId: "" });
      setFiles([]);
      router.refresh(); // Refresh the page to show the new item
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message || t("errorServer"));
      } else {
        setError(err.message || t("errorUnexpected"));
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
          <span>{t("trigger")}</span>
        </Button>
      </AlertDialogTrigger>
      
      <AlertDialogContent className="sm:max-w-[425px] bg-[#f8f5f0] border-stone-200 shadow-xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl font-serif text-stone-800">
            {t("title")}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-stone-600">
            {t("description")}
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
              <Label htmlFor="title" className="text-stone-700 font-medium">{t("itemTitle")}</Label>
              <Input 
                id="title" 
                name="title" 
                value={formData.title}
                onChange={handleChange}
                placeholder={t("itemTitlePlaceholder")} 
                maxLength={100}
                required
                className="bg-white border-stone-300 focus-visible:ring-amber-500"
                aria-required="true"
              />
            </Field>

            <Field>
              <Label htmlFor="price" className="text-stone-700 font-medium">{t("price")}</Label>
              <Input 
                id="price" 
                name="price" 
                type="number"
                step="0.01"
                min="0.1"
                value={formData.price}
                onChange={handleChange}
                placeholder={t("pricePlaceholder")} 
                required
                className="bg-white border-stone-300 focus-visible:ring-amber-500"
                aria-required="true"
              />
              <p className="text-xs text-stone-500 mt-1">
                {t("commissionHint")}
              </p>
            </Field>

            <Field>
              <Label htmlFor="categoryId" className="text-stone-700 font-medium">{t("category")}</Label>
              <select
                id="categoryId"
                name="categoryId"
                value={formData.categoryId}
                onChange={(e: any) => handleChange(e)}
                required
                className="flex h-10 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                aria-required="true"
              >
                <option value="" disabled>{t("categoryPlaceholder")}</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field>
              <Label htmlFor="description" className="text-stone-700 font-medium">{t("descriptionLabel")}</Label>
              <Textarea 
                id="description" 
                name="description" 
                value={formData.description}
                onChange={handleChange}
                placeholder={t("descriptionPlaceholder")} 
                rows={4}
                required
                className="bg-white border-stone-300 focus-visible:ring-amber-500 resize-none"
                aria-required="true"
              />
            </Field>

            <Field>
              <Label htmlFor="images" className="text-stone-700 font-medium">{t("images")}</Label>
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
                {t("imagesHint")}
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
              {t("cancel")}
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-stone-800 hover:bg-stone-900 text-white min-w-[120px]"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("submitting")}
                </>
              ) : (
                t("submit")
              )}
            </Button>
          </div>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
