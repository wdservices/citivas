import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { format, addMonths, startOfMonth, getDaysInMonth, getDay, isSameDay, isAfter, isBefore, addDays } from "date-fns";
import { ChevronLeft, Users, Wifi, Maximize2, CheckCircle2, ArrowRight } from "lucide-react";

interface RoomCategory {
  name: string;
  bedType: string;
  bathrooms: number;
  maxOccupancy: number;
  quantity: number;
  pricePerNight: number;
  minNights: number;
  deposit: number;
  images: string[];
}

interface PropertyData {
  id: string;
  title: string;
  rooms: RoomCategory[];
  checkin: string;
  checkout: string;
  location: string;
  city: string;
  state: string;
  ownerId?: string;
  userId?: string;
  vatEnabled?: boolean;
  vatRate?: number;
}

const BOOKING_STEPS = ["DATES & ROOM", "GUESTS", "ADD-ONS", "PAYMENT"];

function makeSlug(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
}

function CalendarMonth({ month, selectedStart, selectedEnd, onDateClick }: {
  month: Date;
  selectedStart: Date | null;
  selectedEnd: Date | null;
  onDateClick: (d: Date) => void;
}) {
  const year = month.getFullYear();
  const mon = month.getMonth();
  const daysInMonth = getDaysInMonth(month);
  const firstDay = getDay(startOfMonth(month));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const blanks = Array.from({ length: firstDay }, (_, i) => i);
  const days = Array.from({ length: daysInMonth }, (_, i) => new Date(year, mon, i + 1));

  const isInRange = (d: Date) => {
    if (!selectedStart || !selectedEnd) return false;
    return isAfter(d, selectedStart) && isBefore(d, selectedEnd);
  };

  const isStart = (d: Date) => selectedStart && isSameDay(d, selectedStart);
  const isEnd = (d: Date) => selectedEnd && isSameDay(d, selectedEnd);

  return (
    <div>
      <h3 className="text-[13px] sm:text-[15px] font-bold text-gray-800 text-center mb-3 sm:mb-4">{format(month, "MMMM yyyy")}</h3>
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1 text-center text-[10px] sm:text-[11px] font-semibold text-gray-400 mb-1.5 sm:mb-2">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i} className="py-0.5">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1 text-center text-[12px] sm:text-[13px]">
        {blanks.map((b) => <div key={`b-${b}`} />)}
        {days.map((d) => {
          const isPast = isBefore(d, today);
          const start = isStart(d);
          const end = isEnd(d);
          const inRange = isInRange(d);
          return (
            <div key={d.getTime()} onClick={() => !isPast && onDateClick(d)}
              className={`p-1.5 sm:p-2 rounded-full cursor-pointer transition-all relative ${
                isPast ? "text-gray-300 cursor-not-allowed"
                  : start ? "bg-[#005ea4] text-white font-bold z-10"
                    : end ? "bg-[#005ea4] text-white font-bold z-10"
                      : inRange ? "bg-[#d3e4ff] text-[#005ea4]"
                        : "hover:bg-gray-100 text-gray-700"
              }`}>
              {d.getDate()}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function BookingEngine() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const preSelectedRoom = (location.state as any)?.preSelectedRoom as number | undefined;
  const [property, setProperty] = useState<PropertyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [calendarStep, setCalendarStep] = useState(0);

  const currentMonth = useMemo(() => addMonths(new Date(), calendarStep), [calendarStep]);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    const fetch = async () => {
      try {
        const snap = await getDocs(query(collection(db, "house_listings"), where("miniSiteActive", "==", true)));
        const found = snap.docs.find((d) => makeSlug(d.data().title || "") === slug);
        if (found) {
          setProperty({ id: found.id, ...found.data() } as PropertyData);
          if (preSelectedRoom !== undefined) {
            setSelectedRoom(preSelectedRoom);
          }
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetch();
  }, [slug]);

  const handleDateClick = (d: Date) => {
    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(d);
      setCheckOut(null);
    } else if (isBefore(d, checkIn)) {
      setCheckIn(d);
      setCheckOut(null);
    } else {
      setCheckOut(d);
    }
  };

  const nights = checkIn && checkOut ? Math.ceil((checkOut.getTime() - checkIn.getTime()) / 86400000) : 0;
  const selectedRoomData = selectedRoom !== null && property?.rooms?.[selectedRoom] ? property.rooms[selectedRoom] : null;
  const roomTotal = selectedRoomData && nights > 0 ? selectedRoomData.pricePerNight * nights : 0;
  const vatEnabled = property?.vatEnabled || false;
  const vatRate = property?.vatRate || 0;
  const vatAmount = vatEnabled && roomTotal > 0 ? Math.round(roomTotal * (vatRate / 100)) : 0;
  const total = roomTotal + vatAmount;

  if (loading) {
    return <div className="min-h-screen bg-[#f8f9ff] flex items-center justify-center"><p className="text-gray-400">Loading...</p></div>;
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-[#f8f9ff] flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">Property not found.</p>
        <a href="/explore" className="text-[#005ea4] font-semibold hover:underline">Browse Properties</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9ff] flex flex-col">
      {/* Nav */}
      <nav className="bg-white w-full border-b border-gray-200 shadow-sm z-50">
        <div className="flex justify-between items-center w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 h-14 sm:h-20">
          <div className="flex items-center gap-8">
            <span className="text-[16px] sm:text-[20px] font-bold text-[#005ea4] tracking-tight">Citivas Hospitality</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="bg-[#005ea4] text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[13px] sm:text-[14px] font-semibold hover:opacity-90 transition-opacity">Sign In</button>
          </div>
        </div>
      </nav>

      {/* Progress Steps */}
      <div className="w-full bg-white border-b border-gray-100 overflow-x-auto">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-4 sm:py-8">
          <div className="flex justify-center items-center">
            <div className="flex items-center gap-2 sm:gap-4">
              {BOOKING_STEPS.map((label, i) => (
                <div key={label} className="flex items-center">
                  {i > 0 && <div className="w-6 sm:w-16 h-[2px] bg-gray-200 mx-1 sm:mx-2" />}
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 sm:w-12 sm:h-12 rounded-full border-2 flex items-center justify-center text-[12px] sm:text-[15px] font-bold ${
                      i === 0 ? "border-[#005ea4] border-dashed bg-[#d3e4ff] text-[#005ea4]"
                        : "border-gray-300 border-dashed text-gray-400 opacity-50"
                    }`}>
                      {i + 1}
                    </div>
                    <span className={`mt-1 sm:mt-2 text-[9px] sm:text-[11px] font-semibold tracking-wider whitespace-nowrap ${
                      i === 0 ? "text-[#005ea4]" : "text-gray-400 opacity-50"
                    }`}>{label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          {/* Left: Calendar */}
          <div className="lg:col-span-5 flex flex-col gap-4 sm:gap-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-[0_4px_12px_rgba(0,0,0,0.05)] p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <button onClick={() => setCalendarStep(Math.max(0, calendarStep - 1))} disabled={calendarStep === 0}
                  className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors">
                  <ChevronLeft className="w-5 h-5 text-gray-500" />
                </button>
                <h2 className="text-[16px] sm:text-[20px] font-bold text-gray-800">Select Dates</h2>
                <button onClick={() => setCalendarStep(calendarStep + 1)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                  <ChevronLeft className="w-5 h-5 text-gray-500 rotate-180" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
                <CalendarMonth month={currentMonth} selectedStart={checkIn} selectedEnd={checkOut} onDateClick={handleDateClick} />
              </div>

              {/* Check-in / Check-out display */}
              <div className="mt-4 sm:mt-6 flex justify-between items-center bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-200">
                <div>
                  <span className="text-[10px] sm:text-[11px] font-semibold text-gray-400 tracking-wider block mb-1">CHECK-IN</span>
                  <span className="text-[14px] sm:text-[18px] font-bold text-gray-800">{checkIn ? format(checkIn, "MMM d") : "Select"}</span>
                </div>
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300" />
                <div className="text-right">
                  <span className="text-[10px] sm:text-[11px] font-semibold text-gray-400 tracking-wider block mb-1">CHECK-OUT</span>
                  <span className="text-[14px] sm:text-[18px] font-bold text-gray-800">{checkOut ? format(checkOut, "MMM d") : "Select"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Room Cards */}
          <div className="lg:col-span-7 flex flex-col gap-4 sm:gap-6">
            {(property.rooms || []).map((room, idx) => {
              const isSelected = selectedRoom === idx;
              return (
                <div key={idx} className={`bg-white rounded-xl overflow-hidden transition-all ${
                  isSelected ? "border-2 border-[#005ea4] shadow-[0_12px_24px_rgba(0,0,0,0.08)]" : "border border-gray-200 shadow-[0_4px_12px_rgba(0,0,0,0.05)]"
                }`}>
                  <div className="flex flex-col sm:flex-row h-full">
                    {/* Room Image */}
                    <div className="w-full sm:w-1/3 h-48 sm:h-auto relative bg-gray-100">
                      {room.images?.[0] ? (
                        <img src={room.images[0]} alt={room.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-50 min-h-[200px]" />
                      )}
                      {isSelected && (
                        <div className="absolute top-3 left-3 bg-[#e8f5e9] text-[#1b5e20] px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 border border-[#c8e6c9]">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Selected
                        </div>
                      )}
                    </div>

                    {/* Room Details */}
                    <div className="w-full sm:w-2/3 p-4 sm:p-6 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-2 gap-2">
                          <h3 className="text-[16px] sm:text-[20px] font-bold text-gray-800">{room.name || `Room ${idx + 1}`}</h3>
                          {room.quantity <= 3 && room.quantity > 0 && (
                            <span className="shrink-0 bg-[#fff3e0] text-[#e65100] px-2 py-1 rounded text-[11px] font-semibold border border-[#ffe0b2] flex items-center gap-1">
                              {room.quantity} room{room.quantity > 1 ? "s" : ""} left
                            </span>
                          )}
                        </div>
                        <p className="text-[13px] sm:text-[14px] text-gray-500 mb-3 sm:mb-4">{room.bedType} &middot; {room.bathrooms} bathroom{room.bathrooms !== 1 ? "s" : ""}</p>
                        <div className="flex gap-4 mb-3 sm:mb-4 text-gray-500">
                          <div className="flex items-center gap-1.5 text-[12px] sm:text-[13px]">
                            <Users className="w-4 h-4" /> {room.maxOccupancy} Guests
                          </div>
                          <div className="flex items-center gap-1.5 text-[12px] sm:text-[13px]">
                            <Wifi className="w-4 h-4" /> Fast WiFi
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-end border-t border-gray-200 pt-3 sm:pt-4 mt-2">
                        <div>
                          <span className="text-[24px] sm:text-[36px] font-bold text-[#005ea4] leading-none block">
                            {room.pricePerNight > 0 ? `₦${room.pricePerNight.toLocaleString()}` : "TBD"}
                          </span>
                          <span className="text-[10px] sm:text-[11px] font-semibold text-gray-400 tracking-wider">/ NIGHT</span>
                        </div>
                        <button onClick={() => setSelectedRoom(isSelected ? null : idx)}
                          className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg text-[13px] sm:text-[14px] font-semibold flex items-center gap-2 transition-all ${
                            isSelected
                              ? "bg-[#005ea4] text-white shadow-md"
                              : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                          }`}>
                          {isSelected && <CheckCircle2 className="w-4 h-4" />}
                          {isSelected ? "Selected" : "Select Room"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Sticky Bottom Bar */}
      {selectedRoomData && (
        <div className="fixed bottom-0 w-full bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] z-40 p-3 sm:p-4">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 flex justify-between items-center gap-3">
            <div className="flex flex-col min-w-0">
              <span className="text-[12px] sm:text-[14px] text-gray-500 truncate">{nights > 0 ? `${nights} Night${nights !== 1 ? "s" : ""}` : "Select dates"} &middot; {selectedRoomData.name || `Room ${(selectedRoom || 0) + 1}`}</span>
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] sm:text-[11px] font-semibold text-gray-400 tracking-wider">TOTAL:</span>
                <span className="text-[20px] sm:text-[28px] font-bold text-[#005ea4]">₦{total.toLocaleString()}</span>
              </div>
              {vatEnabled && vatAmount > 0 && (
                <span className="text-[10px] sm:text-[11px] text-gray-400">includes ₦{vatAmount.toLocaleString()} VAT ({vatRate}%)</span>
              )}
            </div>
            <button disabled={nights === 0}
              onClick={() => navigate(`/book/${slug}/payment`, {
                state: {
                  roomName: selectedRoomData.name || `Room ${(selectedRoom || 0) + 1}`,
                  roomImage: selectedRoomData.images?.[0] || "",
                  pricePerNight: selectedRoomData.pricePerNight,
                  nights,
                  checkIn: checkIn ? format(checkIn, "MMM d, yyyy") : "",
                  checkOut: checkOut ? format(checkOut, "MMM d, yyyy") : "",
                  guests: selectedRoomData.maxOccupancy,
                  total,
                  deposit: selectedRoomData.deposit || 0,
                  propertyTitle: property.title,
                  propertyLocation: property.location || [property.city, property.state].filter(Boolean).join(", "),
                  ownerId: property.ownerId || property.userId || "",
                  propertyId: property.id || "",
                  vatEnabled,
                  vatRate,
                }
              })}
              className="shrink-0 bg-[#005ea4] text-white px-4 sm:px-8 py-2.5 sm:py-3 rounded-lg text-[14px] sm:text-[16px] font-bold shadow-md hover:bg-[#004881] transition-colors flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
              Continue <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Spacer for sticky bar */}
      {selectedRoomData && <div className="h-20 sm:h-24" />}

      {/* Footer */}
      <footer className="bg-white w-full py-8 sm:py-12 border-t border-gray-200 mt-auto">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-6">
          <div className="text-[13px] sm:text-[14px] text-gray-400">
            &copy; 2024 Citivas Hospitality. All rights reserved.
          </div>
          <div className="flex flex-wrap gap-4 sm:gap-6 justify-center text-[13px] sm:text-[14px] text-gray-400">
            <a href="/privacy" className="hover:text-[#005ea4] transition-colors">Privacy Policy</a>
            <a href="/terms" className="hover:text-[#005ea4] transition-colors">Terms of Service</a>
            <a href="/contact-support" className="hover:text-[#005ea4] transition-colors">Contact Support</a>
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-gray-400">
          A product of Bluewaves Technology and Software Development —{" "}
          <a href="https://bwtng.live" target="_blank" rel="noopener noreferrer" className="hover:text-[#005ea4] hover:underline">
            www.bwtng.live
          </a>
        </p>
      </footer>
    </div>
  );
}
