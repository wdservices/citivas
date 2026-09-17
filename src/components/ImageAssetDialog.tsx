import { useState, useMemo } from "react";
import { Check, Trash2, Image as ImageIcon, Loader2, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useUserAssets, useDeleteAsset, type UserUpload } from "@/lib/useFirestore";
import { deleteImagesFromCloudinary } from "@/lib/cloudinary";
import { useToast } from "@/hooks/use-toast";

interface ImageAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (images: { url: string; publicId: string }[]) => void;
  maxSelect?: number;
}

const ImageAssetDialog = ({ open, onOpenChange, onSelect, maxSelect = 20 }: ImageAssetDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: assets = [], isLoading } = useUserAssets(user?.id || null);
  const deleteAsset = useDeleteAsset();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return assets;
    const q = search.toLowerCase();
    return assets.filter((a) => a.folder.toLowerCase().includes(q) || a.publicId.toLowerCase().includes(q));
  }, [assets, search]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < maxSelect) {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelect = () => {
    const picked = assets.filter((a) => selected.has(a.id));
    onSelect(picked.map((a) => ({ url: a.url, publicId: a.publicId })));
    setSelected(new Set());
    onOpenChange(false);
  };

  const handleDelete = async (asset: UserUpload) => {
    setDeletingId(asset.id);
    try {
      if (asset.publicId && !asset.publicId.startsWith("listings/local_") && !asset.publicId.includes("/local_") && !asset.publicId.includes("/fallback_")) {
        await deleteImagesFromCloudinary([asset.publicId]);
      }
      await deleteAsset.mutateAsync({ id: asset.id, userId: user!.id });
      toast({ title: "Image removed" });
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Image Library
          </DialogTitle>
          <DialogDescription>
            Browse and reuse your previously uploaded images. Select up to {maxSelect} at a time.
          </DialogDescription>
        </DialogHeader>

        {assets.length > 3 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by folder name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        )}

        <div className="flex-1 overflow-y-auto min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <ImageIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">
                {assets.length === 0 ? "No uploaded images yet" : "No images match your search"}
              </p>
              <p className="text-xs mt-1">
                {assets.length === 0 ? "Images you upload will appear here for reuse." : "Try a different search term."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {filtered.map((asset) => {
                const isSelected = selected.has(asset.id);
                const isDeleting = deletingId === asset.id;
                return (
                  <div
                    key={asset.id}
                    className="relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer group transition-all"
                    style={{ borderColor: isSelected ? "hsl(var(--primary))" : "transparent" }}
                    onClick={() => !isDeleting && toggle(asset.id)}
                  >
                    <img src={asset.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    <div
                      className={`absolute inset-0 transition-opacity ${
                        isSelected ? "bg-primary/20" : "bg-black/0 group-hover:bg-black/10"
                      }`}
                    />
                    {isSelected && (
                      <div className="absolute top-1.5 left-1.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDelete(asset); }}
                      disabled={isDeleting}
                      className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    </button>
                    <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[9px] px-1.5 py-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                      {asset.folder}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between items-center">
          <p className="text-xs text-muted-foreground">
            {selected.size > 0 ? `${selected.size} selected` : `${filtered.length} images`}
          </p>
          <div className="flex gap-2">
            <DialogClose asChild>
              <Button variant="outline" size="sm">Cancel</Button>
            </DialogClose>
            <Button size="sm" disabled={selected.size === 0} onClick={handleSelect}>
              Use Selected {selected.size > 0 && `(${selected.size})`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImageAssetDialog;
