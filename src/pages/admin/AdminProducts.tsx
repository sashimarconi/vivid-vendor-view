import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Image as ImageIcon, Palette, ChevronDown, ChevronUp, Link2, Upload, X, DollarSign, Tag, Zap, Truck, Star, GripVertical, Sparkles, Package, Copy } from "lucide-react";
import { toast as sonnerToast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Sortable thumbnail for creation images (not yet persisted)
const SortableCreationImage = ({ id, url, onRemove }: { id: string; url: string; onRemove: () => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group rounded-xl overflow-hidden border border-border bg-card shadow-sm"
    >
      <img src={url} alt="" className="w-24 h-24 object-cover" />
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="absolute top-1 left-1 bg-background/80 backdrop-blur-sm rounded p-0.5 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Arrastar para reordenar"
      >
        <GripVertical className="w-3.5 h-3.5 text-foreground" />
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};

// Sortable row for persisted product images
const SortableProductImage = ({
  id,
  url,
  alt,
  onDelete,
}: {
  id: string;
  url: string;
  alt: string | null;
  onDelete: () => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 bg-muted/40 hover:bg-muted/60 transition-colors p-2 rounded-lg border border-border"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1"
        aria-label="Arrastar para reordenar"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <img src={url} alt={alt || ""} className="w-14 h-14 rounded object-cover border border-border" />
      <span className="flex-1 text-xs text-muted-foreground truncate">{alt || url}</span>
      <Button variant="ghost" size="sm" onClick={onDelete}>
        <Trash2 className="w-4 h-4 text-destructive" />
      </Button>
    </div>
  );
};

interface ProductForm {
  slug: string;
  title: string;
  description: string;
  original_price: number;
  sale_price: number;
  discount_percent: number;
  promo_tag: string;
  flash_sale: boolean;
  flash_sale_ends_in: string;
  free_shipping: boolean;
  shipping_cost: number;
  estimated_delivery: string;
  checkout_type: string;
  external_checkout_url: string;
  thank_you_url: string;
  rating: number;
  review_count: number;
  sold_count: number;
  active: boolean;
  video_url: string;
}

const emptyForm: ProductForm = {
  slug: "",
  title: "",
  description: "",
  original_price: 0,
  sale_price: 0,
  discount_percent: 0,
  promo_tag: "",
  flash_sale: false,
  flash_sale_ends_in: "",
  free_shipping: true,
  shipping_cost: 0,
  estimated_delivery: "",
  checkout_type: "pix",
  external_checkout_url: "",
  thank_you_url: "",
  rating: 5.0,
  review_count: 0,
  sold_count: 0,
  active: true,
  video_url: "",
};

// Format cents input: "19990" -> "199,90"
const formatCentsInput = (raw: string): string => {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  const num = parseInt(digits, 10);
  const reais = Math.floor(num / 100);
  const centavos = num % 100;
  return `${reais},${centavos.toString().padStart(2, "0")}`;
};

const parseCentsDisplay = (display: string): number => {
  if (!display) return 0;
  const clean = display.replace(/\./g, "").replace(",", ".");
  return parseFloat(clean) || 0;
};

const numberToDisplay = (num: number): string => {
  if (!num) return "";
  return num.toFixed(2).replace(".", ",");
};

const CurrencyInput = ({ value, onChange, label, icon }: { value: number; onChange: (v: number) => void; label: string; icon?: React.ReactNode }) => {
  const [display, setDisplay] = useState(numberToDisplay(value));

  useEffect(() => {
    setDisplay(numberToDisplay(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    const formatted = formatCentsInput(raw);
    setDisplay(formatted);
    onChange(parseCentsDisplay(formatted));
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">R$</span>
        <Input
          value={display}
          onChange={handleChange}
          placeholder="0,00"
          className="pl-9"
          inputMode="numeric"
        />
      </div>
    </div>
  );
};

const AdminProducts = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [variantDialogOpen, setVariantDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newImageAlt, setNewImageAlt] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [newVariantName, setNewVariantName] = useState("");
  const [newVariantColor, setNewVariantColor] = useState("");
  const [newVariantThumbnail, setNewVariantThumbnail] = useState("");
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [editVariantName, setEditVariantName] = useState("");
  const [editVariantColor, setEditVariantColor] = useState("");
  const [creationImages, setCreationImages] = useState<{ id: string; url: string; alt: string }[]>([]);
  const [newCreationImageUrl, setNewCreationImageUrl] = useState("");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const [uploadingImage, setUploadingImage] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Auto-calculate discount
  useEffect(() => {
    if (form.original_price > 0 && form.sale_price > 0 && form.sale_price < form.original_price) {
      const discount = Math.round(((form.original_price - form.sale_price) / form.original_price) * 100);
      if (discount !== form.discount_percent) {
        setForm(prev => ({ ...prev, discount_percent: discount }));
      }
    } else if (form.original_price > 0 && form.sale_price >= form.original_price) {
      if (form.discount_percent !== 0) {
        setForm(prev => ({ ...prev, discount_percent: 0 }));
      }
    }
  }, [form.original_price, form.sale_price]);

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_images(id, url, alt, sort_order)")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: productImages } = useQuery({
    queryKey: ["product-images", selectedProductId],
    queryFn: async () => {
      if (!selectedProductId) return [];
      const { data, error } = await supabase
        .from("product_images")
        .select("*")
        .eq("product_id", selectedProductId)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedProductId,
  });

  const { data: variantGroups } = useQuery({
    queryKey: ["variant-groups", selectedProductId],
    queryFn: async () => {
      if (!selectedProductId) return [];
      const { data, error } = await supabase
        .from("variant_groups")
        .select("*")
        .eq("product_id", selectedProductId)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedProductId,
  });

  const { data: productVariants } = useQuery({
    queryKey: ["product-variants", selectedProductId],
    queryFn: async () => {
      if (!selectedProductId) return [];
      const { data, error } = await supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", selectedProductId)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedProductId,
  });

  const invalidateVariants = () => {
    queryClient.invalidateQueries({ queryKey: ["variant-groups", selectedProductId] });
    queryClient.invalidateQueries({ queryKey: ["product-variants", selectedProductId] });
  };

  const saveMutation = useMutation({
    mutationFn: async (data: ProductForm) => {
      if (editingId) {
        const { error } = await supabase.from("products").update(data).eq("id", editingId);
        if (error) throw error;
        return editingId;
      } else {
        const { data: inserted, error } = await supabase.from("products").insert(data).select("id").single();
        if (error) throw error;
        return inserted.id;
      }
    },
    onSuccess: async (productId: string) => {
      // Save creation images if any
      if (!editingId && creationImages.length > 0) {
        const imagesToInsert = creationImages.map((img, i) => ({
          product_id: productId,
          url: img.url,
          alt: img.alt || null,
          sort_order: i,
        }));
        await supabase.from("product_images").insert(imagesToInsert);
      }
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      setCreationImages([]);
      toast({ title: editingId ? "Produto atualizado!" : "Produto criado!" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast({ title: "Produto removido!" });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      // 1) Buscar produto original com todas relações
      const { data: original, error: fetchErr } = await supabase
        .from("products")
        .select(`
          *,
          product_images(url, alt, sort_order),
          variant_groups(id, name, sort_order),
          product_variants(name, color, thumbnail_url, sort_order, variant_group_id)
        `)
        .eq("id", id)
        .single();
      if (fetchErr) throw fetchErr;

      // 2) Gerar slug único
      const baseSlug = `${original.slug}-copia`;
      let newSlug = baseSlug;
      let suffix = 1;
      while (true) {
        const { data: exists } = await supabase
          .from("products")
          .select("id")
          .eq("slug", newSlug)
          .maybeSingle();
        if (!exists) break;
        suffix += 1;
        newSlug = `${baseSlug}-${suffix}`;
      }

      // 3) Inserir novo produto sem campos auto/relations
      const { id: _id, created_at, updated_at, product_images, variant_groups: vgs, product_variants: pvs, ...rest } = original as any;
      const { data: inserted, error: insertErr } = await supabase
        .from("products")
        .insert({
          ...rest,
          slug: newSlug,
          title: `${original.title} (cópia)`,
          sold_count: 0,
        })
        .select("id")
        .single();
      if (insertErr) throw insertErr;
      const newProductId = inserted.id;

      // 4) Imagens
      if (product_images?.length) {
        await supabase.from("product_images").insert(
          product_images.map((img: any) => ({
            product_id: newProductId,
            url: img.url,
            alt: img.alt,
            sort_order: img.sort_order ?? 0,
          }))
        );
      }

      // 5) Grupos de variantes (mapeia old->new id)
      const groupIdMap = new Map<string, string>();
      if (vgs?.length) {
        for (const g of vgs) {
          const { data: ng, error: gErr } = await supabase
            .from("variant_groups")
            .insert({ product_id: newProductId, name: g.name, sort_order: g.sort_order ?? 0 })
            .select("id")
            .single();
          if (gErr) throw gErr;
          groupIdMap.set(g.id, ng.id);
        }
      }

      // 6) Variantes
      if (pvs?.length) {
        await supabase.from("product_variants").insert(
          pvs.map((v: any) => ({
            product_id: newProductId,
            name: v.name,
            color: v.color,
            thumbnail_url: v.thumbnail_url,
            sort_order: v.sort_order ?? 0,
            variant_group_id: v.variant_group_id ? groupIdMap.get(v.variant_group_id) ?? null : null,
          }))
        );
      }

      return newProductId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast({ title: "Produto duplicado!", description: "Cópia criada como rascunho." });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao duplicar", description: err.message, variant: "destructive" });
    },
  });

  const addImageMutation = useMutation({
    mutationFn: async ({ product_id, url, alt }: { product_id: string; url: string; alt: string }) => {
      const { error } = await supabase.from("product_images").insert({ product_id, url, alt });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-images", selectedProductId] });
      setNewImageUrl("");
      setNewImageAlt("");
      toast({ title: "Imagem adicionada!" });
    },
  });

  const deleteImageMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_images").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-images", selectedProductId] });
    },
  });

  const reorderImagesMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      // Update each image's sort_order in parallel
      await Promise.all(
        orderedIds.map((id, index) =>
          supabase.from("product_images").update({ sort_order: index }).eq("id", id)
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-images", selectedProductId] });
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast({ title: "Ordem salva!" });
    },
  });

  const addGroupMutation = useMutation({
    mutationFn: async ({ product_id, name }: { product_id: string; name: string }) => {
      const { error } = await supabase.from("variant_groups").insert({ product_id, name });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateVariants();
      setNewGroupName("");
      toast({ title: "Categoria criada!" });
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("variant_groups").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateVariants();
      toast({ title: "Categoria removida!" });
    },
  });

  const addVariantMutation = useMutation({
    mutationFn: async ({ product_id, name, color, thumbnail_url, variant_group_id }: {
      product_id: string; name: string; color: string; thumbnail_url: string; variant_group_id: string;
    }) => {
      const { error } = await supabase.from("product_variants").insert({
        product_id,
        name,
        color: color || null,
        thumbnail_url: thumbnail_url || null,
        variant_group_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateVariants();
      setNewVariantName("");
      setNewVariantColor("");
      setNewVariantThumbnail("");
      toast({ title: "Opção adicionada!" });
    },
  });

  const deleteVariantMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_variants").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateVariants();
    },
  });

  const updateVariantThumbnailMutation = useMutation({
    mutationFn: async ({ id, thumbnail_url }: { id: string; thumbnail_url: string | null }) => {
      const { error } = await supabase
        .from("product_variants")
        .update({ thumbnail_url })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateVariants();
      toast({ title: "Imagem atualizada!" });
    },
  });

  const updateVariantMutation = useMutation({
    mutationFn: async ({ id, name, color }: { id: string; name: string; color: string | null }) => {
      const { error } = await supabase
        .from("product_variants")
        .update({ name, color })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateVariants();
      setEditingVariantId(null);
      toast({ title: "Variante atualizada!" });
    },
  });

  const updateGroupMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from("variant_groups").update({ name }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateVariants();
      toast({ title: "Categoria atualizada!" });
    },
  });

  const openEdit = (product: any) => {
    setEditingId(product.id);
    setForm({
      slug: product.slug,
      title: product.title,
      description: product.description || "",
      original_price: product.original_price,
      sale_price: product.sale_price,
      discount_percent: product.discount_percent,
      promo_tag: product.promo_tag || "",
      flash_sale: product.flash_sale || false,
      flash_sale_ends_in: product.flash_sale_ends_in || "",
      free_shipping: product.free_shipping ?? true,
      shipping_cost: product.shipping_cost || 0,
      estimated_delivery: product.estimated_delivery || "",
      checkout_type: product.checkout_type,
      external_checkout_url: product.external_checkout_url || "",
      thank_you_url: product.thank_you_url || "",
      rating: product.rating || 5,
      review_count: product.review_count || 0,
      sold_count: product.sold_count || 0,
      active: product.active ?? true,
      video_url: product.video_url || "",
    });
    setCreationImages([]);
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(form);
  };

  const updateField = (field: keyof ProductForm, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (file: File, forCreation: boolean = false) => {
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 10MB", variant: "destructive" });
      return;
    }
    setUploadingImage(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const ext = file.name.split(".").pop();
      const fileName = `${user.id}/images/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(fileName, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(fileName);
      if (forCreation) {
        setCreationImages(prev => [...prev, { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, url: urlData.publicUrl, alt: "" }]);
      } else if (selectedProductId) {
        addImageMutation.mutate({ product_id: selectedProductId, url: urlData.publicUrl, alt: "" });
      }
      toast({ title: "Imagem enviada!" });
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploadingImage(false);
    }
  };

  if (isLoading) return <p className="text-muted-foreground">Carregando...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-foreground">Produtos</h2>
        <Button onClick={() => navigate("/dashboard/products/new")} className="bg-marketplace-red hover:bg-marketplace-red/90 shrink-0">
          <Plus className="w-4 h-4 mr-1" /> <span className="hidden sm:inline">Novo Produto</span><span className="sm:hidden">Novo</span>
        </Button>
      </div>

      {/* Products list */}
      <div className="grid gap-3">
        {products?.map((product) => (
          <div key={product.id} className="bg-card rounded-lg border border-border p-3 sm:p-4">
            <div className="flex items-center gap-3 sm:gap-4">
              {product.product_images?.[0] ? (
                <img src={product.product_images[0].url} alt="" className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{product.title}</p>
                <p className="text-xs text-muted-foreground">
                  R$ {Number(product.sale_price).toFixed(2).replace(".", ",")} • {product.sold_count} vendidos
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${product.active ? "bg-marketplace-green/10 text-marketplace-green" : "bg-muted text-muted-foreground"}`}>
                    {product.active ? "Ativo" : "Inativo"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{product.checkout_type === "pix" ? "PIX" : "Link externo"}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border sm:mt-0 sm:pt-0 sm:border-0 justify-end">
              <Button variant="ghost" size="sm" title="Copiar link" onClick={() => {
                const url = `${window.location.origin}/product/${product.slug}`;
                navigator.clipboard.writeText(url);
                sonnerToast.success("Link copiado!", { description: url });
              }}>
                <Link2 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setSelectedProductId(product.id); setVariantDialogOpen(true); }} title="Variantes">
                <Palette className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setSelectedProductId(product.id); setImageDialogOpen(true); }}>
                <ImageIcon className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate(`/dashboard/products/${product.id}/edit`)}>
                <Pencil className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                title="Duplicar produto"
                disabled={duplicateMutation.isPending}
                onClick={() => duplicateMutation.mutate(product.id)}
              >
                <Copy className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { if (confirm("Remover este produto?")) deleteMutation.mutate(product.id); }}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
        {products?.length === 0 && (
          <p className="text-center text-muted-foreground py-8">Nenhum produto cadastrado</p>
        )}
      </div>

      {/* Product form dialog — improved visual */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-5 border-b border-border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20">
                <Package className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight">
                  {editingId ? "Editar Produto" : "Novo Produto"}
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {editingId ? "Atualize as informações do produto" : "Preencha os campos para cadastrar um novo produto"}
                </p>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
            
            {/* Section: Basic Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground border-b border-border pb-2">
                <Tag className="w-4 h-4 text-primary" />
                Informações Básicas
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Título</Label>
                  <Input value={form.title} onChange={(e) => updateField("title", e.target.value)} placeholder="Nome do produto" required />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Slug (URL)</Label>
                  <Input value={form.slug} onChange={(e) => updateField("slug", e.target.value)} placeholder="meu-produto" required />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Descrição</Label>
                <Textarea value={form.description} onChange={(e) => updateField("description", e.target.value)} rows={3} placeholder="Descreva seu produto..." />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Tag Promocional</Label>
                  <Input value={form.promo_tag} onChange={(e) => updateField("promo_tag", e.target.value)} placeholder="Promo do Mês" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Entrega Estimada</Label>
                  <Input value={form.estimated_delivery} onChange={(e) => updateField("estimated_delivery", e.target.value)} placeholder="20 de março" />
                </div>
              </div>
            </div>

            {/* Section: Images (only on creation) */}
            {!editingId && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground border-b border-border pb-2">
                  <ImageIcon className="w-4 h-4 text-primary" />
                  Imagens do Produto
                </div>
                
                {/* Image thumbnails — drag to reorder */}
                {creationImages.length > 0 && (
                  <>
                    <p className="text-[10px] text-muted-foreground">
                      💡 Arraste as imagens para reordenar. A primeira será a principal.
                    </p>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(event: DragEndEvent) => {
                        const { active, over } = event;
                        if (over && active.id !== over.id) {
                          setCreationImages((items) => {
                            const oldIndex = items.findIndex((i) => i.id === active.id);
                            const newIndex = items.findIndex((i) => i.id === over.id);
                            return arrayMove(items, oldIndex, newIndex);
                          });
                        }
                      }}
                    >
                      <SortableContext items={creationImages.map((i) => i.id)} strategy={rectSortingStrategy}>
                        <div className="flex flex-wrap gap-3">
                          {creationImages.map((img) => (
                            <SortableCreationImage
                              key={img.id}
                              id={img.id}
                              url={img.url}
                              onRemove={() =>
                                setCreationImages((prev) => prev.filter((p) => p.id !== img.id))
                              }
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </>
                )}

                <div className="flex gap-2">
                  <Input
                    placeholder="Cole a URL da imagem"
                    value={newCreationImageUrl}
                    onChange={(e) => setNewCreationImageUrl(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-10"
                    disabled={!newCreationImageUrl}
                    onClick={() => {
                      setCreationImages(prev => [...prev, { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, url: newCreationImageUrl, alt: "" }]);
                      setNewCreationImageUrl("");
                    }}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      multiple
                      onChange={async (e) => {
                        const files = e.target.files;
                        if (!files) return;
                        for (let i = 0; i < files.length; i++) {
                          await handleImageUpload(files[i], true);
                        }
                        e.target.value = "";
                      }}
                    />
                    <Button type="button" variant="outline" size="sm" className="h-10" asChild disabled={uploadingImage}>
                      <span><Upload className="w-4 h-4 mr-1" /> {uploadingImage ? "..." : "Upload"}</span>
                    </Button>
                  </label>
                </div>
                <p className="text-[10px] text-muted-foreground">Adicione imagens via URL ou upload. Máximo 10MB por imagem.</p>
              </div>
            )}

            {/* Section: Pricing */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground border-b border-border pb-2">
                <DollarSign className="w-4 h-4 text-primary" />
                Preços
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <CurrencyInput
                  label="Preço Original"
                  value={form.original_price}
                  onChange={(v) => updateField("original_price", v)}
                />
                <CurrencyInput
                  label="Preço com Desconto"
                  value={form.sale_price}
                  onChange={(v) => updateField("sale_price", v)}
                />
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Desconto %</Label>
                  <div className="relative">
                    <Input
                      value={form.discount_percent}
                      readOnly
                      className="bg-muted/50 cursor-not-allowed pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold">%</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Calculado automaticamente</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <CurrencyInput
                  label="Custo do Frete"
                  value={form.shipping_cost}
                  onChange={(v) => updateField("shipping_cost", v)}
                />
              </div>
            </div>

            {/* Section: Flash Sale & Toggles */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground border-b border-border pb-2">
                <Zap className="w-4 h-4 text-primary" />
                Promoção & Entrega
              </div>
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={form.flash_sale} onCheckedChange={(v) => updateField("flash_sale", v)} />
                  <Label className="text-sm">Oferta Relâmpago</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.free_shipping} onCheckedChange={(v) => updateField("free_shipping", v)} />
                  <Label className="text-sm">Frete Grátis</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.active} onCheckedChange={(v) => updateField("active", v)} />
                  <Label className="text-sm">Ativo</Label>
                </div>
              </div>
              {form.flash_sale && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Termina em</Label>
                  <Input value={form.flash_sale_ends_in} onChange={(e) => updateField("flash_sale_ends_in", e.target.value)} placeholder="2 dia(s)" />
                </div>
              )}
            </div>

            {/* Section: Social Proof */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground border-b border-border pb-2">
                <Star className="w-4 h-4 text-primary" />
                Prova Social
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Avaliação</Label>
                  <Input type="number" step="0.1" min="0" max="5" value={form.rating} onChange={(e) => updateField("rating", parseFloat(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Nº Avaliações</Label>
                  <Input type="number" value={form.review_count} onChange={(e) => updateField("review_count", parseInt(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Vendidos</Label>
                  <Input type="number" value={form.sold_count} onChange={(e) => updateField("sold_count", parseInt(e.target.value))} />
                </div>
              </div>
            </div>

            {/* Section: Checkout */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground border-b border-border pb-2">
                <Truck className="w-4 h-4 text-primary" />
                Checkout & Links
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Tipo de Checkout</Label>
                <Select value={form.checkout_type} onValueChange={(v) => updateField("checkout_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="external">Link Externo</SelectItem>
                    <SelectItem value="pix">PIX (API)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.checkout_type === "external" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">URL do Checkout</Label>
                  <Input value={form.external_checkout_url} onChange={(e) => updateField("external_checkout_url", e.target.value)} placeholder="https://pay.hotmart.com/..." />
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Página de Obrigado (Upsell)</Label>
                <Input value={form.thank_you_url} onChange={(e) => updateField("thank_you_url", e.target.value)} placeholder="https://seusite.com/obrigado" />
                <p className="text-[10px] text-muted-foreground">Link externo para redirecionar após pagamento confirmado</p>
              </div>
            </div>

            {/* Section: Video */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground border-b border-border pb-2">
                <ImageIcon className="w-4 h-4 text-primary" />
                Vídeo (opcional)
              </div>
              <div className="flex gap-2">
                <Input
                  value={form.video_url}
                  onChange={(e) => updateField("video_url", e.target.value)}
                  placeholder="https://exemplo.com/video.mp4"
                  className="flex-1"
                />
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/ogg"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 50 * 1024 * 1024) {
                        toast({ title: "Arquivo muito grande", description: "Máximo 50MB", variant: "destructive" });
                        return;
                      }
                      const { data: { user } } = await supabase.auth.getUser();
                      if (!user) {
                        toast({ title: "Não autenticado", variant: "destructive" });
                        return;
                      }
                      const ext = file.name.split(".").pop();
                      const fileName = `${user.id}/videos/${Date.now()}.${ext}`;
                      const { error } = await supabase.storage.from("product-images").upload(fileName, file);
                      if (error) {
                        toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
                        return;
                      }
                      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(fileName);
                      updateField("video_url", urlData.publicUrl);
                      toast({ title: "Vídeo enviado!" });
                    }}
                  />
                  <Button type="button" variant="outline" size="sm" className="h-10" asChild>
                    <span><Upload className="w-4 h-4 mr-1" /> Upload</span>
                  </Button>
                </label>
              </div>
              {form.video_url && (
                <video src={form.video_url} className="w-full h-32 rounded-lg object-cover" muted />
              )}
            </div>

            <Button type="submit" className="w-full bg-marketplace-red hover:bg-marketplace-red/90 h-11 text-base font-semibold" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Salvando..." : "Salvar Produto"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Images dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-primary" />
              Imagens do Produto
            </DialogTitle>
            {(productImages?.length || 0) > 1 && (
              <p className="text-[11px] text-muted-foreground">
                💡 Arraste pela alça à esquerda para reordenar.
              </p>
            )}
          </DialogHeader>
          <div className="space-y-3">
            {productImages && productImages.length > 0 && (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(event: DragEndEvent) => {
                  const { active, over } = event;
                  if (over && active.id !== over.id) {
                    const oldIndex = productImages.findIndex((i) => i.id === active.id);
                    const newIndex = productImages.findIndex((i) => i.id === over.id);
                    const reordered = arrayMove(productImages, oldIndex, newIndex);
                    // Optimistic update
                    queryClient.setQueryData(["product-images", selectedProductId], reordered);
                    reorderImagesMutation.mutate(reordered.map((i) => i.id));
                  }
                }}
              >
                <SortableContext items={productImages.map((i) => i.id)} strategy={rectSortingStrategy}>
                  <div className="space-y-2">
                    {productImages.map((img) => (
                      <SortableProductImage
                        key={img.id}
                        id={img.id}
                        url={img.url}
                        alt={img.alt}
                        onDelete={() => deleteImageMutation.mutate(img.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            <div className="border-t border-border pt-3 space-y-2">
              <div className="flex gap-2">
                <Input placeholder="URL da imagem" value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)} className="flex-1" />
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) await handleImageUpload(file, false);
                      e.target.value = "";
                    }}
                  />
                  <Button type="button" variant="outline" size="sm" className="h-10" asChild disabled={uploadingImage}>
                    <span><Upload className="w-4 h-4" /></span>
                  </Button>
                </label>
              </div>
              <Input placeholder="Texto alternativo" value={newImageAlt} onChange={(e) => setNewImageAlt(e.target.value)} />
              <Button
                className="w-full"
                disabled={!newImageUrl || !selectedProductId}
                onClick={() => selectedProductId && addImageMutation.mutate({ product_id: selectedProductId, url: newImageUrl, alt: newImageAlt })}
              >
                <Plus className="w-4 h-4 mr-1" /> Adicionar Imagem
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Variants dialog - grouped */}
      <Dialog open={variantDialogOpen} onOpenChange={(open) => {
        setVariantDialogOpen(open);
        if (!open) {
          setExpandedGroupId(null);
          setNewGroupName("");
          setNewVariantName("");
          setNewVariantColor("");
          setNewVariantThumbnail("");
        }
      }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Variantes do Produto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Create new group */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Nova categoria de variante</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: Tamanho, Cor, Voltagem..."
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  disabled={!newGroupName || !selectedProductId}
                  onClick={() => selectedProductId && addGroupMutation.mutate({ product_id: selectedProductId, name: newGroupName })}
                >
                  <Plus className="w-4 h-4 mr-1" /> Criar
                </Button>
              </div>
            </div>

            {variantGroups?.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                Crie uma categoria (ex: "Tamanho", "Cor") para adicionar opções de variante.
              </p>
            )}

            {variantGroups?.map((group) => {
              const groupVariants = (productVariants || []).filter((v) => v.variant_group_id === group.id);
              const isExpanded = expandedGroupId === group.id;

              return (
                <div key={group.id} className="border border-border rounded-lg overflow-hidden">
                  <div
                    className="flex items-center justify-between px-3 py-2.5 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      <span className="text-sm font-semibold text-foreground">{group.name}</span>
                      <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                        {groupVariants.length} opções
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Remover categoria "${group.name}" e todas suas opções?`)) {
                          deleteGroupMutation.mutate(group.id);
                        }
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>

                  {isExpanded && (
                    <div className="p-3 space-y-3">
                      {groupVariants.map((v) => {
                        const isEditing = editingVariantId === v.id;
                        return (
                        <div key={v.id} className="bg-muted/20 p-2 rounded-lg space-y-2">
                          <div className="flex items-center gap-3">
                            {v.thumbnail_url ? (
                              <img src={v.thumbnail_url} alt={v.name} className="w-10 h-10 rounded object-cover border" />
                            ) : v.color ? (
                              <div className="w-10 h-10 rounded border" style={{ backgroundColor: v.color }} />
                            ) : (
                              <div className="w-10 h-10 rounded border border-border bg-muted flex items-center justify-center">
                                <span className="text-xs font-medium text-muted-foreground">{v.name.charAt(0).toUpperCase()}</span>
                              </div>
                            )}
                            {isEditing ? (
                              <div className="flex-1 flex items-center gap-2 min-w-0">
                                <Input
                                  value={editVariantName}
                                  onChange={(e) => setEditVariantName(e.target.value)}
                                  className="h-8 text-sm flex-1"
                                  placeholder="Nome"
                                />
                                <Input
                                  type="color"
                                  value={editVariantColor || "#000000"}
                                  onChange={(e) => setEditVariantColor(e.target.value)}
                                  className="h-8 w-10 p-1 shrink-0"
                                />
                              </div>
                            ) : (
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground">{v.name}</p>
                                {v.color && <p className="text-[10px] text-muted-foreground">{v.color}</p>}
                              </div>
                            )}
                            {isEditing ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    updateVariantMutation.mutate({
                                      id: v.id,
                                      name: editVariantName,
                                      color: editVariantColor || null,
                                    })
                                  }
                                  disabled={!editVariantName}
                                >
                                  <span className="text-xs text-primary font-medium">Salvar</span>
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setEditingVariantId(null)}>
                                  <X className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingVariantId(v.id);
                                    setEditVariantName(v.name);
                                    setEditVariantColor(v.color || "");
                                  }}
                                >
                                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => deleteVariantMutation.mutate(v.id)}>
                                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                </Button>
                              </>
                            )}
                          </div>
                          {(productImages?.length || 0) > 0 && (
                            <div>
                              <p className="text-[10px] text-muted-foreground mb-1">Imagem do produto vinculada:</p>
                              <div className="flex gap-1.5 flex-wrap">
                                {productImages!.map((img: any) => (
                                  <button
                                    key={img.id}
                                    type="button"
                                    onClick={() =>
                                      updateVariantThumbnailMutation.mutate({
                                        id: v.id,
                                        thumbnail_url: v.thumbnail_url === img.url ? null : img.url,
                                      })
                                    }
                                    className={`w-10 h-10 rounded border-2 overflow-hidden transition-all ${
                                      v.thumbnail_url === img.url
                                        ? "border-primary ring-2 ring-primary/30"
                                        : "border-border opacity-70 hover:opacity-100"
                                    }`}
                                  >
                                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );})}

                      <div className="border-t border-border pt-3 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Adicionar opção</p>
                        <Input
                          placeholder="Nome (ex: P, M, G, Preta, 110V...)"
                          value={expandedGroupId === group.id ? newVariantName : ""}
                          onChange={(e) => setNewVariantName(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <div className="flex items-center gap-2 flex-1">
                            <Label className="text-[10px] whitespace-nowrap text-muted-foreground">Cor (opcional)</Label>
                            <Input
                              type="color"
                              value={newVariantColor || "#000000"}
                              onChange={(e) => setNewVariantColor(e.target.value)}
                              className="w-8 h-8 p-0.5 cursor-pointer"
                            />
                            <Input
                              value={newVariantColor}
                              onChange={(e) => setNewVariantColor(e.target.value)}
                              placeholder="Deixe vazio"
                              className="flex-1 text-xs"
                            />
                          </div>
                        </div>

                        {/* Image picker — select from already uploaded product images */}
                        {(productImages?.length || 0) > 0 ? (
                          <div>
                            <p className="text-[10px] text-muted-foreground mb-1">
                              Imagem da variante (opcional — selecione uma imagem do produto):
                            </p>
                            <div className="flex gap-1.5 flex-wrap">
                              {productImages!.map((img: any) => {
                                const selected =
                                  expandedGroupId === group.id && newVariantThumbnail === img.url;
                                return (
                                  <button
                                    key={img.id}
                                    type="button"
                                    onClick={() =>
                                      setNewVariantThumbnail(selected ? "" : img.url)
                                    }
                                    className={`w-12 h-12 rounded border-2 overflow-hidden transition-all ${
                                      selected
                                        ? "border-primary ring-2 ring-primary/30"
                                        : "border-border opacity-70 hover:opacity-100"
                                    }`}
                                  >
                                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <p className="text-[10px] text-muted-foreground italic">
                            Adicione imagens ao produto primeiro para vincular à variante.
                          </p>
                        )}

                        <Button
                          className="w-full"
                          size="sm"
                          disabled={!newVariantName || !selectedProductId}
                          onClick={() => {
                            if (selectedProductId) {
                              addVariantMutation.mutate({
                                product_id: selectedProductId,
                                name: newVariantName,
                                color: newVariantColor,
                                thumbnail_url: newVariantThumbnail,
                                variant_group_id: group.id,
                              });
                            }
                          }}
                        >
                          <Plus className="w-4 h-4 mr-1" /> Adicionar Opção
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminProducts;
