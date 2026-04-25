import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Image as ImageIcon,
  Upload,
  X,
  DollarSign,
  Tag,
  Zap,
  Truck,
  Star,
  GripVertical,
  Package,
  Save,
  ExternalLink,
  Video,
  Layers,
} from "lucide-react";
import ProductVariantsManager from "@/components/admin/ProductVariantsManager";
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

interface ImageItem {
  id: string;
  url: string;
  alt: string | null;
  persisted: boolean; // true if exists in DB, false if pending insert
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

const CurrencyInput = ({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) => {
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
        <Input value={display} onChange={handleChange} placeholder="0,00" className="pl-9" inputMode="numeric" />
      </div>
    </div>
  );
};

const SortableImage = ({
  item,
  onRemove,
}: {
  item: ImageItem;
  onRemove: () => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group rounded-xl overflow-hidden border border-border bg-card shadow-sm aspect-square"
    >
      <img src={item.url} alt={item.alt || ""} className="w-full h-full object-cover" />
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="absolute top-1.5 left-1.5 bg-background/80 backdrop-blur-sm rounded p-1 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Arrastar para reordenar"
      >
        <GripVertical className="w-3.5 h-3.5 text-foreground" />
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

const Section = ({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  children: React.ReactNode;
}) => (
  <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
    <div className="px-5 py-4 border-b border-border bg-muted/20">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {description && <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </div>
    </div>
    <div className="p-5 space-y-4">{children}</div>
  </div>
);

const AdminProductForm = () => {
  const { id: paramId } = useParams<{ id: string }>();
  const editingId = paramId && paramId !== "new" ? paramId : null;
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Auto-calculate discount
  useEffect(() => {
    if (form.original_price > 0 && form.sale_price > 0 && form.sale_price < form.original_price) {
      const discount = Math.round(((form.original_price - form.sale_price) / form.original_price) * 100);
      if (discount !== form.discount_percent) {
        setForm((prev) => ({ ...prev, discount_percent: discount }));
      }
    } else if (form.original_price > 0 && form.sale_price >= form.original_price) {
      if (form.discount_percent !== 0) {
        setForm((prev) => ({ ...prev, discount_percent: 0 }));
      }
    }
  }, [form.original_price, form.sale_price, form.discount_percent]);

  // Load existing product when editing
  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ["admin-product-edit", editingId],
    queryFn: async () => {
      if (!editingId) return null;
      const { data, error } = await supabase
        .from("products")
        .select("*, product_images(id, url, alt, sort_order)")
        .eq("id", editingId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!editingId,
  });

  useEffect(() => {
    if (existing && !initialLoaded) {
      setForm({
        slug: existing.slug,
        title: existing.title,
        description: existing.description || "",
        original_price: Number(existing.original_price),
        sale_price: Number(existing.sale_price),
        discount_percent: existing.discount_percent || 0,
        promo_tag: existing.promo_tag || "",
        flash_sale: existing.flash_sale || false,
        flash_sale_ends_in: existing.flash_sale_ends_in || "",
        free_shipping: existing.free_shipping ?? true,
        shipping_cost: Number(existing.shipping_cost) || 0,
        estimated_delivery: existing.estimated_delivery || "",
        checkout_type: existing.checkout_type,
        external_checkout_url: existing.external_checkout_url || "",
        thank_you_url: existing.thank_you_url || "",
        rating: Number(existing.rating) || 5,
        review_count: existing.review_count || 0,
        sold_count: existing.sold_count || 0,
        active: existing.active ?? true,
        video_url: existing.video_url || "",
      });
      const sortedImgs = [...(existing.product_images || [])].sort(
        (a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
      );
      setImages(
        sortedImgs.map((img: any) => ({
          id: img.id,
          url: img.url,
          alt: img.alt,
          persisted: true,
        }))
      );
      setInitialLoaded(true);
    }
  }, [existing, initialLoaded]);

  const updateField = (field: keyof ProductForm, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 10MB", variant: "destructive" });
      return;
    }
    setUploadingImage(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const ext = file.name.split(".").pop();
      const fileName = `${user.id}/images/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(fileName, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(fileName);
      setImages((prev) => [
        ...prev,
        {
          id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          url: urlData.publicUrl,
          alt: "",
          persisted: false,
        },
      ]);
      toast({ title: "Imagem enviada!" });
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploadingImage(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      let productId = editingId;

      if (editingId) {
        const { error } = await supabase.from("products").update(form).eq("id", editingId);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase
          .from("products")
          .insert(form)
          .select("id")
          .single();
        if (error) throw error;
        productId = inserted.id;
      }

      if (!productId) throw new Error("ID do produto inválido");

      // Sync images: delete removed, insert new, reorder all
      if (editingId) {
        // Delete persisted images that are no longer in the list
        const persistedIds = images.filter((i) => i.persisted).map((i) => i.id);
        const originalIds = (existing?.product_images || []).map((i: any) => i.id);
        const toDelete = originalIds.filter((id: string) => !persistedIds.includes(id));
        if (toDelete.length > 0) {
          await supabase.from("product_images").delete().in("id", toDelete);
        }
      }

      // Insert any new (non-persisted) images one-by-one so we can map
      // each tmpId to its real DB id without relying on insert() return order
      // (Postgres does not guarantee returning rows in input order).
      const newImages = images.filter((i) => !i.persisted);
      const tmpToReal = new Map<string, string>();
      for (const img of newImages) {
        const { data: inserted, error } = await supabase
          .from("product_images")
          .insert({
            product_id: productId!,
            url: img.url,
            alt: img.alt || null,
          })
          .select("id")
          .single();
        if (error) throw error;
        tmpToReal.set(img.id, inserted.id);
      }

      // Build final ordered list of real DB IDs respecting current visual order
      const finalOrder = images.map((img) => (img.persisted ? img.id : tmpToReal.get(img.id)!));

      // Persist sort_order matching current order
      if (finalOrder.length > 0) {
        await Promise.all(
          finalOrder.map((id, index) =>
            supabase.from("product_images").update({ sort_order: index }).eq("id", id)
          )
        );
      }

      return productId;
    },
    onSuccess: (productId: string | null | undefined) => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-product-edit", editingId] });
      toast({ title: editingId ? "Produto atualizado!" : "Produto criado!" });
      if (!editingId && productId) {
        // Navegar para a tela de edição para permitir gerenciar variantes
        navigate(`/dashboard/products/${productId}`, { replace: true });
      } else {
        navigate("/dashboard/products");
      }
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!editingId) return;
      const { error } = await supabase.from("products").delete().eq("id", editingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast({ title: "Produto removido!" });
      navigate("/dashboard/products");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.slug) {
      toast({ title: "Preencha título e slug", variant: "destructive" });
      return;
    }
    saveMutation.mutate();
  };

  if (editingId && loadingExisting) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-7 w-7 border-2 border-transparent border-t-primary" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-24">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 -mx-4 sm:mx-0 bg-background/80 backdrop-blur-md border-b border-border px-4 sm:px-0 sm:border-0 sm:bg-transparent sm:backdrop-blur-none py-3 sm:py-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard/products")}
              className="shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Link to="/dashboard/products" className="hover:text-foreground transition-colors">
                  Produtos
                </Link>
                <span>/</span>
                <span className="truncate">{editingId ? "Editar" : "Novo"}</span>
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">
                {editingId ? form.title || "Editar produto" : "Novo produto"}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate("/dashboard/products")}
              className="hidden sm:inline-flex"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={saveMutation.isPending}
              className="bg-primary hover:bg-primary/90"
            >
              <Save className="w-4 h-4 mr-1.5" />
              {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-5">
          <Section icon={Tag} title="Informações básicas" description="Título, slug e descrição do produto">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Título</Label>
              <Input
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
                placeholder="Nome do produto"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Slug (URL)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">
                  /product/
                </span>
                <Input
                  value={form.slug}
                  onChange={(e) => updateField("slug", e.target.value)}
                  placeholder="meu-produto"
                  required
                  className="pl-[68px]"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Descrição</Label>
              <Textarea
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                rows={5}
                placeholder="Descreva seu produto..."
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Tag promocional</Label>
                <Input
                  value={form.promo_tag}
                  onChange={(e) => updateField("promo_tag", e.target.value)}
                  placeholder="Promo do Mês"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Entrega estimada</Label>
                <Input
                  value={form.estimated_delivery}
                  onChange={(e) => updateField("estimated_delivery", e.target.value)}
                  placeholder="20 de março"
                />
              </div>
            </div>
          </Section>

          <Section
            icon={ImageIcon}
            title="Mídia"
            description="Arraste para reordenar. A primeira imagem é a principal."
          >
            {images.length > 0 ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(event: DragEndEvent) => {
                  const { active, over } = event;
                  if (over && active.id !== over.id) {
                    setImages((items) => {
                      const oldIndex = items.findIndex((i) => i.id === active.id);
                      const newIndex = items.findIndex((i) => i.id === over.id);
                      return arrayMove(items, oldIndex, newIndex);
                    });
                  }
                }}
              >
                <SortableContext items={images.map((i) => i.id)} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {images.map((img, idx) => (
                      <div key={img.id} className="relative">
                        {idx === 0 && (
                          <span className="absolute -top-2 left-2 z-10 bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                            PRINCIPAL
                          </span>
                        )}
                        <SortableImage
                          item={img}
                          onRemove={() => setImages((prev) => prev.filter((p) => p.id !== img.id))}
                        />
                      </div>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className="border-2 border-dashed border-border rounded-xl py-10 px-4 text-center">
                <ImageIcon className="w-10 h-10 mx-auto text-muted-foreground mb-2 opacity-50" />
                <p className="text-sm text-muted-foreground">Nenhuma imagem adicionada</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Use os campos abaixo para adicionar via URL ou upload
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Input
                placeholder="Cole a URL da imagem"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10"
                disabled={!newImageUrl}
                onClick={() => {
                  setImages((prev) => [
                    ...prev,
                    {
                      id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                      url: newImageUrl,
                      alt: "",
                      persisted: false,
                    },
                  ]);
                  setNewImageUrl("");
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
                      await handleImageUpload(files[i]);
                    }
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10"
                  asChild
                  disabled={uploadingImage}
                >
                  <span>
                    <Upload className="w-4 h-4 mr-1" /> {uploadingImage ? "..." : "Upload"}
                  </span>
                </Button>
              </label>
            </div>
            <p className="text-[10px] text-muted-foreground">Máximo 10MB por imagem.</p>
          </Section>

          <Section
            icon={Layers}
            title="Variantes"
            description="Crie categorias (Tamanho, Cor...) com suas opções"
          >
            <ProductVariantsManager
              productId={editingId}
              productImages={images.filter((i) => i.persisted).map((i) => ({ id: i.id, url: i.url }))}
            />
          </Section>

          <Section icon={DollarSign} title="Preços" description="Defina valor original, com desconto e frete">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <CurrencyInput
                label="Preço original"
                value={form.original_price}
                onChange={(v) => updateField("original_price", v)}
              />
              <CurrencyInput
                label="Preço com desconto"
                value={form.sale_price}
                onChange={(v) => updateField("sale_price", v)}
              />
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Desconto</Label>
                <div className="relative">
                  <Input
                    value={form.discount_percent}
                    readOnly
                    className="bg-muted/50 cursor-not-allowed pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold">
                    %
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">Calculado automaticamente</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <CurrencyInput
                label="Custo do frete"
                value={form.shipping_cost}
                onChange={(v) => updateField("shipping_cost", v)}
              />
            </div>
          </Section>

          <Section icon={Star} title="Prova social" description="Avaliação, reviews e quantidade vendida">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Avaliação</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={form.rating}
                  onChange={(e) => updateField("rating", parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Nº avaliações</Label>
                <Input
                  type="number"
                  value={form.review_count}
                  onChange={(e) => updateField("review_count", parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Vendidos</Label>
                <Input
                  type="number"
                  value={form.sold_count}
                  onChange={(e) => updateField("sold_count", parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          </Section>

          <Section icon={Truck} title="Checkout & links" description="Configure o tipo de pagamento e links externos">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Tipo de checkout</Label>
              <Select value={form.checkout_type} onValueChange={(v) => updateField("checkout_type", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="external">Link externo</SelectItem>
                  <SelectItem value="pix">PIX (API)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.checkout_type === "external" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">URL do checkout</Label>
                <Input
                  value={form.external_checkout_url}
                  onChange={(e) => updateField("external_checkout_url", e.target.value)}
                  placeholder="https://pay.hotmart.com/..."
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Página de obrigado (upsell)</Label>
              <Input
                value={form.thank_you_url}
                onChange={(e) => updateField("thank_you_url", e.target.value)}
                placeholder="https://seusite.com/obrigado"
              />
              <p className="text-[10px] text-muted-foreground">
                Link externo para redirecionar após pagamento confirmado
              </p>
            </div>
          </Section>

          <Section icon={Video} title="Vídeo (opcional)" description="Adicione um vídeo de demonstração">
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
                    const {
                      data: { user },
                    } = await supabase.auth.getUser();
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
                  <span>
                    <Upload className="w-4 h-4 mr-1" /> Upload
                  </span>
                </Button>
              </label>
            </div>
            {form.video_url && (
              <video src={form.video_url} className="w-full h-40 rounded-lg object-cover bg-black" muted controls />
            )}
          </Section>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <Section icon={Package} title="Status">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Produto ativo</p>
                <p className="text-[11px] text-muted-foreground">Visível para clientes</p>
              </div>
              <Switch checked={form.active} onCheckedChange={(v) => updateField("active", v)} />
            </div>
            {editingId && form.slug && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => window.open(`/product/${form.slug}`, "_blank")}
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                Ver na loja
              </Button>
            )}
          </Section>

          <Section icon={Zap} title="Promoção & entrega">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Frete grátis</p>
                <p className="text-[11px] text-muted-foreground">Mostra badge na vitrine</p>
              </div>
              <Switch checked={form.free_shipping} onCheckedChange={(v) => updateField("free_shipping", v)} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Oferta relâmpago</p>
                <p className="text-[11px] text-muted-foreground">Ativa countdown</p>
              </div>
              <Switch checked={form.flash_sale} onCheckedChange={(v) => updateField("flash_sale", v)} />
            </div>
            {form.flash_sale && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Termina em</Label>
                <Input
                  value={form.flash_sale_ends_in}
                  onChange={(e) => updateField("flash_sale_ends_in", e.target.value)}
                  placeholder="2 dia(s)"
                />
              </div>
            )}
          </Section>

          {editingId && (
            <div className="bg-card border border-destructive/30 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-destructive">Zona de perigo</p>
              <p className="text-[11px] text-muted-foreground">
                Remover este produto também remove todos os pedidos vinculados.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => {
                  if (confirm("Remover este produto? Esta ação não pode ser desfeita.")) {
                    deleteMutation.mutate();
                  }
                }}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Remover produto
              </Button>
            </div>
          )}
        </div>
      </div>
    </form>
  );
};

export default AdminProductForm;
