import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, X, Layers } from "lucide-react";

interface ProductImage {
  id: string;
  url: string;
}

interface Props {
  productId: string | null;
  productImages: ProductImage[];
}

const ProductVariantsManager = ({ productId, productImages }: Props) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [newVariantName, setNewVariantName] = useState("");
  const [newVariantColor, setNewVariantColor] = useState("");
  const [newVariantThumbnail, setNewVariantThumbnail] = useState("");
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [editVariantName, setEditVariantName] = useState("");
  const [editVariantColor, setEditVariantColor] = useState("");
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState("");

  const { data: variantGroups } = useQuery({
    queryKey: ["variant-groups", productId],
    queryFn: async () => {
      if (!productId) return [];
      const { data, error } = await supabase
        .from("variant_groups")
        .select("*")
        .eq("product_id", productId)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!productId,
  });

  const { data: productVariants } = useQuery({
    queryKey: ["product-variants", productId],
    queryFn: async () => {
      if (!productId) return [];
      const { data, error } = await supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", productId)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!productId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["variant-groups", productId] });
    queryClient.invalidateQueries({ queryKey: ["product-variants", productId] });
  };

  const addGroup = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("variant_groups").insert({ product_id: productId!, name });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setNewGroupName("");
      toast({ title: "Categoria criada!" });
    },
  });

  const updateGroup = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from("variant_groups").update({ name }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setEditingGroupId(null);
      toast({ title: "Categoria atualizada!" });
    },
  });

  const deleteGroup = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("variant_groups").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Categoria removida!" });
    },
  });

  const addVariant = useMutation({
    mutationFn: async ({ name, color, thumbnail_url, variant_group_id }: {
      name: string; color: string; thumbnail_url: string; variant_group_id: string;
    }) => {
      const { error } = await supabase.from("product_variants").insert({
        product_id: productId!,
        name,
        color: color || null,
        thumbnail_url: thumbnail_url || null,
        variant_group_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setNewVariantName("");
      setNewVariantColor("");
      setNewVariantThumbnail("");
      toast({ title: "Opção adicionada!" });
    },
  });

  const updateVariant = useMutation({
    mutationFn: async ({ id, name, color }: { id: string; name: string; color: string | null }) => {
      const { error } = await supabase.from("product_variants").update({ name, color }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setEditingVariantId(null);
      toast({ title: "Variante atualizada!" });
    },
  });

  const updateVariantThumbnail = useMutation({
    mutationFn: async ({ id, thumbnail_url }: { id: string; thumbnail_url: string | null }) => {
      const { error } = await supabase
        .from("product_variants")
        .update({ thumbnail_url })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
  });

  const deleteVariant = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_variants").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
  });

  if (!productId) {
    return (
      <div className="border-2 border-dashed border-border rounded-xl py-8 px-4 text-center">
        <Layers className="w-9 h-9 mx-auto text-muted-foreground mb-2 opacity-50" />
        <p className="text-sm text-muted-foreground font-medium">Salve o produto primeiro</p>
        <p className="text-[11px] text-muted-foreground mt-1">
          Após salvar, você poderá adicionar variantes (cor, tamanho etc.) aqui mesmo.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Create new group */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">Nova categoria</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Ex: Tamanho, Cor, Voltagem..."
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            className="flex-1"
          />
          <Button
            type="button"
            size="sm"
            className="h-10"
            disabled={!newGroupName}
            onClick={() => addGroup.mutate(newGroupName)}
          >
            <Plus className="w-4 h-4 mr-1" /> Criar
          </Button>
        </div>
      </div>

      {variantGroups?.length === 0 && (
        <div className="border border-dashed border-border rounded-lg py-6 px-4 text-center">
          <p className="text-xs text-muted-foreground">
            Crie uma categoria (ex: "Tamanho", "Cor") para começar a adicionar opções.
          </p>
        </div>
      )}

      {variantGroups?.map((group) => {
        const groupVariants = (productVariants || []).filter((v) => v.variant_group_id === group.id);
        const isExpanded = expandedGroupId === group.id;
        const isEditingGroup = editingGroupId === group.id;

        return (
          <div key={group.id} className="border border-border rounded-lg overflow-hidden bg-background">
            <div
              className="flex items-center justify-between px-3 py-2.5 bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <button
                type="button"
                className="flex items-center gap-2 flex-1 text-left"
                onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
              >
                {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                {isEditingGroup ? (
                  <Input
                    autoFocus
                    value={editGroupName}
                    onChange={(e) => setEditGroupName(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-7 text-sm flex-1 max-w-xs"
                  />
                ) : (
                  <>
                    <span className="text-sm font-semibold text-foreground">{group.name}</span>
                    <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                      {groupVariants.length} opções
                    </span>
                  </>
                )}
              </button>
              <div className="flex items-center gap-1">
                {isEditingGroup ? (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => updateGroup.mutate({ id: group.id, name: editGroupName })}
                      disabled={!editGroupName}
                    >
                      <span className="text-xs text-primary font-medium">Salvar</span>
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setEditingGroupId(null)}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingGroupId(group.id);
                        setEditGroupName(group.name);
                      }}
                    >
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Remover categoria "${group.name}" e todas suas opções?`)) {
                          deleteGroup.mutate(group.id);
                        }
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {isExpanded && (
              <div className="p-3 space-y-3">
                {groupVariants.map((v) => {
                  const isEditing = editingVariantId === v.id;
                  return (
                    <div key={v.id} className="bg-muted/20 p-2 rounded-lg space-y-2">
                      <div className="flex items-center gap-3">
                        {v.thumbnail_url ? (
                          <img src={v.thumbnail_url} alt={v.name} className="w-10 h-10 rounded object-cover border border-border" />
                        ) : v.color ? (
                          <div className="w-10 h-10 rounded border border-border" style={{ backgroundColor: v.color }} />
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
                            <p className="text-sm font-medium text-foreground truncate">{v.name}</p>
                            {v.color && <p className="text-[10px] text-muted-foreground">{v.color}</p>}
                          </div>
                        )}
                        {isEditing ? (
                          <>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => updateVariant.mutate({
                                id: v.id,
                                name: editVariantName,
                                color: editVariantColor || null,
                              })}
                              disabled={!editVariantName}
                            >
                              <span className="text-xs text-primary font-medium">Salvar</span>
                            </Button>
                            <Button type="button" variant="ghost" size="sm" onClick={() => setEditingVariantId(null)}>
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              type="button"
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
                            <Button type="button" variant="ghost" size="sm" onClick={() => deleteVariant.mutate(v.id)}>
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                      {productImages.length > 0 && (
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1">Imagem vinculada (clique para alternar):</p>
                          <div className="flex gap-1.5 flex-wrap">
                            {productImages.map((img) => (
                              <button
                                key={img.id}
                                type="button"
                                onClick={() => updateVariantThumbnail.mutate({
                                  id: v.id,
                                  thumbnail_url: v.thumbnail_url === img.url ? null : img.url,
                                })}
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
                  );
                })}

                <div className="border-t border-border pt-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Adicionar opção</p>
                  <Input
                    placeholder="Nome (ex: P, M, G, Preta, 110V...)"
                    value={expandedGroupId === group.id ? newVariantName : ""}
                    onChange={(e) => setNewVariantName(e.target.value)}
                  />
                  <div className="flex items-center gap-2">
                    <Label className="text-[10px] whitespace-nowrap text-muted-foreground">Cor (opcional)</Label>
                    <Input
                      type="color"
                      value={newVariantColor || "#000000"}
                      onChange={(e) => setNewVariantColor(e.target.value)}
                      className="w-9 h-9 p-0.5 cursor-pointer shrink-0"
                    />
                    <Input
                      value={newVariantColor}
                      onChange={(e) => setNewVariantColor(e.target.value)}
                      placeholder="Deixe vazio"
                      className="flex-1 text-xs"
                    />
                  </div>

                  {productImages.length > 0 ? (
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1">
                        Imagem da variante (opcional):
                      </p>
                      <div className="flex gap-1.5 flex-wrap">
                        {productImages.map((img) => {
                          const selected = expandedGroupId === group.id && newVariantThumbnail === img.url;
                          return (
                            <button
                              key={img.id}
                              type="button"
                              onClick={() => setNewVariantThumbnail(selected ? "" : img.url)}
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
                      Adicione e salve imagens ao produto primeiro para vincular à variante.
                    </p>
                  )}

                  <Button
                    type="button"
                    className="w-full"
                    size="sm"
                    disabled={!newVariantName}
                    onClick={() => addVariant.mutate({
                      name: newVariantName,
                      color: newVariantColor,
                      thumbnail_url: newVariantThumbnail,
                      variant_group_id: group.id,
                    })}
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
  );
};

export default ProductVariantsManager;
