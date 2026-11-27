import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useHouseListings, useUpdateDoc, usePropertyBookings } from "@/lib/useFirestore";
import QRCode from "react-qr-code";
import { useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { doc, deleteDoc } from "firebase/firestore";
import {
  LayoutDashboard, TrendingUp, Hotel, Users, FileText, HelpCircle, LogOut,
  Calendar, DollarSign, Key, Plus, Copy, Info, AlertTriangle, ArrowUp,
  Download, ArrowDown, Bed, BarChart3, Banknote, Percent, Search,
  Settings, Clock, CheckCircle2, Upload, Filter, ChevronRight, MoreHorizontal,
  ExternalLink, Eye, FileSpreadsheet, X, ChevronLeft, ChevronDown,
  DoorOpen, Wrench, Sparkles, User, Phone, Mail, MapPin, Star, Globe, MessageCircle,
  Send, CalendarDays, AlertCircle, TrendingDown, RotateCcw, Edit3, Trash2, Save, Lock, UtensilsCrossed,
} from "lucide-react";
import AdminFoodMenu from "./admin/FoodMenu";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminDashboardSkeleton } from "@/components/ui/ListingSkeletons";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Overview" },
  { icon: TrendingUp, label: "Performance" },
  { icon: Hotel, label: "Inventory" },
  { icon: UtensilsCrossed, label: "Food Menu" },
  { icon: FileText, label: "Reports" },
  { icon: Settings, label: "Settings" },
];

const STATS = [
  { label: "Upcoming Reservations", value: "12", icon: Calendar, iconColor: "text-primary", sub: "Next 7 days", subColor: "text-success", subIcon: ArrowUp },
  { label: "Current Occupancy", value: "85%", icon: Hotel, iconColor: "text-primary", sub: "17 / 20 Units filled", subColor: "text-muted-foreground", subIcon: null },
  { label: "Monthly Revenue", value: "\u20A642.5k", icon: DollarSign, iconColor: "text-success", sub: "+12% vs last month", subColor: "text-success", subIcon: TrendingUp },
  { label: "Total Listings", value: "20", icon: Key, iconColor: "text-primary", sub: "Across 3 properties", subColor: "text-muted-foreground", subIcon: null },
];

const RESERVATIONS = [
  { name: "John Doe", initials: "JD", ref: "#RES-092", property: "Oceanview Villa 1", dates: "Oct 12 - Oct 15", nights: 3, status: "Confirmed", bg: "bg-primary text-primary-foreground" },
  { name: "Alice Smith", initials: "AS", ref: "#RES-091", property: "Downtown Loft B", dates: "Oct 14 - Oct 18", nights: 4, status: "Pending Payment", bg: "bg-muted text-foreground" },
  { name: "Michael Johnson", initials: "MJ", ref: "#RES-090", property: "Mountain Cabin", dates: "Oct 20 - Oct 25", nights: 5, status: "Confirmed", bg: "bg-primary text-primary-foreground" },
];

const ALERTS = [
  { icon: Info, iconColor: "text-blue-500", title: "New message from guest", desc: "Alice Smith is asking about early check-in." },
  { icon: AlertTriangle, iconColor: "text-destructive", title: "Payment failed", desc: "Deposit for RES-090 was declined." },
];

const PERF_KPIS = [
  { label: "Average Daily Rate (ADR)", value: "\u20A646,500", prev: "\u20A641,400", change: "+12.4%", up: true, icon: Banknote, color: "text-primary", barColor: "bg-primary" },
  { label: "Revenue Per Available Room", value: "\u20A634,600", prev: "\u20A631,900", change: "+8.2%", up: true, icon: BarChart3, color: "text-secondary-foreground", barColor: "bg-secondary-foreground" },
  { label: "Occupancy Rate", value: "84.2%", prev: "86.3%", change: "-2.1%", up: false, icon: Percent, color: "text-orange-600", barColor: "bg-orange-600" },
];

const PERF_ROOMS = [
  { type: "Executive Suite", units: 12, bedIcon: "king", occupancy: "92.4%", avgRate: "\u20A668,000", revenue: "\u20A620,200,000", status: "High Demand", statusColor: "bg-emerald-50 text-emerald-700" },
  { type: "Deluxe Double", units: 24, bedIcon: "double", occupancy: "78.1%", avgRate: "\u20A645,500", revenue: "\u20A613,350,000", status: "Stable", statusColor: "bg-amber-50 text-amber-700" },
  { type: "Standard Queen", units: 40, bedIcon: "single", occupancy: "65.3%", avgRate: "\u20A631,700", revenue: "\u20A67,320,000", status: "Underperforming", statusColor: "bg-red-50 text-red-600" },
];

const PERF_BENCHMARK = [
  { name: "Grand Imperial Hotel", occupancy: 89 },
  { name: "The Urban Loft", occupancy: 76 },
  { name: "Boutique Suites (You)", occupancy: 84, isYou: true },
];

