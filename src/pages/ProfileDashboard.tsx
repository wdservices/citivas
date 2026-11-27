import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, Building2, ShoppingBag, Home, Calendar, Megaphone,
  Plus, LayoutDashboard, MapPin, Trash2, Edit3, Ticket,
  ChevronRight, Loader2, FileText, Info, CalendarClock, Image as ImageIcon, Hotel, UtensilsCrossed
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { getDoc, doc } from "firebase/firestore";
import { useMyListings, useBusinessChildren, useUpdateDoc, useDeleteDoc, useMyEventOrders, useMyTicketOrders, useMyAttendedEvents } from "@/lib/useFirestore";
import ImageUpload from "@/components/ImageUpload";
import { AddressPicker } from "@/components/AddressPicker";
import { CreateListingWizard } from "@/components/CreateListingWizard";
import { type ListingKind } from "@/lib/listingSchema";
import { CLOUDINARY_FOLDERS, deleteImagesFromCloudinary, collectPublicIdsForListing } from "@/lib/cloudinary";
import { logActivity } from "@/lib/activityLog";
import { getMockImage } from "@/lib/mockImages";
import {
  NIGERIAN_STATES, STATE_CITIES, BUSINESS_CATEGORIES,
  PROPERTY_TYPES, EVENT_CATEGORIES, type NigerianState,
} from "@/lib/nigerianStates";

interface ListingItem {
  id: string;
  title: string;
  image: string;
  category?: string;
  type?: string;
  location?: string;
  price?: string;
  status?: string;
}

const ProfileDashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();

  const initialTab = searchParams.get("tab") || "overview";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [selectedBusinessTitle, setSelectedBusinessTitle] = useState<string | null>(null);

  // Centralized Create Listing Wizard state
  const [createOpen, setCreateOpen] = useState(searchParams.get("action") === "create");
  const [wizardDefaultType, setWizardDefaultType] = useState<ListingKind | "">("");
  const [wizardDefaultBusinessId, setWizardDefaultBusinessId] = useState<string>("individual");

  const openCreateWizard = (type: ListingKind | "" = "", businessId: string = "individual") => {
    setWizardDefaultType(type);
    setWizardDefaultBusinessId(businessId);
    setCreateOpen(true);
  };

  useEffect(() => {
    const action = searchParams.get("action");
    const type = searchParams.get("type");
    const tab = searchParams.get("tab");

    if (tab) {
      setActiveTab(tab);
    }

    if (action === "create") {
      if (type === "product" || type === "property" || type === "restaurant" || type === "event" || type === "business") {
        openCreateWizard(type);
      } else if (tab === "events") {
        openCreateWizard("event");
      } else {
        openCreateWizard("");
      }
    }
  }, [searchParams]);

  // ── Delete confirmation ──
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: string; title: string } | null>(null);
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0); // 0=closed, 1=first confirm, 2=second confirm
  const [deleting, setDeleting] = useState(false);

  // ── Edit mode ──
  const [editTarget, setEditTarget] = useState<{ id: string; type: string; data: any } | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  // ── Edit form fields ──
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editState, setEditState] = useState<NigerianState | "">("");
  const [editCity, setEditCity] = useState("");
  const [editStreetAddress, setEditStreetAddress] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editImagePublicId, setEditImagePublicId] = useState("");
  const [editMapLat, setEditMapLat] = useState<number | undefined>();
  const [editMapLon, setEditMapLon] = useState<number | undefined>();

  // Product-specific edit fields
  const [editProductPrice, setEditProductPrice] = useState("");
  const [editPromoPrice, setEditPromoPrice] = useState("");
  const [editProductCategory, setEditProductCategory] = useState("");

  // Event-specific edit fields
  const [editEventCategory, setEditEventCategory] = useState("");
  const [editEventStartDate, setEditEventStartDate] = useState("");
  const [editEventEndDate, setEditEventEndDate] = useState("");
  const [editEventStartTime, setEditEventStartTime] = useState("");
  const [editEventEndTime, setEditEventEndTime] = useState("");
  const [editEventVenue, setEditEventVenue] = useState("");
  const [editEventLocation, setEditEventLocation] = useState("");
  const [editTicketTypes, setEditTicketTypes] = useState<{ name: string; price: string; quantity: string }[]>([]);


  // ── User's businesses (for product/property linking) ──
  const { data: listingsData, isLoading: loadingListings } = useMyListings(user?.id || null);
  const myBusinesses = (listingsData?.businesses || []) as ListingItem[];
  const myProducts = (listingsData?.products || []) as ListingItem[];
  const myProperties = (listingsData?.properties || []) as ListingItem[];
  const myEvents = (listingsData?.events || []) as ListingItem[];

  // ── Hospitality mini-site check ──
  const hasMiniSite = myProperties.some((p: any) => p.miniSiteActive === true || p.status === 'Published' || p.status === 'Approved');

  // ── Children of selected business ──
  const { data: bizChildren, isLoading: loadingBizChildren } = useBusinessChildren(selectedBusinessId);
  const bizProducts = (bizChildren?.products || []) as ListingItem[];
  const bizProperties = (bizChildren?.properties || []) as ListingItem[];



  // ── Event analytics (organized events) ──
  const eventIds = myEvents.map((e) => e.id);
  const { data: allOrders = [] } = useMyEventOrders(user?.id || null, eventIds);

  // ── Attended events (events user has tickets for) ──
  const { data: myTicketOrders = [] } = useMyTicketOrders(user?.id || null);
  const attendedEventIds = [...new Set(myTicketOrders.map((o: any) => o.eventId).filter(Boolean))];
  const { data: attendedEvents = [] } = useMyAttendedEvents(user?.id || null, attendedEventIds);

  const eventAnalytics = useMemo(() => {
    let totalCapacity = 0;
    let totalRevenue = 0;
    const eventStats = myEvents.map((evt: any) => {
      const tickets = evt.ticketTypes || [];
      const capacity = tickets.reduce((s: number, t: any) => s + (Number(t.quantity) || 0), 0);
      const potentialRev = tickets.reduce((s: number, t: any) => s + (Number(t.price) || 0) * (Number(t.quantity) || 0), 0);
      const orders = allOrders.filter((o: any) => o.eventId === evt.id);
      const attendees = orders.map((o: any) => ({
        id: o.id || "",
        name: o.buyerName || o.buyerEmail || "Anonymous",
        email: o.buyerEmail || "",
        amount: Number(o.totalAmount) || Number(o.amount) || 0,
        tier: o.ticketTier || "General",
        quantity: Number(o.quantity) || 1,
        date: o.createdAt || "",
      }));
      const revenue = attendees.reduce((s: number, a: any) => s + a.amount, 0);
      totalCapacity += capacity;
      totalRevenue += revenue;
      return { id: evt.id, title: evt.title || "Untitled", date: evt.startDate || "", location: evt.location || "", capacity, attendees, potentialRevenue: potentialRev, actualRevenue: revenue, ticketTiers: tickets };
    });
    return { totalEvents: myEvents.length, totalCapacity, totalRevenue, totalAttendees: allOrders.length, eventStats };
  }, [myEvents, allOrders]);

  // ── Generate Event Report (PDF/CSV) ──
  const generateEventReport = () => {
    const lines: string[] = [];
    lines.push("CitivasNG — Event Report");
    lines.push(`Generated: ${new Date().toLocaleString()}`);
    lines.push("");
    lines.push(`Total Events: ${eventAnalytics.totalEvents}`);
    lines.push(`Total Capacity: ${eventAnalytics.totalCapacity.toLocaleString()}`);
    lines.push(`Total Attendees: ${eventAnalytics.totalAttendees}`);
    lines.push(`Total Revenue: ₦${eventAnalytics.totalRevenue.toLocaleString()}`);
    lines.push("");

    eventAnalytics.eventStats.forEach((evt, i) => {
      lines.push(`${i + 1}. ${evt.title}`);
      lines.push(`   Date: ${evt.date || "TBA"} | Location: ${evt.location || "TBA"}`);
      lines.push(`   Capacity: ${evt.capacity} | Attendees: ${evt.attendees.length} | Revenue: ₦${evt.actualRevenue.toLocaleString()}`);
      if (evt.attendees.length > 0) {
        lines.push("   Attendees:");
        evt.attendees.forEach((a, j) => {
          lines.push(`     ${j + 1}. ${a.name} (${a.email}) — ${a.tier} × ${a.quantity} — ₦${a.amount.toLocaleString()} — ${a.date ? new Date(a.date).toLocaleDateString() : "N/A"}`);
        });
      } else {
        lines.push("   No attendees yet");
      }
      lines.push("");
    });

    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `event-report-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Report downloaded", description: "Event report saved as CSV." });
  };

  // ── Cached mutations (auto-invalidate queries on success) ──
  const updateListing = useUpdateDoc("businesses");
  const updateProduct = useUpdateDoc("marketplace");
  const updateProperty = useUpdateDoc("house_listings");
  const updateEvent = useUpdateDoc("events");
  const deleteListing = useDeleteDoc("businesses");
  const deleteProduct = useDeleteDoc("marketplace");
  const deleteProperty = useDeleteDoc("house_listings");
  const deleteEvent = useDeleteDoc("events");
  const deleteTicketOrder = useDeleteDoc("ticket_orders");

  const getCollectionForType = (type: string) => {
    switch (type) {
      case "business":
      case "restaurant": return "businesses";
      case "event": return "events";
      case "product": return "marketplace";
      case "property": return "house_listings";
      default: return "businesses";
    }
  };

  const handleDeleteClick = (id: string, type: string, title: string) => {
    setDeleteTarget({ id, type, title });
    setDeleteStep(1);
  };

  const confirmDeleteStep1 = () => {
    setDeleteStep(2);
  };

  const confirmDeleteStep2 = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      // Best-effort: delete Cloudinary images
      try {
        const collectionName = getCollectionForType(deleteTarget.type);
        const snap = await getDoc(doc(db, collectionName, deleteTarget.id));
        if (snap.exists()) {
          const data = snap.data() as any;
          const publicIds = collectPublicIdsForListing(data);
          if (publicIds.length > 0) {
            await deleteImagesFromCloudinary(publicIds);
          }
        }
      } catch (e) {
        console.error("Cloudinary delete error (non-blocking):", e);
      }

      // Delete Firestore document
      if (deleteTarget.type === "product") {
        await deleteProduct.mutateAsync(deleteTarget.id);
      } else if (deleteTarget.type === "property") {
        await deleteProperty.mutateAsync(deleteTarget.id);
      } else if (deleteTarget.type === "event") {
        await deleteEvent.mutateAsync(deleteTarget.id);
      } else {
        await deleteListing.mutateAsync(deleteTarget.id);
      }

      // Log activity
      if (user) {
        logActivity({
          userId: user.id,
          userEmail: user.email,
          userName: user.name,
          action: deleteTarget.type === "event" ? "delete_event" : "delete_listing",
          targetType: deleteTarget.type as any,
          targetId: deleteTarget.id,
          targetName: deleteTarget.title,
          details: `Deleted ${deleteTarget.type}: ${deleteTarget.title}`,
        });
      }

      toast({ title: `"${deleteTarget.title}" deleted.` });
      setDeleteTarget(null);
      setDeleteStep(0);
    } catch (err) {
      console.error(err);
      toast({ title: "Failed to delete listing", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const cancelDelete = () => {
    setDeleteTarget(null);
    setDeleteStep(0);
  };

  const handleEditClick = async (item: ListingItem, type: string) => {
    const collectionName = getCollectionForType(type);
    try {
      const snap = await getDoc(doc(db, collectionName, item.id));
      if (!snap.exists()) {
        toast({ title: "Listing not found", variant: "destructive" });
        return;
      }
      const raw = snap.data() as any;
      setEditTarget({ id: item.id, type, data: raw });
      setEditTitle(raw.title || "");
      setEditDescription(raw.description || "");
      setEditCategory(raw.category || "");
      setEditState((raw.state as NigerianState) || "");
      setEditCity(raw.city || "");
      setEditStreetAddress(raw.streetAddress || "");
      setEditPhone(raw.phone || "");
      setEditImageUrl(raw.image || "");
      setEditImagePublicId(raw.imagePublicId || "");
      setEditMapLat(raw.lat || undefined);
      setEditMapLon(raw.lon || undefined);
      // Product-specific fields
      if (type === "product") {
        setEditProductPrice(String(raw.price || ""));
        setEditPromoPrice(String(raw.promoPrice || ""));
        setEditProductCategory(raw.productCategory || raw.category || "");
      }
      // Event-specific fields
      if (type === "event") {
        setEditEventCategory(raw.tags?.[0] || raw.category || "");
        setEditEventStartDate(raw.startDate || "");
        setEditEventEndDate(raw.endDate || "");
        setEditEventStartTime(raw.startTime || "");
        setEditEventEndTime(raw.endTime || "");
        setEditEventVenue(raw.venue || "");
        setEditEventLocation(raw.eventLocation || "");
        setEditTicketTypes((raw.ticketTypes || []).map((t: any) => ({
          name: t.name || "",
          price: String(t.price || ""),
          quantity: String(t.quantity || ""),
        })));
      }
      setEditOpen(true);
    } catch (err) {
      console.error(err);
      toast({ title: "Failed to load listing", variant: "destructive" });
    }
  };

  const handleUpdateListing = async () => {
    if (!editTarget || !editTitle.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    setEditSaving(true);
    try {
      const fullLocation = [editCity, editState].filter(Boolean).join(", ");
      const updateData: any = {
        title: editTitle.trim(),
        description: editDescription.trim(),
        category: editCategory,
        state: editState,
        city: editCity,
        streetAddress: editStreetAddress.trim(),
        phone: editPhone.trim(),
        image: editImageUrl,
        location: fullLocation,
        lat: editMapLat || null,
        lon: editMapLon || null,
      };
      if (editTarget.type === "product") {
        updateData.price = Number(editProductPrice) || 0;
        updateData.promoPrice = Number(editPromoPrice) || 0;
        updateData.productCategory = editProductCategory;
        await updateProduct.mutateAsync({ id: editTarget.id, data: updateData });
      } else if (editTarget.type === "event") {
        updateData.tags = [editEventCategory || "General"];
        updateData.startDate = editEventStartDate;
        updateData.endDate = editEventEndDate;
        updateData.startTime = editEventStartTime;
        updateData.endTime = editEventEndTime;
        updateData.venue = editEventVenue;
        updateData.eventLocation = editEventLocation;
        updateData.ticketTypes = editTicketTypes.filter(t => t.name.trim()).map(t => ({
          name: t.name,
          price: Number(t.price) || 0,
          quantity: Number(t.quantity) || 0,
        }));
        await updateEvent.mutateAsync({ id: editTarget.id, data: updateData });
      } else if (editTarget.type === "property") {
        await updateProperty.mutateAsync({ id: editTarget.id, data: updateData });
      } else {
        await updateListing.mutateAsync({ id: editTarget.id, data: updateData });
      }
      toast({ title: "Listing updated!" });
      if (user) {
        logActivity({ userId: user.id, userEmail: user.email, userName: user.name, action: editTarget.type === "event" ? "edit_event" : "edit_listing", targetType: editTarget.type as any, targetId: editTarget.id, targetName: editTitle, details: `Updated ${editTarget.type}: ${editTitle}` });
      }
      setEditOpen(false);
      setEditTarget(null);
    } catch (err) {
      console.error(err);
      toast({ title: "Failed to update listing", variant: "destructive" });
    } finally {
      setEditSaving(false);
    }
  };



  const ListingCard = ({ item, type }: { item: ListingItem; type: string }) => (
    <div className="bg-card border border-border/50 rounded-xl overflow-hidden hover:border-primary/30 transition-all duration-300 shadow-sm hover:shadow-md group">
      <div className="relative aspect-[3/2] overflow-hidden">
        <img
          src={item.image || getMockImage(item.category || item.type)}
          alt={item.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-100"
        />
        {item.status && (
          <Badge className={`absolute top-3 left-3 text-[9px] font-bold uppercase tracking-wider ${
            item.status === "Active" ? "bg-green-500 text-white" : "bg-yellow-500 text-white"
          }`}>
            {item.status}
          </Badge>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-bold text-sm text-foreground truncate mb-1">{item.title}</h3>
        {item.location && (
          <div className="flex items-center gap-1 text-muted-foreground text-xs mb-2">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{item.location}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          {item.price && <span className="font-bold text-sm text-primary">{item.price}</span>}
          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => handleEditClick(item, type)}
              className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleDeleteClick(item.id, type, item.title)}
              className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary via-primary to-primary/80 text-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Button variant="ghost" className="text-white hover:bg-white/20 mb-4 -ml-2" onClick={() => navigate("/explore")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <LayoutDashboard className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-3xl font-display font-extrabold">My Dashboard</h1>
                <p className="text-white/80 mt-1">Manage your listings and activity</p>
              </div>
            </div>
            <Button
              variant="secondary"
              className="bg-white text-primary hover:bg-white/90 font-bold shadow-lg flex items-center gap-2"
              onClick={() => openCreateWizard("")}
            >
              <Plus className="h-4 w-4" /> Create New
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-card border border-border/50 p-1 rounded-xl mb-8 w-fit">
            <TabsTrigger value="overview" className="rounded-lg font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4">Overview</TabsTrigger>
            <TabsTrigger value="listings" className="rounded-lg font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4">My Listings</TabsTrigger>
            <TabsTrigger value="events" className="rounded-lg font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4">My Events</TabsTrigger>
            <TabsTrigger value="ads" className="rounded-lg font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4">Ad Manager</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: Building2, label: "Businesses", count: myBusinesses.length, color: "primary" },
                { icon: ShoppingBag, label: "Products", count: myProducts.length, color: "accent" },
                { icon: Home, label: "Properties", count: myProperties.length, color: "success" },
                { icon: Calendar, label: "Events", count: myEvents.length, color: "primary" },
              ].map((stat) => (
                <Card key={stat.label} className="border-border/50">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-xl bg-${stat.color}/10 flex items-center justify-center`}>
                        <stat.icon className={`w-5 h-5 text-${stat.color}`} />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{stat.label}</span>
                    </div>
                    {loadingListings ? (
                      <Skeleton className="h-8 w-12" />
                    ) : (
                      <p className="text-2xl font-extrabold">{stat.count}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Hospitality Entry Card */}
            {hasMiniSite && (
              <button
                onClick={() => navigate("/hospitality-dashboard")}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border/50 bg-card hover:border-primary/40 hover:bg-primary/5 transition-all text-left"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Hotel className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">Property Dashboard</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Manage reservations, revenue, rooms & bookings</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            )}

            <Card className="border-border/50">
              <CardContent className="p-5">
                <h3 className="font-bold mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {[
                    { icon: Home, label: "List Property", type: "property" as const },
                    { icon: ShoppingBag, label: "Post Product", type: "product" as const },
                    { icon: UtensilsCrossed, label: "Add Restaurant", type: "restaurant" as const },
                    { icon: Calendar, label: "Create Event", type: "event" as const },
                    { icon: Building2, label: "Register Business", type: "business" as const },
                  ].map((action) => (
                    <button
                      key={action.type}
                      onClick={() => openCreateWizard(action.type)}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all"
                    >
                      <action.icon className="w-6 h-6 text-primary" />
                      <span className="text-xs font-bold text-muted-foreground">{action.label}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* My Listings */}
          <TabsContent value="listings" className="space-y-6">
            {!selectedBusinessId ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold">My Businesses ({myBusinesses.length})</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">Click a business to manage its products & rooms</p>
                  </div>
                  <Button size="sm" className="rounded-xl font-bold" onClick={() => openCreateWizard("business")}>
                    <Plus className="w-4 h-4 mr-1" /> Register Business
                  </Button>
                </div>
                {loadingListings ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="bg-card rounded-2xl border border-border/50 overflow-hidden animate-pulse">
                        <div className="aspect-[4/3] bg-muted/60" />
                        <div className="p-4 space-y-2">
                          <div className="h-4 bg-muted/60 rounded w-3/4" />
                          <div className="h-3 bg-muted/40 rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : myBusinesses.length === 0 ? (
                  <div className="text-center py-16 bg-card/30 rounded-2xl border border-dashed border-border">
                    <Building2 className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground mb-3">No businesses yet</p>
                    <Button size="sm" variant="outline" onClick={() => openCreateWizard("business")}>
                      <Plus className="w-4 h-4 mr-1" /> Register Your First Business
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {myBusinesses.map((item) => (
                      <div
                        key={item.id}
                        className="bg-card border border-border/50 rounded-xl overflow-hidden hover:border-primary/30 transition-all duration-300 shadow-sm hover:shadow-md group"
                      >
                        <div
                          className="cursor-pointer"
                          onClick={() => { setSelectedBusinessId(item.id); setSelectedBusinessTitle(item.title); }}
                        >
                          <div className="relative aspect-[3/2] overflow-hidden">
                            <img
                              src={item.image || getMockImage(item.category)}
                              alt={item.title}
                              className="w-full h-full object-contain bg-muted transition-transform duration-500 group-hover:scale-100"
                            />
                            {item.category && (
                              <Badge className="absolute top-3 left-3 text-[9px] font-bold uppercase tracking-wider bg-primary text-primary-foreground">
                                {item.category}
                              </Badge>
                            )}
                          </div>
                          <div className="p-3">
                            <h3 className="font-bold text-sm text-foreground truncate mb-1">{item.title}</h3>
                            {item.location && (
                              <div className="flex items-center gap-1 text-muted-foreground text-xs mb-2">
                                <MapPin className="w-3 h-3 shrink-0" />
                                <span className="truncate">{item.location}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1 text-xs text-primary font-semibold">
                              <span>Manage workspace</span>
                              <ChevronRight className="w-3 h-3" />
                            </div>
                          </div>
                        </div>
                        <div className="px-3 pb-3 flex justify-end gap-1">
                          <button
                            onClick={() => handleEditClick(item, "business")}
                            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(item.id, "business", item.title)}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* My Products Section */}
                <div className="pt-8 border-t border-border/50">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold">My Products & Services ({myProducts.length})</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">Products, deals, and items listed on Citivas Marketplace</p>
                    </div>
                    <Button
                      size="sm"
                      className="rounded-xl font-bold"
                      onClick={() => openCreateWizard("product")}
                    >
                      <Plus className="w-4 h-4 mr-1" /> Post a Product
                    </Button>
                  </div>
                  {myProducts.length === 0 ? (
                    <div className="text-center py-10 bg-card/30 rounded-2xl border border-dashed border-border">
                      <ShoppingBag className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
                      <p className="text-sm text-muted-foreground mb-3">No products posted yet</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openCreateWizard("product")}
                      >
                        <Plus className="w-4 h-4 mr-1" /> Post Your First Product
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {myProducts.map((item) => (
                        <ListingCard key={item.id} item={item} type="product" />
                      ))}
                    </div>
                  )}
                </div>

                {/* My Properties Section */}
                <div className="pt-8 border-t border-border/50">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold">My Properties & Stays ({myProperties.length})</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">Shortlets, lands, and commercial spaces</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl font-bold"
                      onClick={() => openCreateWizard("property")}
                    >
                      <Plus className="w-4 h-4 mr-1" /> List a Property
                    </Button>
                  </div>
                  {myProperties.length === 0 ? (
                    <div className="text-center py-10 bg-card/30 rounded-2xl border border-dashed border-border">
                      <Home className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
                      <p className="text-sm text-muted-foreground mb-3">No properties listed yet</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openCreateWizard("property")}
                      >
                        <Plus className="w-4 h-4 mr-1" /> List Your First Property
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {myProperties.map((item) => (
                        <ListingCard key={item.id} item={item} type="property" />
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Business Workspace */}
                <div className="flex items-center gap-3 mb-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => { setSelectedBusinessId(null); setSelectedBusinessTitle(null); }}
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back to Businesses
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold">{selectedBusinessTitle}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">Products & rooms in this business</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl font-bold border-primary/30 text-primary hover:bg-primary/10"
                      onClick={() => {
                        navigate(`/restaurant-wizard?businessId=${selectedBusinessId}`);
                      }}
                    >
                      <UtensilsCrossed className="w-4 h-4 mr-1" /> Restaurant Wizard & Menu
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl font-bold"
                      onClick={() => openCreateWizard("product", selectedBusinessId!)}
                    >
                      <ShoppingBag className="w-4 h-4 mr-1" /> Add Product
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl font-bold"
                      onClick={() => openCreateWizard("property", selectedBusinessId!)}
                    >
                      <Home className="w-4 h-4 mr-1" /> Add Room
                    </Button>
                  </div>
                </div>

                {loadingBizChildren ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="bg-card rounded-2xl border border-border/50 overflow-hidden animate-pulse">
                        <div className="aspect-[4/3] bg-muted/60" />
                        <div className="p-4 space-y-2">
                          <div className="h-4 bg-muted/60 rounded w-3/4" />
                          <div className="h-3 bg-muted/40 rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {/* Products Section */}
                    <div>
                      <h4 className="font-bold text-sm text-foreground mb-3">Products ({bizProducts.length})</h4>
                      {bizProducts.length === 0 ? (
                        <div className="text-center py-10 bg-card/30 rounded-2xl border border-dashed border-border">
                          <ShoppingBag className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                          <p className="text-sm text-muted-foreground mb-2">No products yet</p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openCreateWizard("product", selectedBusinessId!)}
                          >
                            <Plus className="w-4 h-4 mr-1" /> Add First Product
                          </Button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {bizProducts.map((item) => (
                            <ListingCard key={item.id} item={item} type="product" />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Properties/Rooms Section */}
                    <div>
                      <h4 className="font-bold text-sm text-foreground mb-3">Rooms / Properties ({bizProperties.length})</h4>
                      {bizProperties.length === 0 ? (
                        <div className="text-center py-10 bg-card/30 rounded-2xl border border-dashed border-border">
                          <Home className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                          <p className="text-sm text-muted-foreground mb-2">No rooms listed yet</p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openCreateWizard("property", selectedBusinessId!)}
                          >
                            <Plus className="w-4 h-4 mr-1" /> Add First Room
                          </Button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {bizProperties.map((item) => (
                            <ListingCard key={item.id} item={item} type="property" />
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </TabsContent>

          {/* My Events */}
          <TabsContent value="events" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">My Events ({myEvents.length})</h3>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl font-bold"
                  onClick={generateEventReport}
                  disabled={myEvents.length === 0}
                >
                  <FileText className="w-4 h-4 mr-1" /> Report
                </Button>
                <Button size="sm" className="rounded-xl font-bold" onClick={() => openCreateWizard("event")}>
                  <Plus className="w-4 h-4 mr-1" /> Create Event
                </Button>
              </div>
            </div>

            {/* Analytics Cards */}
            {myEvents.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-card border border-border/50 rounded-xl p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Total Events</p>
                  <p className="text-2xl font-extrabold text-foreground">{eventAnalytics.totalEvents}</p>
                </div>
                <div className="bg-card border border-border/50 rounded-xl p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Total Capacity</p>
                  <p className="text-2xl font-extrabold text-foreground">{eventAnalytics.totalCapacity.toLocaleString()}</p>
                </div>
                <div className="bg-card border border-border/50 rounded-xl p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Attendees</p>
                  <p className="text-2xl font-extrabold text-primary">{eventAnalytics.totalAttendees}</p>
                </div>
                <div className="bg-card border border-border/50 rounded-xl p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Revenue</p>
                  <p className="text-2xl font-extrabold text-green-600">₦{eventAnalytics.totalRevenue.toLocaleString()}</p>
                </div>
              </div>
            )}

            {/* Per-Event Breakdown */}
            {eventAnalytics.eventStats.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-bold text-sm text-foreground">Event Breakdown</h4>
                {eventAnalytics.eventStats.map((evt) => (
                  <div key={evt.id} className="bg-card border border-border/50 rounded-xl p-4 hover:border-primary/30 transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h5 className="font-bold text-sm text-foreground truncate">{evt.title}</h5>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {evt.date && <span>{new Date(evt.date).toLocaleDateString()}</span>}
                          {evt.location && <span className="truncate">{evt.location}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-center">
                          <p className="text-[10px] font-bold uppercase text-muted-foreground">Capacity</p>
                          <p className="font-bold text-sm">{evt.capacity}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] font-bold uppercase text-muted-foreground">Attendees</p>
                          <p className="font-bold text-sm text-primary">{evt.attendees.length}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] font-bold uppercase text-muted-foreground">Revenue</p>
                          <p className="font-bold text-sm text-green-600">₦{evt.actualRevenue.toLocaleString()}</p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEditClick({ id: evt.id, title: evt.title, image: "", category: "event" }, "event")}
                            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(evt.id, "event", evt.title)}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                    {evt.ticketTiers.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground mb-2">Ticket Tiers</p>
                        <div className="flex flex-wrap gap-2">
                          {evt.ticketTiers.map((tier: any, i: number) => (
                            <span key={i} className="px-2.5 py-1 bg-accent text-xs rounded-full font-medium">
                              {tier.name || "Tier"} — ₦{Number(tier.price || 0).toLocaleString()} × {Number(tier.quantity || 0)} seats
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {evt.attendees.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground mb-2">Attendees ({evt.attendees.length})</p>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {evt.attendees.map((a: any, i: number) => (
                            <div key={i} className="flex items-center justify-between gap-3 p-2 rounded-lg bg-accent/30 text-xs">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-foreground truncate">{a.name}</p>
                                {a.email && <p className="text-muted-foreground truncate">{a.email}</p>}
                              </div>
                              <div className="text-right shrink-0">
                                <p className="font-bold text-green-600">₦{a.amount.toLocaleString()}</p>
                                <p className="text-muted-foreground">{a.tier} × {a.quantity}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Attended Events */}
            {attendedEvents.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-border/50">
                <h4 className="font-bold text-sm text-foreground">My Tickets ({attendedEvents.length})</h4>
                {attendedEvents.map((evt: any) => {
                  const myOrder = myTicketOrders.find((o: any) => o.eventId === evt.id);
                  return (
                    <div key={evt.id} className="bg-card border border-border/50 rounded-xl p-4 hover:border-primary/30 transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h5 className="font-bold text-sm text-foreground truncate">{evt.title || "Untitled Event"}</h5>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            {evt.startDate && <span>{new Date(evt.startDate).toLocaleDateString()}</span>}
                            {evt.location && <span className="truncate">{evt.location}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-center">
                            <p className="text-[10px] font-bold uppercase text-muted-foreground">My Ticket</p>
                            <p className="font-bold text-sm text-primary">{myOrder?.ticketTier || "General"}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] font-bold uppercase text-muted-foreground">Paid</p>
                            <p className="font-bold text-sm text-green-600">₦{Number(myOrder?.amount || 0).toLocaleString()}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] font-bold uppercase text-muted-foreground">Qty</p>
                            <p className="font-bold text-sm">{Number(myOrder?.quantity || 1)}</p>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteTicketOrder.mutate(myOrder.id); }}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                            aria-label="Cancel ticket"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {loadingListings ? (
              <div className="space-y-4" aria-busy="true" aria-label="Loading events">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-card border border-border/50 rounded-xl p-4 space-y-2">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-7 w-14" />
                    </div>
                  ))}
                </div>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-card border border-border/50 rounded-xl p-4 flex items-center justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                    <div className="flex gap-4">
                      <Skeleton className="h-8 w-14" />
                      <Skeleton className="h-8 w-14" />
                    </div>
                  </div>
                ))}
              </div>
            ) : myEvents.length === 0 && attendedEvents.length === 0 && (
              <div className="text-center py-16 bg-card/30 rounded-2xl border border-dashed border-border">
                <p className="text-muted-foreground mb-3">No events yet</p>
                <Button size="sm" variant="outline" onClick={() => openCreateWizard("event")}>
                  <Plus className="w-4 h-4 mr-1" /> Create Your First Event
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Ad Manager */}
          <TabsContent value="ads" className="space-y-6">
            <div className="text-center py-16 bg-card/30 rounded-2xl border border-dashed border-border">
              <Megaphone className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <h3 className="text-lg font-bold mb-2">Ad Manager</h3>
              <p className="text-muted-foreground text-sm mb-4">Promote your listings to reach more people</p>
              <Button onClick={() => navigate("/run-ads")}>
                <Megaphone className="w-4 h-4 mr-2" /> Start Advertising
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Centralized Multi-Step Create Listing Wizard ── */}
      <CreateListingWizard
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultType={wizardDefaultType}
        defaultBusinessId={wizardDefaultBusinessId}
        myBusinesses={myBusinesses.map((b: any) => ({
          id: b.id,
          title: b.title,
          location: b.location,
          state: b.state,
          city: b.city,
        }))}
      />

      {/* ── Delete Confirmation: Step 1 ── */}
      <Dialog open={deleteStep === 1} onOpenChange={(open) => { if (!open) cancelDelete(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Delete "{deleteTarget?.title}"?</DialogTitle>
            <DialogDescription>
              This action can be undone, but the listing will be removed from public view immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={cancelDelete}>Cancel</Button>
            <Button variant="destructive" className="flex-1 rounded-xl font-bold" onClick={confirmDeleteStep1}>
              Yes, Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation: Step 2 (final) ── */}
      <Dialog open={deleteStep === 2} onOpenChange={(open) => { if (!open) cancelDelete(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-destructive">Final Confirmation</DialogTitle>
            <DialogDescription>
              Are you absolutely sure? This will permanently delete <strong>"{deleteTarget?.title}"</strong>. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={cancelDelete}>Cancel</Button>
            <Button variant="destructive" className="flex-1 rounded-xl font-bold" onClick={confirmDeleteStep2} disabled={deleting}>
              {deleting ? (
                <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</span>
              ) : (
                "Delete Permanently"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editTarget?.type === "business" && "Edit Business"}
              {editTarget?.type === "product" && "Edit Product"}
              {editTarget?.type === "property" && "Edit Property"}
              {editTarget?.type === "event" && "Edit Event"}
            </DialogTitle>
            <DialogDescription>Update your listing details below.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {editTarget?.type !== "event" && (
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Title *</Label>
              <Input className="mt-1.5" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            )}

            {editTarget?.type === "business" && (
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Category</Label>
                <Select value={editCategory} onValueChange={setEditCategory}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {BUSINESS_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {editTarget?.type === "property" && (
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Property Type</Label>
                <Select value={editCategory} onValueChange={setEditCategory}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Event-specific fields */}
            {editTarget?.type === "event" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* ── Left Column: Form Fields ── */}
                <div className="md:col-span-2 space-y-4">
                  {/* General Information */}
                  <div className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
                      <Info className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-bold uppercase tracking-wider">General Information</h3>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Event Title *</Label>
                        <Input className="mt-1.5" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="e.g. GDG Port Harcourt" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Event Category</Label>
                          <Select value={editEventCategory} onValueChange={setEditEventCategory}>
                            <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select category" /></SelectTrigger>
                            <SelectContent>
                              {EVENT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Venue Name</Label>
                          <Input className="mt-1.5" value={editEventVenue} onChange={(e) => setEditEventVenue(e.target.value)} placeholder="e.g. Techcreek" />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</Label>
                        <Textarea className="mt-1.5" rows={3} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Describe your event..." />
                      </div>
                    </div>
                  </div>

                  {/* Schedule & Contact */}
                  <div className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
                      <CalendarClock className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-bold uppercase tracking-wider">Schedule & Contact</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Start Date</Label>
                          <Input type="date" className="mt-1.5" value={editEventStartDate} onChange={(e) => setEditEventStartDate(e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">End Date</Label>
                          <Input type="date" className="mt-1.5" value={editEventEndDate} onChange={(e) => setEditEventEndDate(e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">State</Label>
                          <Select value={editState} onValueChange={(v) => { setEditState(v as NigerianState); setEditCity(""); }}>
                            <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select state" /></SelectTrigger>
                            <SelectContent>
                              {NIGERIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">City / Area</Label>
                          <Select value={editCity} onValueChange={setEditCity} disabled={!editState}>
                            <SelectTrigger className="mt-1.5"><SelectValue placeholder={editState ? "Select area" : "Select state first"} /></SelectTrigger>
                            <SelectContent>
                              {(STATE_CITIES[editState] || []).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Start Time</Label>
                          <Input type="time" className="mt-1.5" value={editEventStartTime} onChange={(e) => setEditEventStartTime(e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">End Time</Label>
                          <Input type="time" className="mt-1.5" value={editEventEndTime} onChange={(e) => setEditEventEndTime(e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Contact Phone</Label>
                          <Input className="mt-1.5" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="Enter phone number" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Ticket Settings */}
                  <div className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
                      <Ticket className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-bold uppercase tracking-wider">Ticket Settings</h3>
                    </div>
                    <div className="space-y-2">
                      {editTicketTypes.length > 0 && (
                        <div className="grid grid-cols-12 gap-2 px-1">
                          <span className="col-span-5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Tier Name</span>
                          <span className="col-span-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Price (₦)</span>
                          <span className="col-span-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Capacity</span>
                          <span className="col-span-1" />
                        </div>
                      )}
                      {editTicketTypes.map((tier, i) => (
                        <div key={i} className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-5">
                            <Input placeholder="e.g. Regular" value={tier.name} onChange={(e) => { const copy = [...editTicketTypes]; copy[i] = { ...copy[i], name: e.target.value }; setEditTicketTypes(copy); }} />
                          </div>
                          <div className="col-span-3">
                            <Input type="number" placeholder="0" value={tier.price} onChange={(e) => { const copy = [...editTicketTypes]; copy[i] = { ...copy[i], price: e.target.value }; setEditTicketTypes(copy); }} />
                          </div>
                          <div className="col-span-3">
                            <Input type="number" placeholder="100" value={tier.quantity} onChange={(e) => { const copy = [...editTicketTypes]; copy[i] = { ...copy[i], quantity: e.target.value }; setEditTicketTypes(copy); }} />
                          </div>
                          <div className="col-span-1 flex justify-center">
                            <button onClick={() => setEditTicketTypes(editTicketTypes.filter((_, j) => j !== i))} className="p-2 text-destructive hover:bg-destructive/10 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                      ))}
                      <Button type="button" variant="outline" className="w-full mt-2 border-dashed" onClick={() => setEditTicketTypes([...editTicketTypes, { name: "", price: "0", quantity: "100" }])}>
                        <Plus className="w-4 h-4 mr-1" /> Add Another Ticket Tier
                      </Button>
                    </div>
                  </div>
                </div>

                {/* ── Right Column: Banner + Map ── */}
                <div className="space-y-4">
                  {/* Event Banner */}
                  <div className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Event Banner</h3>
                      <span className="text-xs text-primary font-medium flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Change</span>
                    </div>
                    <ImageUpload
                      onUploadSuccess={(r) => { setEditImageUrl(r.secureUrl); setEditImagePublicId(r.publicId); }}
                      folder={CLOUDINARY_FOLDERS.BUSINESSES}
                      currentImage={editImageUrl}
                      buttonText="Upload Banner"
                    />
                    <p className="text-xs text-muted-foreground text-center mt-2">Recommended size: 1200 × 630 px</p>
                  </div>

                  {/* Map Location */}
                  <div className="rounded-xl border border-border bg-card p-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Map Location</h3>
                    <AddressPicker
                      onLocationConfirmed={(data) => { setEditEventLocation(data.address); setEditMapLat(data.lat); setEditMapLon(data.lon); }}
                      initialAddress={editEventLocation || editStreetAddress}
                      initialLat={editMapLat}
                      initialLon={editMapLon}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Product-specific fields */}
            {editTarget?.type === "product" && (
              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Price (₦)</Label>
                  <Input type="number" className="mt-1.5" value={editProductPrice} onChange={(e) => setEditProductPrice(e.target.value)} placeholder="e.g. 50000" />
                </div>
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Promo Price (₦)</Label>
                  <Input type="number" className="mt-1.5" value={editPromoPrice} onChange={(e) => setEditPromoPrice(e.target.value)} placeholder="Optional" />
                </div>
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Category</Label>
                  <Select value={editProductCategory} onValueChange={setEditProductCategory}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {["Electronics", "Fashion", "Home & Garden", "Vehicles", "Property", "Health & Beauty", "Sports", "Books", "Other"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Location fields for business, property only (events have these in their own section) */}
            {(editTarget?.type === "business" || editTarget?.type === "property") && (
              <>
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">State</Label>
                  <Select value={editState} onValueChange={(v) => { setEditState(v as NigerianState); setEditCity(""); }}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select state" /></SelectTrigger>
                    <SelectContent>
                      {NIGERIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {editState && (
                  <div>
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">City / Area</Label>
                    <Select value={editCity} onValueChange={setEditCity}>
                      <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select area" /></SelectTrigger>
                      <SelectContent>
                        {(STATE_CITIES[editState] || []).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Location on Map</Label>
                  <p className="text-xs text-muted-foreground mt-1 mb-2">Update address and pin location</p>
                  <AddressPicker
                    onLocationConfirmed={(data) => { setEditStreetAddress(data.address); setEditMapLat(data.lat); setEditMapLon(data.lon); }}
                    initialAddress={editStreetAddress}
                    initialLat={editMapLat}
                    initialLon={editMapLon}
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Phone</Label>
                  <Input className="mt-1.5" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                </div>
              </>
            )}

            {editTarget?.type !== "event" && (
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</Label>
              <Textarea className="mt-1.5" rows={3} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
            </div>
            )}

            {editTarget?.type !== "event" && (
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cover Image</Label>
              <ImageUpload
                onUploadSuccess={(r) => { setEditImageUrl(r.secureUrl); setEditImagePublicId(r.publicId); }}
                folder={CLOUDINARY_FOLDERS.BUSINESSES}
                currentImage={editImageUrl}
                buttonText="Change Cover"
              />
            </div>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t border-border">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setEditOpen(false)}>Cancel Changes</Button>
            <Button className="flex-1 rounded-xl font-bold" onClick={handleUpdateListing} disabled={editSaving}>
              {editSaving ? (
                <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Saving...</span>
              ) : (
                editTarget?.type === "event" ? "Update Event Details" : "Save Changes"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfileDashboard;
