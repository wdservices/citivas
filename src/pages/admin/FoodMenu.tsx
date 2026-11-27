import { useState, useEffect, useMemo } from "react";
import {
  UtensilsCrossed, Layers, CheckCircle2, XCircle, Search, Plus, Star,
  MoreHorizontal, Copy, Trash2, ShoppingCart, ClipboardList, Loader2, ImageIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  type FoodItem, type FoodCategory, getFoodItems, getFoodCategories,
  toggleItemAvailability, duplicateFoodItem, deleteFoodItem, deleteFoodCategory,
  addFoodCategory, slugify,
} from "@/lib/foodMenu";
import {
  type FoodOrder, getAllFoodOrders, getTodayFoodOrders, updateFoodOrder, deleteFoodOrder,
} from "@/lib/foodOrders";
import FoodItemDialog from "./components/FoodItemDialog";
import FoodOrderForm from "./components/FoodOrderForm";
import DocketPrint from "./components/DocketPrint";

const PAGE_SIZE = 10;

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  preparing: "bg-blue-100 text-blue-800 border-blue-200",
  ready: "bg-purple-100 text-purple-800 border-purple-200",
  delivered: "bg-green-100 text-green-800 border-green-200",
};

interface AdminFoodMenuProps {
  rooms?: any[];
  bookings?: any[];
}