const ROOM_OPTIONS = [
  { label: "Deluxe King Suite - Room 402", pricePerNight: 240 },
  { label: "Urban Twin Room - Room 215", pricePerNight: 180 },
  { label: "Executive Penthouse - Room 1001", pricePerNight: 450 },
  { label: "Standard Single - Room 108", pricePerNight: 120 },
];

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export default function HospitalityDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: allHouseListings = [], isLoading: loadingListings } = useHouseListings();
  const updateProperty = useUpdateDoc("house_listings");
  const qc = useQueryClient();

  // Filter to current user's listings
  const myProperties = useMemo(
    () => allHouseListings.filter((l: any) => l.ownerId === user?.id || l.userId === user?.id),
    [allHouseListings, user?.id]
  );
  const publishedMiniSite = myProperties.find((p: any) => p.miniSiteActive === true || p.status === 'Published' || p.status === 'Approved') as any;
  const primaryProperty = publishedMiniSite || null;

  const propertyName = primaryProperty?.title || "Your Property";
  const propertySlug = propertyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
  // Direct booking link — localhost: /property/slug, prod will be citivas.com/slug (via /property/slug also works)
  const bookingUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://citivas.com'}/property/${propertySlug}`;
  const displayBookingUrl = bookingUrl.replace(/^https?:\/\//, '');

  // Editable room data from Firestore
  const rooms = primaryProperty?.rooms || [];
  const [editingRoom, setEditingRoom] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editName, setEditName] = useState("");

  // Book for a Guest modal
  const [bookingOpen, setBookingOpen] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("");
  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Real bookings from Firestore
  const { data: realBookings = [], isLoading: loadingBookings } = usePropertyBookings(user?.id || null);

  const [activeNav, setActiveNav] = useState("Overview");
  const [resTab, setResTab] = useState<"Upcoming" | "Current" | "Checked-out">("Upcoming");
  const [copied, setCopied] = useState(false);
  const [perfPeriod, setPerfPeriod] = useState<"Daily" | "Weekly" | "Monthly" | "Yearly">("Daily");
  const [compareToggle, setCompareToggle] = useState(true);
  const [invFilter, setInvFilter] = useState("All Rooms");

  // Settings state
  const [vatEnabled, setVatEnabled] = useState(primaryProperty?.vatEnabled || false);
  const [vatRate, setVatRate] = useState(String(primaryProperty?.vatRate || "7.5"));
  const [settingsPhone, setSettingsPhone] = useState(primaryProperty?.phone || "");
  const [settingsWhatsapp, setSettingsWhatsapp] = useState(primaryProperty?.whatsapp || "");
  const [settingsEmail, setSettingsEmail] = useState(primaryProperty?.contactEmail || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteStep, setDeleteStep] = useState(0);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Derive stats from real property data — show 0 when no transactions (brand new mini-site)
  const totalUnits = rooms.reduce((sum: number, r: any) => sum + (r.quantity || 1), 0) || 0;
  const minPrice = rooms.filter((r: any) => r.pricePerNight > 0).length > 0
    ? Math.min(...rooms.filter((r: any) => r.pricePerNight > 0).map((r: any) => r.pricePerNight))
    : 0;
  // realBookings comes from usePropertyBookings(user?.id) — defined below, so we compute stats after it; placeholder here will be overwritten
  const bookingsCount = (typeof realBookings !== 'undefined' ? (realBookings as any[]).length : 0);
  const monthlyRevenue = (typeof realBookings !== 'undefined' ? (realBookings as any[]).reduce((s: number, b: any) => s + (Number(b.totalPaid) || 0), 0) : 0);
  // Default to 0 — will be re-derived below once realBookings is available
  const stats = [
    { label: "Upcoming Reservations", value: String(bookingsCount || 0), icon: Calendar, iconColor: "text-primary", sub: bookingsCount ? "Next 7 days" : "No bookings yet", subColor: bookingsCount ? "text-success" : "text-muted-foreground", subIcon: bookingsCount ? ArrowUp : null },
    { label: "Current Occupancy", value: totalUnits ? (bookingsCount ? "85%" : "0%") : "0%", icon: Hotel, iconColor: "text-primary", sub: totalUnits ? (bookingsCount ? `${Math.min(bookingsCount, totalUnits)} / ${totalUnits} Units filled` : `0 / ${totalUnits} Units filled`) : "No units", subColor: "text-muted-foreground", subIcon: null },
    { label: "Monthly Revenue", value: monthlyRevenue ? `\u20A6${(monthlyRevenue / 1000).toFixed(0)}k` : "\u20A60", icon: DollarSign, iconColor: "text-success", sub: monthlyRevenue ? "+12% vs last month" : "No revenue yet", subColor: monthlyRevenue ? "text-success" : "text-muted-foreground", subIcon: monthlyRevenue ? TrendingUp : null },
    { label: "Starting Price", value: minPrice > 0 ? `\u20A6${minPrice.toLocaleString()}` : "\u20A60", icon: Key, iconColor: "text-primary", sub: `Per night · ${rooms.length} room types`, subColor: "text-muted-foreground", subIcon: null },
  ];

  // Build room options from real property data for booking modal
  const roomOptions = useMemo(() => {
    if (rooms.length > 0) {
      return rooms.map((r: any) => ({
        label: `${r.name || "Room"} - ${r.quantity || 1} unit(s)`,
        pricePerNight: r.pricePerNight || 0,
      }));
    }
    return ROOM_OPTIONS;
  }, [rooms]);

  const handleSaveRoom = async (roomId: string) => {
    if (!primaryProperty?.id) return;
    const updatedRooms = rooms.map((r: any) =>
      r.id === roomId ? { ...r, name: editName || r.name, pricePerNight: Number(editPrice) || r.pricePerNight } : r
    );
    await updateProperty.mutateAsync({ id: primaryProperty.id, data: { rooms: updatedRooms } });
    setEditingRoom(null);
  };

  const startEditRoom = (room: any) => {
    setEditingRoom(room.id);
    setEditPrice(String(room.pricePerNight || ""));
    setEditName(room.name || "");
  };

  const resetBookingForm = () => {
    setGuestName("");
    setGuestEmail("");
    setGuestPhone("");
    setSelectedRoom("");
    setCheckIn(null);
    setCheckOut(null);
    setBookingSuccess(false);
    const now = new Date();
    setCalMonth(now.getMonth());
    setCalYear(now.getFullYear());
  };

  const handleOpenBooking = () => {
    resetBookingForm();
    setBookingOpen(true);
  };

  const handleCloseBooking = () => {
    setBookingOpen(false);
    resetBookingForm();
  };

  const calDays = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const daysInPrev = new Date(calYear, calMonth, 0).getDate();
    const cells: { day: number; current: boolean; date: Date }[] = [];
    for (let i = firstDay - 1; i >= 0; i--) {
      cells.push({ day: daysInPrev - i, current: false, date: new Date(calYear, calMonth - 1, daysInPrev - i) });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, current: true, date: new Date(calYear, calMonth, d) });
    }
    const remaining = 42 - cells.length;
    for (let i = 1; i <= remaining; i++) {
      cells.push({ day: i, current: false, date: new Date(calYear, calMonth + 1, i) });
    }
    return cells;
  }, [calMonth, calYear]);

  const isDateInRange = (date: Date) => {
    if (!checkIn || !checkOut) return false;
    return date > checkIn && date < checkOut;
  };

  const handleCalDateClick = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return;
    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(date);
      setCheckOut(null);
    } else if (date > checkIn) {
      setCheckOut(date);
    } else {
      setCheckIn(date);
      setCheckOut(null);
    }
  };

  const nightCount = checkIn && checkOut ? Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const roomObj = roomOptions.find((r) => r.label === selectedRoom);
  const subtotal = nightCount * (roomObj?.pricePerNight ?? 0);
  const serviceFee = Math.round(subtotal * 0.10);
  const totalAmount = subtotal + serviceFee;

  const handleConfirmBooking = () => {
    setBookingSuccess(true);
  };

const REPORT_CATEGORIES = [
  { label: "Financial Statement", desc: "Revenue, Expenses, and Net Income", badge: "Financial", badgeColor: "bg-emerald-50 text-emerald-700", icon: DollarSign, iconColor: "text-emerald-600", iconBg: "bg-emerald-50" },
  { label: "Tax Report", desc: "VAT and Withholding Tax Summary", badge: "Compliance", badgeColor: "bg-blue-50 text-blue-700", icon: FileText, iconColor: "text-blue-600", iconBg: "bg-blue-50" },
  { label: "Guest Analytics", desc: "Demographics, Bookings, and Behavior", badge: "Marketing", badgeColor: "bg-purple-50 text-purple-700", icon: Users, iconColor: "text-purple-600", iconBg: "bg-purple-50" },
  { label: "Housekeeping Logs", desc: "Room Status, Turnover Times, and Staff Activity", badge: "Operations", badgeColor: "bg-amber-50 text-amber-700", icon: Bed, iconColor: "text-amber-600", iconBg: "bg-amber-50" },
];

const RECENT_REPORTS = [
  { name: "Weekly Occupancy Forecast", by: "Admin", date: "Oct 26, 2023 · 10:30 AM", formats: ["PDF", "CSV"] },
  { name: "Quarterly Revenue Summary", by: "Admin", date: "Oct 25, 2023 · 2:15 PM", formats: ["PDF", "CSV"] },
  { name: "Incident Log - Q3", by: "System", date: "Oct 20, 2023 · 9:00 AM", formats: ["PDF"] },
];