export default function AdminFoodMenu({ rooms = [], bookings = [] }: AdminFoodMenuProps) {
  const [tab, setTab] = useState("menu");
  const [items, setItems] = useState<FoodItem[]>([]);
  const [categories, setCategories] = useState<FoodCategory[]>([]);
  const [orders, setOrders] = useState<FoodOrder[]>([]);
  const [todayOrders, setTodayOrders] = useState<FoodOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [availFilter, setAvailFilter] = useState("all");
  const [page, setPage] = useState(1);

  // Dialogs
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [docketDialogOpen, setDocketDialogOpen] = useState(false);
  const [docketData, setDocketData] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: "item" | "order" } | null>(null);
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("");
  const [addCatOpen, setAddCatOpen] = useState(false);

  const reload = async () => {
    setLoading(true);
    try {
      const [fi, cat, allOrd, todayOrd] = await Promise.all([
        getFoodItems(), getFoodCategories(), getAllFoodOrders(), getTodayFoodOrders(),
      ]);
      setItems(fi);
      setCategories(cat);
      setOrders(allOrd);
      setTodayOrders(todayOrd);
    } catch { toast.error("Failed to load data"); }
    finally { setLoading(false); }
  };

  useEffect(() => { reload(); }, []);

  // Filtered items
  const filtered = useMemo(() => {
    let result = items;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((i) =>
        i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q) ||
        (i.categoryName || "").toLowerCase().includes(q)
      );
    }
    if (catFilter !== "all") result = result.filter((i) => i.categoryId === catFilter);
    if (availFilter === "available") result = result.filter((i) => i.available);
    if (availFilter === "unavailable") result = result.filter((i) => !i.available);
    return result;
  }, [items, search, catFilter, availFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Stats
  const totalItems = items.length;
  const totalCats = categories.length;
  const availableCount = items.filter((i) => i.available).length;
  const unavailableCount = items.filter((i) => !i.available).length;
  const todayRevenue = todayOrders.reduce((s, o) => s + o.totalAmount, 0);

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return toast.error("Category name required");
    try {
      await addFoodCategory({
        name: newCatName.trim(), slug: slugify(newCatName),
        icon: newCatIcon, displayOrder: categories.length, active: true,
      });
      toast.success("Category created");
      setNewCatName(""); setNewCatIcon(""); setAddCatOpen(false);
      reload();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDuplicate = async (item: FoodItem) => {
    try {
      await duplicateFoodItem(item);
      toast.success("Item duplicated");
      reload();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === "item") {
        await deleteFoodItem(deleteTarget.id);
        toast.success("Item deleted");
      } else {
        await deleteFoodOrder(deleteTarget.id);
        toast.success("Order deleted");
      }
      setDeleteTarget(null);
      reload();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleStatusChange = async (orderId: string, status: FoodOrder["status"]) => {
    try {
      await updateFoodOrder(orderId, { status });
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status } : o));
      setTodayOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status } : o));
      toast.success(`Status updated to ${status}`);
    } catch (e: any) { toast.error(e.message); }
  };

  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading food menu">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-44 rounded-lg" />
            <Skeleton className="h-10 w-28 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
              <Skeleton className="h-40 w-full rounded-none" />
              <div className="p-4 space-y-2.5">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-3.5 w-full" />
                <div className="flex items-center justify-between pt-1">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-6 w-12 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Food Menu</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage menu items and place guest food orders.</p>
        </div>
        <div className="flex items-center gap-3">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="menu">Menu Items</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={() => setOrderDialogOpen(true)}>
            <ShoppingCart className="mr-2 h-4 w-4" /> New Order
          </Button>
        </div>
      </div>

      {/* Menu Items Tab */}
      {tab === "menu" && (
        <>
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { label: "Total Items", value: totalItems, icon: UtensilsCrossed, bg: "bg-primary/5", border: "border-primary/20", color: "text-primary" },
              { label: "Categories", value: totalCats, icon: Layers, bg: "bg-blue-500/5", border: "border-blue-500/20", color: "text-blue-600" },
              { label: "Available", value: availableCount, icon: CheckCircle2, bg: "bg-green-500/5", border: "border-green-500/20", color: "text-green-600" },
              { label: "Unavailable", value: unavailableCount, icon: XCircle, bg: "bg-red-500/5", border: "border-red-500/20", color: "text-red-600" },
            ].map((s) => (
              <Card key={s.label} className={`${s.bg} ${s.border} border`}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{s.label}</p>
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  </div>
                  <s.icon className={`h-8 w-8 ${s.color} opacity-50`} />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search by name, description, category..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <Select value={catFilter} onValueChange={(v) => { setCatFilter(v); setPage(1); }}>
              <SelectTrigger className="md:w-52"><SelectValue placeholder="All Categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id!}>{c.icon ? `${c.icon} ` : ""}{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={availFilter} onValueChange={(v) => { setAvailFilter(v); setPage(1); }}>
              <SelectTrigger className="md:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="unavailable">Unavailable</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" size="sm" onClick={() => setAddCatOpen(true)}>Add Category</Button>
              <FoodItemDialog onSaved={reload} />
            </div>
          </div>

          {/* Items Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Image</th>
                      <th className="text-left p-3 font-medium">Name</th>
                      <th className="text-left p-3 font-medium">Category</th>
                      <th className="text-left p-3 font-medium">Price</th>
                      <th className="text-left p-3 font-medium">Available</th>
                      <th className="text-left p-3 font-medium">Featured</th>
                      <th className="text-left p-3 font-medium">Created</th>
                      <th className="text-right p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((item) => (
                      <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="p-3">
                          <div className="w-14 h-14 rounded-md overflow-hidden bg-muted">
                            {item.image ? (
                              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center"><ImageIcon className="h-5 w-5 text-muted-foreground/40" /></div>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-muted-foreground line-clamp-1 max-w-xs">{item.description}</div>
                        </td>
                        <td className="p-3"><Badge variant="outline" className="font-normal">{item.categoryName || "—"}</Badge></td>
                        <td className="p-3">
                          {item.complimentary || item.price === 0 ? (
                            <span className="text-green-600 font-medium text-sm">Complimentary</span>
                          ) : item.discountPrice ? (
                            <div className="flex flex-col">
                              <span className="text-xs text-muted-foreground line-through">₦{item.price.toLocaleString()}</span>
                              <span className="text-green-600 font-medium">₦{item.discountPrice.toLocaleString()}</span>
                            </div>
                          ) : (
                            <span className="font-medium">₦{item.price.toLocaleString()}</span>
                          )}
                        </td>
                        <td className="p-3">
                          <Switch checked={item.available} onCheckedChange={(v) => {
                            toggleItemAvailability(item.id!, v);
                            setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, available: v } : i));
                          }} />
                        </td>
                        <td className="p-3">
                          {item.featured ? (
                            <Badge className="bg-amber-500 hover:bg-amber-500 text-white border-0"><Star className="h-3 w-3 mr-1" />Chef&apos;s Special</Badge>
                          ) : "—"}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {item.createdAt?.toDate?.() ? item.createdAt.toDate().toLocaleDateString() : "—"}
                        </td>
                        <td className="p-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <FoodItemDialog item={item} onSaved={reload}
                                trigger={<DropdownMenuItem onSelect={(e) => e.preventDefault()}>Edit</DropdownMenuItem>}
                              />
                              <DropdownMenuItem onClick={() => handleDuplicate(item)}>
                                <Copy className="mr-2 h-4 w-4" /> Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toggleItemAvailability(item.id!, !item.available).then(reload)}>
                                {item.available ? <XCircle className="mr-2 h-4 w-4" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                                {item.available ? "Mark Unavailable" : "Mark Available"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget({ id: item.id!, type: "item" })}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                    {paged.length === 0 && (
                      <tr><td colSpan={8} className="text-center py-10 text-muted-foreground">
                        {items.length === 0 ? "No menu items yet. Click 'Add Food Item' to create one." : "No items match your filters."}
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t">
                  <span className="text-sm text-muted-foreground">
                    Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Orders Tab */}
      {tab === "orders" && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { label: "Today's Orders", value: todayOrders.length, icon: ShoppingCart, bg: "bg-primary/5", color: "text-primary" },
              { label: "Today's Revenue", value: `₦${todayRevenue.toLocaleString()}`, icon: CheckCircle2, bg: "bg-green-500/5", color: "text-green-600" },
              { label: "Total Orders", value: orders.length, icon: ClipboardList, bg: "bg-blue-500/5", color: "text-blue-600" },
            ].map((s) => (
              <Card key={s.label} className={`${s.bg} border`}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{s.label}</p>
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  </div>
                  <s.icon className={`h-8 w-8 ${s.color} opacity-50`} />
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Order #</th>
                      <th className="text-left p-3 font-medium">Unit</th>
                      <th className="text-left p-3 font-medium">Items</th>
                      <th className="text-left p-3 font-medium">Total</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Date</th>
                      <th className="text-right p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="p-3 font-mono font-bold">{order.orderNumber}</td>
                        <td className="p-3 font-medium">{order.unitName}</td>
                        <td className="p-3 text-sm max-w-xs truncate">{order.items.map((i) => i.name).join(", ")}</td>
                        <td className="p-3 font-bold">₦{order.totalAmount.toLocaleString()}</td>
                        <td className="p-3">
                          <Badge variant="outline" className={STATUS_COLORS[order.status]}>{order.status}</Badge>
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {order.createdAt?.toDate?.() ? order.createdAt.toDate().toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }) : "—"}
                        </td>
                        <td className="p-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setDocketData(order); setDocketDialogOpen(true); }}>
                                <ClipboardList className="mr-2 h-4 w-4" /> View / Print Docket
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel>Status</DropdownMenuLabel>
                              {(["pending", "preparing", "ready", "delivered"] as const).map((s) => (
                                <DropdownMenuItem key={s} disabled={order.status === s} onClick={() => handleStatusChange(order.id!, s)}>
                                  <span className={`h-2 w-2 rounded-full mr-2 ${
                                    s === "pending" ? "bg-amber-500" : s === "preparing" ? "bg-blue-500" : s === "ready" ? "bg-purple-500" : "bg-green-500"
                                  }`} />
                                  {s.charAt(0).toUpperCase() + s.slice(1)}
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget({ id: order.id!, type: "order" })}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Order
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                    {orders.length === 0 && (
                      <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">
                        <ClipboardList className="h-12 w-40 opacity-40 mx-auto mb-2" />
                        No orders yet. Click &apos;New Order&apos; to place one.
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* New Order Dialog */}
      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Place New Food Order</DialogTitle></DialogHeader>
          <FoodOrderForm
            rooms={rooms}
            bookings={bookings}
            onSubmit={() => { setOrderDialogOpen(false); reload(); }}
            onCancel={() => setOrderDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Docket Dialog */}
      <Dialog open={docketDialogOpen} onOpenChange={setDocketDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Docket — {docketData?.orderNumber}</DialogTitle>
          </DialogHeader>
          {docketData && <DocketPrint data={docketData} />}
        </DialogContent>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog open={addCatOpen} onOpenChange={setAddCatOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Category</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <Input placeholder="Category name" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} />
            <Input placeholder="Icon (emoji)" value={newCatIcon} onChange={(e) => setNewCatIcon(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setAddCatOpen(false)}>Cancel</Button>
            <Button onClick={handleAddCategory}>Create</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type === "item" ? "Food Item" : "Order"}</AlertDialogTitle>
            <AlertDialogDescription>Are you sure? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