const handleCopy = () => {
    // Use dynamic property URL — falls back to current origin if propertySlug not yet available
    const url = typeof bookingUrl !== 'undefined' ? bookingUrl : window.location.href;
    navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderPerformance = () => (
    <div className="space-y-6">
      {/* Page Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold">Property Performance</h2>
          <p className="text-muted-foreground mt-1">Real-time revenue and operational insights for your properties.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-muted p-1 rounded-lg flex items-center">
            {(["Daily", "Weekly", "Monthly", "Yearly"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPerfPeriod(p)}
                className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${
                  perfPeriod === p ? "bg-card shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 bg-card border border-border px-4 py-2 rounded-lg">
            <span className="text-sm text-muted-foreground">Compare vs. Prev Period</span>
            <button
              onClick={() => setCompareToggle(!compareToggle)}
              className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                compareToggle ? "bg-primary" : "bg-muted"
              }`}
            >
              <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                compareToggle ? "translate-x-5" : "translate-x-0"
              }`} />
            </button>
          </div>
          <button className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-semibold hover:bg-primary/90 transition-opacity active:scale-95">
            <Download className="w-4 h-4" />
            <span className="text-sm">Export PDF</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {PERF_KPIS.map((kpi) => (
          <div key={kpi.label} className="bg-card border border-border p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-muted p-2 rounded-lg">
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
              <span className={`flex items-center gap-1 text-sm font-semibold ${kpi.up ? "text-emerald-600" : "text-red-500"}`}>
                {kpi.up ? <TrendingUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                {kpi.change}
              </span>
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{kpi.label}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold">{kpi.value}</span>
              <span className="text-sm text-muted-foreground">vs {kpi.prev}</span>
            </div>
            {/* Mini bar chart */}
            <div className="mt-5 h-10 w-full flex items-end gap-1">
              {[0.5, 0.65, 0.75, 1].map((h, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-t-sm transition-all ${
                    i === 3 ? kpi.barColor : `${kpi.barColor}/20 group-hover:${kpi.barColor}/40`
                  }`}
                  style={{ height: `${h * 100}%` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Chart + Benchmark */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Forecast Chart */}
        <div className="lg:col-span-2 bg-card border border-border p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold">Revenue Forecast vs. Actual</h3>
              <p className="text-sm text-muted-foreground mt-1">Tracking financial performance for the current fiscal month.</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-sm text-muted-foreground">Actual</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-border" />
                <span className="text-sm text-muted-foreground">Target</span>
              </div>
            </div>
          </div>
          {/* SVG Chart */}
          <div className="relative h-64 w-full">
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between py-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="border-t border-border w-full h-0" />
              ))}
            </div>
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 300">
              <defs>
                <linearGradient id="perfChartGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#005ea4" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#005ea4" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0,250 Q125,230 250,260 T500,180 T750,150 T1000,100 L1000,300 L0,300 Z" fill="url(#perfChartGrad)" />
              <path d="M0,250 Q125,230 250,260 T500,180 T750,150 T1000,100" fill="none" stroke="#005ea4" strokeLinecap="round" strokeWidth="3" />
              <path d="M0,220 L1000,80" fill="none" stroke="#E2E8F0" strokeDasharray="8 8" strokeWidth="2" />
              <circle cx="500" cy="180" fill="#005ea4" r="5" stroke="white" strokeWidth="2" />
            </svg>
          </div>
          <div className="flex justify-between mt-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>WK 01</span><span>WK 02</span><span>WK 03</span><span>WK 04</span>
          </div>
        </div>

        {/* Market Benchmark */}
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm flex flex-col">
          <h3 className="text-lg font-bold mb-1">Market Benchmark</h3>
          <p className="text-sm text-muted-foreground mb-6">Performance against neighborhood rivals.</p>
          <div className="space-y-5 flex-1">
            {PERF_BENCHMARK.map((b) => (
              <div key={b.name} className={`space-y-2 ${b.isYou ? "bg-primary/5 p-3 rounded-lg -mx-3" : ""}`}>
                <div className="flex justify-between items-center">
                  <span className={`text-sm ${b.isYou ? "font-bold text-primary" : "text-foreground"}`}>{b.name}</span>
                  <span className="text-sm font-bold text-primary">{b.occupancy}%</span>
                </div>
                <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${b.isYou ? "bg-primary" : "bg-primary"}`} style={{ width: `${b.occupancy}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-6 border-t border-border">
            <button className="w-full py-3 bg-muted text-primary rounded-lg font-semibold text-sm hover:bg-primary/10 transition-colors">
              Detailed Comp Set Report
            </button>
          </div>
        </div>
      </div>

      {/* Unit Performance Table */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border flex justify-between items-center">
          <h3 className="text-lg font-bold">Unit Performance Breakdown</h3>
          <button className="text-primary text-sm font-semibold flex items-center gap-1 hover:underline">
            View All Units <ArrowUp className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-muted text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
              <tr>
                <th className="px-6 py-3">Room Type</th>
                <th className="px-6 py-3">Occupancy</th>
                <th className="px-6 py-3">Avg Rate</th>
                <th className="px-6 py-3">Revenue</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-border">
              {PERF_ROOMS.map((room) => (
                <tr key={room.type} className="hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                        <Bed className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{room.type}</p>
                        <p className="text-xs text-muted-foreground">{room.units} Units</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">{room.occupancy}</td>
                  <td className="px-6 py-4">{room.avgRate}</td>
                  <td className="px-6 py-4 font-semibold">{room.revenue}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${room.statusColor}`}>
                      {room.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderInventory = () => {
    const roomTypes = [...new Set(rooms.map((r: any) => r.name || "Room"))];
    const invFilters = ["All Rooms", ...roomTypes];
    const filtered = invFilter === "All Rooms" ? rooms : rooms.filter((r: any) => (r.name || "Room").toLowerCase().includes(invFilter.toLowerCase()));
    return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold">Room Inventory</h2>
          <p className="text-muted-foreground mt-1">Live view of {totalUnits} units at {propertyName}.</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Units", value: String(totalUnits), color: "text-emerald-600", icon: Bed },
          { label: "Room Types", value: String(rooms.length), color: "text-primary", icon: Key },
          { label: "Min Price", value: minPrice > 0 ? `\u20A6${minPrice.toLocaleString()}` : "\u20A60", color: "text-primary", icon: DollarSign },
          { label: "Avg Price", value: rooms.length > 0 ? `\u20A6${Math.round(rooms.reduce((s: number, r: any) => s + (r.pricePerNight || 0), 0) / rooms.length).toLocaleString()}` : "\u20A60", color: "text-orange-600", icon: TrendingUp },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-xl p-5 border border-border shadow-sm flex flex-col justify-between h-28 relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{s.label}</p>
              <h3 className={`text-xl font-extrabold mt-1 ${s.color}`}>{s.value}</h3>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-10">
              <s.icon className="w-16 h-16" />
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
        {/* Filter Bar */}
        <div className="p-4 border-b border-border flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
            <span className="text-sm font-semibold text-muted-foreground mr-2 whitespace-nowrap">Filter:</span>
            {invFilters.map((f) => (
              <button
                key={f}
                onClick={() => setInvFilter(f)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                  invFilter === f
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground border border-border hover:bg-muted/80"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-muted text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Room Name</th>
                <th className="px-6 py-4">Units</th>
                <th className="px-6 py-4">Price / Night</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-border">
              {filtered.map((room: any) => (
                <tr key={room.id} className="hover:bg-muted/50 transition-colors group">
                  <td className="px-6 py-5">
                    <div>
                      {editingRoom === room.id ? (
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="border border-border rounded-lg px-3 py-1.5 text-sm w-full max-w-[200px] bg-card focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                      ) : (
                        <p className="font-semibold">{room.name || "Room"}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5 font-medium">{room.quantity || 1}</td>
                  <td className="px-6 py-5 font-bold text-primary">
                    {editingRoom === room.id ? (
                      <input
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        type="number"
                        className="border border-border rounded-lg px-3 py-1.5 text-sm w-32 bg-card focus:outline-none focus:ring-2 focus:ring-primary/40"
                        placeholder="₦ per night"
                      />
                    ) : (
                      `\u20A6${(room.pricePerNight || 0).toLocaleString()}`
                    )}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {editingRoom === room.id ? (
                        <>
                          <button
                            onClick={() => handleSaveRoom(room.id)}
                            className="px-3 py-1 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 transition-colors flex items-center gap-1"
                          >
                            <Save className="w-3 h-3" /> Save
                          </button>
                          <button onClick={() => setEditingRoom(null)} className="px-3 py-1 bg-muted border border-border rounded text-xs font-semibold hover:bg-muted/80">Cancel</button>
                        </>
                      ) : (
                        <button
                          onClick={() => startEditRoom(room)}
                          className="px-3 py-1 bg-muted border border-border rounded text-xs font-semibold hover:bg-muted/80 transition-colors flex items-center gap-1 opacity-0 group-hover:opacity-100"
                        >
                          <Edit3 className="w-3 h-3" /> Edit Price
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                    No rooms found. Add rooms via the Mini-Site Wizard.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 bg-muted border-t border-border flex justify-between items-center">
          <p className="text-sm text-muted-foreground font-semibold">Showing <span className="text-foreground">{filtered.length}</span> of {rooms.length} room types</p>
        </div>
      </div>

      {/* Bottom CTAs */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        <div className="md:col-span-8 bg-muted p-8 rounded-2xl relative overflow-hidden flex items-center justify-between min-h-[160px]">
          <div className="relative z-10 space-y-2">
            <h3 className="text-lg font-bold">Need to block rooms?</h3>
            <p className="text-sm text-muted-foreground max-w-md">Upcoming events or maintenance can be scheduled in bulk to prevent overbooking across all channels instantly.</p>
            <button className="mt-4 bg-primary text-primary-foreground px-6 py-2 rounded-lg font-semibold shadow-lg hover:shadow-primary/20 transition-all">Schedule Block</button>
          </div>
          <div className="absolute right-0 top-0 w-1/3 h-full bg-primary/5 -skew-x-12 translate-x-12" />
          <Calendar className="absolute right-8 w-24 h-24 text-primary/10 select-none" />
        </div>
        <div className="md:col-span-4 bg-primary text-primary-foreground p-8 rounded-2xl flex flex-col justify-between group">
          <div>
            <TrendingUp className="w-10 h-10 mb-3 group-hover:rotate-12 transition-transform duration-300" />
            <h3 className="text-lg font-bold">Dynamic Pricing</h3>
            <p className="text-sm opacity-80">AI-suggested rates based on local demand.</p>
          </div>
          <button className="flex items-center justify-between font-semibold hover:underline mt-4">
            <span>Optimize All Rates</span>
            <ArrowUp className="w-4 h-4 -rotate-45" />
          </button>
        </div>
      </div>
    </div>
    );
  };

  const renderReports = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold">Reports & Export Center</h2>
          <p className="text-muted-foreground mt-1">Generate, download, and manage all property-related reports and data exports.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="bg-card border border-border px-5 py-2.5 rounded-lg flex items-center gap-2 font-semibold text-sm hover:bg-muted transition-colors">
            <Clock className="w-4 h-4" />
            Scheduled Reports
          </button>
          <button className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg flex items-center gap-2 font-semibold text-sm hover:bg-primary/90 transition-colors shadow-sm">
            <FileSpreadsheet className="w-4 h-4" />
            Custom Report
          </button>
        </div>
      </div>

      {/* Report Categories Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {REPORT_CATEGORIES.map((cat) => (
          <div key={cat.label} className="bg-card border border-border p-6 rounded-xl shadow-sm hover:shadow-md transition-all group cursor-pointer relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <div className={`${cat.iconBg} p-2.5 rounded-lg`}>
                <cat.icon className={`w-5 h-5 ${cat.iconColor}`} />
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${cat.badgeColor}`}>
                {cat.badge}
              </span>
            </div>
            <h3 className="font-bold text-sm mb-1">{cat.label}</h3>
            <p className="text-xs text-muted-foreground mb-4">{cat.desc}</p>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
                <Eye className="w-3.5 h-3.5" />
                View
              </button>
              <button className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
                <Download className="w-3.5 h-3.5" />
                Download
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Reports Table */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border flex justify-between items-center">
          <h3 className="text-lg font-bold">Recent Reports</h3>
          <button className="text-primary text-sm font-semibold hover:underline flex items-center gap-1">
            View History <ArrowUp className="w-4 h-4 -rotate-45" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-muted text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
              <tr>
                <th className="px-6 py-3">Report Name</th>
                <th className="px-6 py-3">Generated By</th>
                <th className="px-6 py-3">Date & Time</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-border">
              {RECENT_REPORTS.map((report) => (
                <tr key={report.name} className="hover:bg-muted/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-primary" />
                      </div>
                      <span className="font-semibold">{report.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{report.by}</td>
                  <td className="px-6 py-4 text-muted-foreground">{report.date}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {report.formats.includes("PDF") && (
                        <button className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition-colors" title="Download PDF">
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                      {report.formats.includes("CSV") && (
                        <button className="p-2 hover:bg-emerald-50 rounded-lg text-emerald-600 transition-colors" title="Download CSV">
                          <FileSpreadsheet className="w-4 h-4" />
                        </button>
                      )}
                      <button className="p-2 hover:bg-muted rounded-lg text-muted-foreground transition-colors">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Section: Import + Quick Export */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Import Area */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-bold mb-1">Import External Data</h3>
          <p className="text-sm text-muted-foreground mb-6">Upload CSV, Excel, or JSON files to sync with your property management system.</p>
          <div className="border-2 border-dashed border-border rounded-xl p-10 text-center hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer group">
            <div className="w-14 h-14 bg-muted rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/10 transition-colors">
              <Upload className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <p className="font-semibold text-sm mb-1">Drag & drop files here, or <span className="text-primary">browse</span></p>
            <p className="text-xs text-muted-foreground">Supports CSV, XLSX, JSON — Max 50MB</p>
          </div>
        </div>

        {/* Quick Export Settings */}
        <div className="bg-card border border-border rounded-xl shadow-sm p-6 flex flex-col">
          <h3 className="text-lg font-bold mb-1">Quick Export Settings</h3>
          <p className="text-sm text-muted-foreground mb-6">Default preferences for report downloads.</p>
          <div className="space-y-5 flex-1">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Preferred Format</label>
              <div className="relative">
                <select className="w-full bg-muted border border-border rounded-lg px-4 py-2.5 text-sm font-semibold appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option>PDF</option>
                  <option>CSV</option>
                  <option>Excel</option>
                </select>
                <ChevronRight className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Timezone</label>
              <div className="relative">
                <select className="w-full bg-muted border border-border rounded-lg px-4 py-2.5 text-sm font-semibold appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option>West Africa Time (WAT)</option>
                  <option>UTC</option>
                  <option>GMT</option>
                </select>
                <ChevronRight className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Include Company Branding</span>
              <button
                className="relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none bg-primary"
              >
                <span className="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 translate-x-5" />
              </button>
            </div>
          </div>
          <button className="w-full mt-6 py-3 bg-muted text-foreground rounded-lg font-semibold text-sm hover:bg-primary/10 transition-colors border border-border">
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );

  const handleSaveSettings = async () => {
    if (!primaryProperty?.id) return;
    const logo = primaryProperty.logo || undefined;
    await updateProperty.mutateAsync({
      id: primaryProperty.id,
      data: {
        vatEnabled,
        vatRate: parseFloat(vatRate) || 0,
        phone: settingsPhone,
        whatsapp: settingsWhatsapp,
        contactEmail: settingsEmail,
        ...(logo !== undefined && { logo }),
      },
    });
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3000);
  };

  const handleDeleteProperty = async () => {
    if (!primaryProperty?.id) return;
    try {
      await deleteDoc(doc(db, "house_listings", primaryProperty.id));
      qc.invalidateQueries({ queryKey: ["house_listings"] });
      navigate("/profile/dashboard");
    } catch (e) {
      console.error("Delete failed:", e);
    }
  };

  const renderSettings = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold">Settings</h2>
        <p className="text-muted-foreground mt-1">Manage your property settings, billing, and account.</p>
      </div>

      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <ExternalLink className="w-5 h-5 text-primary" />
          Edit Mini-Site
        </h3>
        <p className="text-sm text-muted-foreground mb-4">Update your property's public listing page — rooms, images, amenities, pricing, and description.</p>
        <button
          onClick={() => navigate(`/mini-site-wizard?propertyId=${primaryProperty.id}`)}
          className="px-6 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2 active:scale-95"
        >
          <ExternalLink className="w-4 h-4" />
          Open Mini-Site Editor
        </button>
      </div>

      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Percent className="w-5 h-5 text-primary" />
          VAT Configuration
        </h3>
        <p className="text-sm text-muted-foreground mb-4">Toggle Value Added Tax on guest bookings. When enabled, VAT is added to the total at checkout.</p>
        <div className="flex items-center justify-between mb-4 p-4 bg-muted rounded-lg">
          <div>
            <span className="text-sm font-semibold">Enable VAT</span>
            <p className="text-xs text-muted-foreground mt-0.5">Currently {vatEnabled ? "ON" : "OFF"}</p>
          </div>
          <button
            onClick={() => setVatEnabled(!vatEnabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${vatEnabled ? "bg-primary" : "bg-muted-foreground/30"}`}
          >
            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${vatEnabled ? "translate-x-5" : "translate-x-0"}`} />
          </button>
        </div>
        {vatEnabled && (
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold">VAT Rate (%)</label>
            <input type="number" value={vatRate} onChange={(e) => setVatRate(e.target.value)} min="0" max="100" step="0.5"
              className="w-24 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
            <span className="text-xs text-muted-foreground">% of room rate</span>
          </div>
        )}
      </div>

      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Phone className="w-5 h-5 text-primary" />
          Contact Information
        </h3>
        <p className="text-sm text-muted-foreground mb-4">Update the contact details shown on your property page.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-muted-foreground mb-1.5">Phone Number</label>
            <input type="tel" value={settingsPhone} onChange={(e) => setSettingsPhone(e.target.value)} placeholder="+234 800 000 0000"
              className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-muted-foreground mb-1.5">WhatsApp</label>
            <input type="tel" value={settingsWhatsapp} onChange={(e) => setSettingsWhatsapp(e.target.value)} placeholder="+234 800 000 0000"
              className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-muted-foreground mb-1.5">Email</label>
            <input type="email" value={settingsEmail} onChange={(e) => setSettingsEmail(e.target.value)} placeholder="reservations@example.com"
              className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5 text-primary" />
          Change Password
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-muted-foreground mb-1.5">Current Password</label>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Enter current password"
              className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-muted-foreground mb-1.5">New Password</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password"
              className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-muted-foreground mb-1.5">Confirm Password</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password"
              className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-destructive/30 p-6">
        <h3 className="text-lg font-bold mb-2 text-destructive flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Danger Zone
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Deleting your property listing will permanently remove it and deactivate your Hospitality Dashboard.
        </p>
        {deleteStep === 0 ? (
          <button onClick={() => setDeleteStep(1)}
            className="px-6 py-2.5 rounded-lg border border-destructive text-destructive text-sm font-semibold hover:bg-destructive/10 transition-colors">
            Delete Property
          </button>
        ) : (
          <div className="flex items-center gap-3 p-4 bg-destructive/5 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold">Are you sure? This action cannot be undone.</p>
              <p className="text-xs text-muted-foreground">All bookings, rooms, and settings will be permanently deleted.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDeleteStep(0)} className="px-4 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-colors">Cancel</button>
              <button onClick={handleDeleteProperty} className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-semibold hover:bg-destructive/90 transition-colors">Yes, Delete</button>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3">
        {settingsSaved && (
          <span className="text-sm text-emerald-600 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" /> Saved successfully
          </span>
        )}
        <button onClick={handleSaveSettings}
          className="px-8 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2 active:scale-95">
          <Save className="w-4 h-4" />
          Save Settings
        </button>
      </div>
    </div>
  );

  if (user == null) {
    navigate("/auth");
    return null;
  }

  if (loadingListings) {
    return (
      <div className="min-h-screen bg-background p-6 md:p-10">
        <div className="max-w-6xl mx-auto">
          <AdminDashboardSkeleton />
        </div>
      </div>
    );
  }

  if (!publishedMiniSite) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl shadow-sm p-8 md:p-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Hotel className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">
            Your hospitality dashboard isn't live yet.
          </h1>
          <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
            Publish a property mini-site first, then you can manage bookings, inventory, rates and reports from here.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => navigate("/mini-site-wizard")}
              className="w-full py-3 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors active:scale-95 shadow-sm"
            >
              Create your first mini-site
            </button>
            <button
              onClick={() => navigate("/profile/dashboard?tab=listings")}
              className="w-full py-3 px-6 rounded-lg border border-border bg-card text-muted-foreground text-sm font-semibold hover:bg-muted transition-colors"
            >
              Back to My Listings
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col h-screen w-64 fixed left-0 top-0 border-r border-border bg-card z-20">
        <div className="px-6 mb-8 pt-6">
          <h1 className="text-xl font-bold text-primary truncate">{propertyName}</h1>
          <p className="text-sm text-muted-foreground mt-1">Hospitality Dashboard</p>
        </div>
        <nav className="flex-1 overflow-y-auto">
          <ul className="space-y-1 px-2">
            {NAV_ITEMS.map((item) => (
              <li key={item.label}>
                <button
                  onClick={() => setActiveNav(item.label)}
                  className={`flex items-center gap-3 w-full rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                    activeNav === item.label
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="px-4 mt-auto mb-4 space-y-2">
          <button onClick={() => setActiveNav("Reports")} className="w-full bg-primary text-primary-foreground rounded-lg py-3 text-sm font-semibold hover:bg-primary/90 transition-colors">
            Generate Report
          </button>
        </div>
        <ul className="space-y-1 px-2 mb-4">
          <li>
            <button className="flex items-center gap-3 w-full text-muted-foreground px-4 py-3 rounded-lg hover:bg-muted transition-colors text-sm">
              <HelpCircle className="w-5 h-5" />
              Support
            </button>
          </li>
          <li>
            <button onClick={() => navigate("/profile/dashboard")} className="flex items-center gap-3 w-full text-muted-foreground px-4 py-3 rounded-lg hover:bg-muted transition-colors text-sm">
              <LogOut className="w-5 h-5" />
              Back to Dashboard
            </button>
          </li>
        </ul>
      </aside>

      {/* Main */}
      <main className="flex-1 md:ml-64 flex flex-col h-screen overflow-hidden bg-background relative">
        {/* Mobile header */}
        <header className="md:hidden flex justify-between items-center px-4 h-16 bg-card shadow-sm border-b border-border shrink-0 z-10">
          <button onClick={() => navigate("/profile/dashboard")} className="text-sm text-primary font-semibold">
            &larr; Back
          </button>
          <div className="text-lg font-bold text-primary truncate">{propertyName}</div>
        </header>

        {/* Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 md:p-10">
          <div className="max-w-6xl mx-auto flex flex-col gap-6">
            {activeNav === "Reports" && renderReports()}
            {activeNav === "Overview" && (
              <>
                {/* Page header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold">Property Overview</h2>
                    <p className="text-muted-foreground mt-1">Welcome back. Here's what's happening at your properties today.</p>
                  </div>
                  <button onClick={handleOpenBooking} className="bg-primary text-primary-foreground px-6 py-3 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2 shrink-0 active:scale-95">
                    <Plus className="w-4 h-4" />
                    Book for a Guest
                  </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {stats.map((stat) => (
                    <div key={stat.label} className="bg-card rounded-xl p-5 border border-border flex flex-col gap-2">
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span className="text-xs font-semibold uppercase tracking-wider">{stat.label}</span>
                        <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
                      </div>
                      <p className="text-3xl font-extrabold">{stat.value}</p>
                      <div className={`text-sm flex items-center gap-1 mt-1 ${stat.subColor}`}>
                        {stat.subIcon && <stat.subIcon className="w-4 h-4" />}
                        {stat.sub}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bento grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Reservations */}
                  <div className="lg:col-span-2 bg-card rounded-xl border border-border flex flex-col">
                    <div className="p-5 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <h3 className="text-lg font-bold">Recent Reservations</h3>
                      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
                        {(["Upcoming", "Current", "Checked-out"] as const).map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setResTab(tab)}
                            className={`px-4 py-2 rounded-md text-xs font-semibold transition-colors ${
                              resTab === tab ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            {tab}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-muted text-xs font-semibold text-muted-foreground uppercase border-b border-border">
                          <tr>
                            <th className="p-4">Guest</th>
                            <th className="p-4">Property</th>
                            <th className="p-4">Dates</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm">
                          {loadingBookings ? (
                            Array.from({ length: 4 }).map((_, i) => (
                              <tr key={i} className="border-b border-border">
                                <td className="p-4">
                                  <div className="flex items-center gap-3">
                                    <Skeleton className="w-8 h-8 rounded-full" />
                                    <div className="space-y-1.5">
                                      <Skeleton className="h-3.5 w-28" />
                                      <Skeleton className="h-3 w-16" />
                                    </div>
                                  </div>
                                </td>
                                <td className="p-4"><Skeleton className="h-3.5 w-32" /></td>
                                <td className="p-4"><Skeleton className="h-3.5 w-24" /></td>
                                <td className="p-4"><Skeleton className="h-5 w-20 rounded-full" /></td>
                                <td className="p-4 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
                              </tr>
                            ))
                          ) : realBookings.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="p-8 text-center text-muted-foreground text-sm">
                                No bookings yet. They will appear here when guests book through your mini-site.
                              </td>
                            </tr>
                          ) : (
                            realBookings.slice(0, 10).map((booking: any) => {
                              const initials = (booking.guestFirstName?.[0] || "") + (booking.guestLastName?.[0] || "");
                              return (
                                <tr key={booking.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                                  <td className="p-4 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-primary text-primary-foreground">
                                      {initials || "G"}
                                    </div>
                                    <div>
                                      <div className="font-semibold">{booking.guestFirstName} {booking.guestLastName}</div>
                                      <div className="text-muted-foreground text-xs">{booking.bookingRef}</div>
                                    </div>
                                  </td>
                                  <td className="p-4">{booking.propertyTitle}</td>
                                  <td className="p-4">
                                    <div>{booking.checkIn} - {booking.checkOut}</div>
                                    <div className="text-muted-foreground text-xs">{booking.nights} night{booking.nights !== 1 ? "s" : ""}</div>
                                  </td>
                                  <td className="p-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                      booking.status === "Confirmed" ? "bg-primary text-primary-foreground"
                                        : booking.status === "Completed" ? "bg-emerald-100 text-emerald-700"
                                          : "bg-muted text-foreground"
                                    }`}>
                                      {booking.status}
                                    </span>
                                  </td>
                                  <td className="p-4 text-right">
                                    <span className="font-semibold text-primary text-sm">₦{(booking.totalPaid || 0).toLocaleString()}</span>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="p-4 border-t border-border text-center">
                      <button className="text-primary text-xs font-semibold hover:underline">View All Reservations</button>
                    </div>
                  </div>

                  {/* Right column */}
                  <div className="flex flex-col gap-6">
                    {/* Booking portal */}
                    <div className="bg-primary text-primary-foreground rounded-xl p-6 shadow-md relative overflow-hidden">
                      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "20px 20px" }} />
                      <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2 opacity-90">
                          <span className="text-xs font-semibold uppercase tracking-wider">Your Booking Portal</span>
                        </div>
                        <h3 className="text-lg font-bold mb-4">Share your direct booking link</h3>
                        <div className="bg-white/20 p-4 rounded-lg flex items-center justify-between mb-6 border border-white/30">
                          <div className="w-16 h-16 bg-white rounded flex items-center justify-center p-1 shrink-0">
                            <QRCode value={bookingUrl} size={56} viewBox="0 0 256 256" style={{ height: "100%", width: "100%" }} />
                          </div>
                          <div className="flex-1 ml-4 overflow-hidden">
                            <p className="text-xs opacity-80 mb-1">Direct Link</p>
                            <p className="text-sm font-mono truncate" title={bookingUrl}>{displayBookingUrl}</p>
                          </div>
                        </div>
                        <button onClick={handleCopy} className="w-full bg-white text-primary font-semibold py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-white/90 transition-colors">
                          <Copy className="w-4 h-4" />
                          {copied ? "Copied!" : "Copy Link"}
                        </button>
                      </div>
                    </div>

                    {/* Alerts — show empty state when no real bookings */}
                    <div className="bg-card rounded-xl border border-border p-6">
                      <h3 className="text-lg font-bold mb-4">Attention Required</h3>
                      {realBookings.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No alerts. You’ll be notified here when guests message or payments need attention.</p>
                      ) : (
                        <ul className="space-y-4">
                          {ALERTS.map((alert) => (
                            <li key={alert.title} className="flex items-start gap-3">
                              <alert.icon className={`w-5 h-5 mt-0.5 shrink-0 ${alert.iconColor}`} />
                              <div>
                                <p className="text-sm font-semibold">{alert.title}</p>
                                <p className="text-xs text-muted-foreground">{alert.desc}</p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeNav === "Performance" && renderPerformance()}
            {activeNav === "Inventory" && renderInventory()}
            {activeNav === "Food Menu" && <AdminFoodMenu rooms={rooms} bookings={realBookings} />}
            {activeNav === "Settings" && renderSettings()}
          </div>
        </div>
      </main>

      {/* Book for a Guest Modal */}
      {bookingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={handleCloseBooking}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-card max-w-2xl w-full rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-border flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">Book for a Guest</h2>
                <p className="text-sm text-muted-foreground mt-1">Fill in the details to create a manual reservation.</p>
              </div>
              <button onClick={handleCloseBooking} className="text-muted-foreground hover:text-foreground p-2 rounded-lg hover:bg-muted transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            {bookingSuccess ? (
              <div className="p-10 text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold mb-2">Booking Confirmed!</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Reservation for <span className="font-semibold text-foreground">{guestName}</span> has been created successfully.
                </p>
                <p className="text-xs text-muted-foreground mb-6">
                  {nightCount} night{nightCount !== 1 ? "s" : ""} &middot; {selectedRoom.split(" - ")[1]} &middot; Total: ₦{totalAmount.toLocaleString()}
                </p>
                <button
                  onClick={handleCloseBooking}
                  className="bg-primary text-primary-foreground px-8 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors active:scale-95"
                >
                  Done
                </button>
              </div>
            ) : (
              <form
                className="p-6 md:p-8"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (guestName && guestEmail && selectedRoom && checkIn && checkOut) {
                    handleConfirmBooking();
                  }
                }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Guest Name */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-muted-foreground mb-1.5">Guest Name</label>
                    <input
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="e.g. Johnathan Doe"
                      required
                      className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-semibold text-muted-foreground mb-1.5">Email Address</label>
                    <input
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      placeholder="john@example.com"
                      required
                      className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-semibold text-muted-foreground mb-1.5">Phone Number</label>
                    <input
                      type="tel"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      placeholder="+234 (800) 000-0000"
                      className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    />
                  </div>

                  {/* Room Selection */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-muted-foreground mb-1.5">Room Selection</label>
                    <div className="relative">
                      <select
                        value={selectedRoom}
                        onChange={(e) => setSelectedRoom(e.target.value)}
                        required
                        className="w-full appearance-none bg-background border border-border rounded-lg px-4 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all pr-10"
                      >
                        <option value="">Select a room type...</option>
                        {roomOptions.map((r) => (
                          <option key={r.label} value={r.label}>{r.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Dates + Summary */}
                  <div className="md:col-span-2 flex flex-col md:flex-row gap-5">
                    {/* Calendar */}
                    <div className="flex-1">
                      <label className="block text-sm font-semibold text-muted-foreground mb-1.5">Check-in / Check-out</label>
                      <div className="p-4 border border-border rounded-lg bg-muted/50">
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-sm font-bold">{MONTHS[calMonth]} {calYear}</span>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); }
                                else setCalMonth(calMonth - 1);
                              }}
                              className="p-1 hover:bg-muted rounded transition-colors"
                            >
                              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); }
                                else setCalMonth(calMonth + 1);
                              }}
                              className="p-1 hover:bg-muted rounded transition-colors"
                            >
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                          {DAY_LABELS.map((d, i) => (
                            <div key={i} className="text-center text-[10px] font-bold text-muted-foreground py-1">{d}</div>
                          ))}
                          {calDays.map((cell, i) => {
                            const isToday = cell.current && cell.date.toDateString() === new Date().toDateString();
                            const isCheckIn = checkIn && cell.date.toDateString() === checkIn.toDateString();
                            const isCheckOut = checkOut && cell.date.toDateString() === checkOut.toDateString();
                            const inRange = isDateInRange(cell.date);
                            const isPast = cell.current && cell.date < new Date(new Date().setHours(0, 0, 0, 0));

                            let cls = "text-center text-xs py-1.5 rounded cursor-pointer transition-all ";
                            if (!cell.current) cls += "text-muted-foreground/40 ";
                            else if (isPast) cls += "text-muted-foreground/30 cursor-not-allowed ";
                            else if (isCheckIn || isCheckOut) cls += "bg-primary text-primary-foreground font-bold rounded ";
                            else if (inRange) cls += "bg-primary/15 text-primary ";
                            else cls += "hover:bg-muted cursor-pointer ";

                            return (
                              <div
                                key={i}
                                className={cls}
                                onClick={() => cell.current && !isPast && handleCalDateClick(cell.date)}
                              >
                                {cell.day}
                              </div>
                            );
                          })}
                        </div>
                        {checkIn && (
                          <p className="text-xs text-muted-foreground mt-3 text-center">
                            {checkIn.toLocaleDateString("en-NG", { month: "short", day: "numeric" })}
                            {checkOut
                              ? ` → ${checkOut.toLocaleDateString("en-NG", { month: "short", day: "numeric" })} (${nightCount} night${nightCount !== 1 ? "s" : ""})`
                              : " → Select checkout"
                            }
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="flex-1 flex flex-col justify-end">
                      <div className="p-4 bg-muted rounded-lg space-y-3">
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>{nightCount > 0 ? `${nightCount} Night${nightCount !== 1 ? "s" : ""}` : "0 Nights"} × {roomObj ? `₦${roomObj.pricePerNight.toLocaleString()}` : "—"}</span>
                          <span className="font-semibold text-foreground">₦{subtotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Service Fee (10%)</span>
                          <span className="font-semibold text-foreground">₦{serviceFee.toLocaleString()}</span>
                        </div>
                        <div className="pt-3 border-t border-border flex justify-between items-center">
                          <span className="text-sm font-bold">Total Amount</span>
                          <span className="text-lg font-extrabold text-primary">₦{totalAmount.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-6 pt-5 border-t border-border flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCloseBooking}
                    className="px-6 py-2.5 rounded-lg border border-border text-sm font-semibold text-muted-foreground hover:bg-muted active:scale-95 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!guestName || !guestEmail || !selectedRoom || !checkIn || !checkOut}
                    className="px-8 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold shadow-sm hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Confirm Booking
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
