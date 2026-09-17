import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Heart, Share2, MapPin, ShoppingCart,
  MessageCircle, Star, ShieldCheck, Truck, RefreshCcw,
  CheckCircle2, Loader2, Send, Store, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import {
  doc, getDoc, collection, getDocs, query, where, addDoc,
  serverTimestamp, orderBy,
} from "firebase/firestore";
import SEO from "@/components/SEO";
import { AddressPicker } from "@/components/AddressPicker";
import { getMockImage } from "@/lib/mockImages";
import { ChatWidget } from "@/components/ChatWidget";

type ProductData = {
  id: string;
  title: string;
  image: string;
  images?: string[];
  location: string;
  price: string;
  promoPrice?: string;
  category: string;
  condition?: string;
  description: string;
  ownerId: string;
  businessId?: string;
  state?: string;
  city?: string;
  lat?: number;
  lon?: number;
  propertySubType?: string;
  plotSize?: string;
  sizeUnit?: string;
  saleType?: string;
  landUseType?: string;
  topography?: string;
  accessRoad?: string;
  fenced?: boolean;
  isFenced?: boolean;
  surveyPlan?: boolean;
  hasSurveyPlan?: boolean;
  titleType?: string;
  titleDocument?: string;
  streetAddress?: string;
};

type ReviewData = {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: any;
};

const PLACEHOLDER_IMG = "/placeholder.svg";

const formatField = (val: any): string => {
  if (val === null || val === undefined) return "";
  if (typeof val === "object") {
    if (val._lat !== undefined && val._long !== undefined) return `${val._lat.toFixed(4)}, ${val._long.toFixed(4)}`;
    return JSON.stringify(val);
  }
  return String(val);
};

const MarketplaceDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [product, setProduct] = useState<ProductData | null>(null);
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [mainImageIdx, setMainImageIdx] = useState(0);
  const [parentBusiness, setParentBusiness] = useState<{ id: string; title: string; image: string; category: string; location: string } | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [isProperty, setIsProperty] = useState(false);

  // Review form
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchProduct = async () => {
      setLoading(true);
      try {
        let docRef = doc(db, "marketplace", id);
        let docSnap = await getDoc(docRef);
        let source = "marketplace";
        if (!docSnap.exists()) {
          docRef = doc(db, "house_listings", id);
          docSnap = await getDoc(docRef);
          source = "house_listings";
        }
        if (docSnap.exists()) {
          const raw = docSnap.data() as any;
          setIsProperty(source === "house_listings");

          // Redirect mini-site listings to their mini-site page
          if (source === "house_listings" && raw.miniSiteActive && raw.title) {
            const slug = raw.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
            navigate(`/property/${slug}`, { replace: true });
            return;
          }
          setProduct({
            id: docSnap.id,
            title: formatField(raw.title) || "Untitled",
            image: raw.image || getMockImage(raw.category) || PLACEHOLDER_IMG,
            images: raw.images || [raw.image || getMockImage(raw.category) || PLACEHOLDER_IMG],
            location: formatField(raw.location) || "",
            price: formatField(raw.price) || "Price on request",
            promoPrice: raw.promoPrice ? formatField(raw.promoPrice) : undefined,
            category: formatField(raw.category) || "Other",
            condition: raw.condition ? formatField(raw.condition) : undefined,
            description: formatField(raw.description) || "",
            ownerId: raw.ownerId || "",
            businessId: raw.businessId || "",
            state: raw.state || "",
            city: raw.city || "",
            lat: raw.lat,
            lon: raw.lon,
            propertySubType: raw.propertySubType || "",
            plotSize: raw.plotSize || "",
            sizeUnit: raw.sizeUnit || "",
            saleType: raw.saleType || "",
            landUseType: raw.landUseType || "",
            topography: raw.topography || "",
            accessRoad: raw.accessRoad || "",
            fenced: raw.fenced ?? raw.isFenced ?? false,
            isFenced: raw.isFenced ?? raw.fenced ?? false,
            surveyPlan: raw.surveyPlan ?? raw.hasSurveyPlan ?? false,
            hasSurveyPlan: raw.hasSurveyPlan ?? raw.surveyPlan ?? false,
            titleType: raw.titleType || raw.titleDocument || "",
            titleDocument: raw.titleDocument || raw.titleType || "",
            streetAddress: raw.streetAddress || "",
          });

          // Fetch parent business if businessId exists
          if (raw.businessId) {
            try {
              const bizSnap = await getDoc(doc(db, "businesses", raw.businessId));
              if (bizSnap.exists()) {
                const biz = bizSnap.data() as any;
                setParentBusiness({
                  id: bizSnap.id,
                  title: biz.title || "Untitled Business",
                  image: biz.image || "",
                  category: biz.category || "",
                  location: biz.location || "",
                });
              }
            } catch (e) {
              // Parent business not found — non-blocking
            }
          }
        }

        // Fetch reviews
        const revQuery = query(
          collection(db, "reviews"),
          where("targetId", "==", id)
        );
        const revSnap = await getDocs(revQuery);
        const revs = revSnap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        })) as ReviewData[];
        revs.sort((a: any, b: any) => {
          const ta = a.createdAt?.seconds || 0;
          const tb = b.createdAt?.seconds || 0;
          return tb - ta;
        });
        setReviews(revs);
      } catch (err) {
        console.error("Error fetching product:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  const handleSubmitReview = async () => {
    if (!user) { navigate("/auth"); return; }
    if (!reviewComment.trim()) {
      toast({ title: "Please write a review", variant: "destructive" });
      return;
    }
    setSubmittingReview(true);
    try {
      await addDoc(collection(db, "reviews"), {
        targetId: id,
        targetType: "product",
        userId: user.id,
        userName: user.name || user.email || "Anonymous",
        rating: reviewRating,
        comment: reviewComment.trim(),
        createdAt: serverTimestamp(),
      });
      toast({ title: "Review submitted!" });
      setReviewComment("");
      setReviewRating(5);

      // Refresh reviews
      const revQuery = query(collection(db, "reviews"), where("targetId", "==", id));
      const revSnap = await getDocs(revQuery);
      const revs = revSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as ReviewData[];
      revs.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setReviews(revs);
    } catch (err) {
      console.error(err);
      toast({ title: "Failed to submit review", variant: "destructive" });
    } finally {
      setSubmittingReview(false);
    }
  };

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border/50">
          <div className="flex items-center px-4 py-4 max-w-7xl mx-auto">
            <Button variant="ghost" size="icon" onClick={() => navigate("/marketplace")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <h2 className="text-xl font-bold text-foreground mb-2">Product not found</h2>
          <p className="text-muted-foreground mb-6">This item may have been sold or removed.</p>
          <Button onClick={() => navigate(-1)}>Back</Button>
        </div>
      </div>
    );
  }

  const allImages = product.images && product.images.length > 0 ? product.images : [product.image];

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 lg:pb-8">
      <SEO title={`${product.title} | CitivasNG`} description={product.description} />

      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setLiked(!liked)} className="rounded-full hover:text-destructive hover:bg-destructive/10 transition-colors">
              <Heart className={`h-5 w-5 ${liked ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Share2 className="h-5 w-5 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 lg:py-10">
        <div className="hidden lg:flex items-center justify-between mb-8">
          <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2 pl-0 hover:bg-transparent hover:text-primary">
            <ArrowLeft className="h-4 h-4" /> {isProperty ? "Back to Listings" : "Back to Marketplace"}
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" className={`gap-2 transition-colors ${liked ? "border-destructive/50 bg-destructive/10 text-destructive" : ""}`} onClick={() => setLiked(!liked)}>
              <Heart className={`h-4 w-4 ${liked ? "fill-destructive text-destructive" : ""}`} />
              {liked ? "Saved" : "Save"}
            </Button>
            <Button variant="outline" className="gap-2">
              <Share2 className="h-4 w-4" /> Share
            </Button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          {/* Left: Gallery */}
          <div className="w-full lg:w-3/5 space-y-4">
            <div className="rounded-2xl bg-card/60 border border-border/50 shadow-card p-3">
              <div className="aspect-[4/3] rounded-xl overflow-hidden">
                <img src={allImages[mainImageIdx]} alt={product.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              </div>
            </div>
            {allImages.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {allImages.slice(0, 4).map((img, idx) => (
                  <div key={idx} onClick={() => setMainImageIdx(idx)} className={`aspect-[3/2] rounded-xl overflow-hidden cursor-pointer transition-all ${mainImageIdx === idx ? "border-2 border-primary" : "border border-border/50 hover:border-primary/50"}`}>
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Info */}
          <div className="w-full lg:w-2/5 flex flex-col gap-6">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider border border-primary/20">{product.category}</span>
                {product.condition && (
                  <span className="bg-success/10 text-success px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider border border-success/20">{product.condition}</span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight">{product.title}</h1>
              <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                <MapPin className="w-4 h-4 text-primary" />
                <span>{product.location}</span>
              </div>
              {product.lat && product.lon && (
                <div className="mt-4">
                  <AddressPicker readOnly initialLat={product.lat} initialLon={product.lon} initialAddress={product.location} />
                </div>
              )}
              {avgRating && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`w-4 h-4 ${s <= Math.round(Number(avgRating)) ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"}`} />
                    ))}
                  </div>
                  <span className="font-bold text-sm">{avgRating}</span>
                  <span className="text-muted-foreground text-sm">({reviews.length} reviews)</span>
                </div>
              )}
            </div>

            {/* Price */}
            <div className="p-5 rounded-2xl bg-card/60 border border-border/50 shadow-xl">
              <p className="text-[10px] font-bold text-muted-foreground mb-1.5 uppercase tracking-widest">Price</p>
              <div className="flex items-baseline gap-3">
                {product.promoPrice && Number(product.promoPrice.replace(/[^0-9]/g, '')) < Number(product.price.replace(/[^0-9]/g, '')) ? (
                  <>
                    <span className="text-xl font-medium text-muted-foreground line-through">{product.price}</span>
                    <span className="text-3xl lg:text-4xl font-extrabold text-primary">{product.promoPrice}</span>
                  </>
                ) : (
                  <span className="text-3xl lg:text-4xl font-extrabold text-accent">{product.price}</span>
                )}
              </div>
              <div className="mt-4 flex items-center gap-2 text-success font-medium text-xs bg-success/10 w-fit px-3 py-1.5 rounded-lg border border-success/20">
                <ShieldCheck className="w-4 h-4" />
                {isProperty ? "Verified listing on Citivas" : "Secure payment through Citivas"}
              </div>
            </div>

            {/* View Storefront Card */}
            {parentBusiness && (
              <button
                onClick={() => navigate(`/business/${parentBusiness.id}`)}
                className="w-full p-4 rounded-2xl bg-card/60 border border-border/50 shadow-sm hover:border-primary/30 hover:bg-card/80 transition-all text-left group flex items-center gap-4"
              >
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-muted shrink-0">
                  {parentBusiness.image ? (
                    <img src={parentBusiness.image} alt={parentBusiness.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Store className="w-6 h-6 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Sold by</p>
                  <p className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">{parentBusiness.title}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="truncate">{parentBusiness.location}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold text-primary shrink-0">
                  <span>View Store</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            )}

            {/* Description */}
            <div className="space-y-3">
              <h4 className="font-semibold text-lg">Description</h4>
              <p className="text-muted-foreground text-sm leading-relaxed">{product.description}</p>
            </div>

            {/* Land Details */}
            {isProperty && product.propertySubType === "land" && (
              <div className="space-y-4">
                <h4 className="font-semibold text-lg">Land Details</h4>
                <div className="grid grid-cols-2 gap-4 p-5 rounded-2xl bg-card/60 border border-border/50 shadow-sm">
                  {product.saleType && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Sale Type</p>
                      <p className="font-semibold text-sm text-foreground capitalize">{product.saleType}</p>
                    </div>
                  )}
                  {product.landUseType && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Land Use</p>
                      <p className="font-semibold text-sm text-foreground">{product.landUseType}</p>
                    </div>
                  )}
                  {product.plotSize && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Plot Size</p>
                      <p className="font-semibold text-sm text-foreground">{product.plotSize} {product.sizeUnit || "plots"}</p>
                    </div>
                  )}
                  {product.titleType && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Title Document</p>
                      <p className="font-semibold text-sm text-foreground">{product.titleType}</p>
                    </div>
                  )}
                  {product.topography && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Topography</p>
                      <p className="font-semibold text-sm text-foreground">{product.topography}</p>
                    </div>
                  )}
                  {product.accessRoad && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Access Road</p>
                      <p className="font-semibold text-sm text-foreground">{product.accessRoad}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Fenced</p>
                    <p className="font-semibold text-sm text-foreground">{(product.fenced || product.isFenced) ? "Yes" : "No"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Survey Plan</p>
                    <p className="font-semibold text-sm text-foreground">{(product.surveyPlan || product.hasSurveyPlan) ? "Available" : "Not Available"}</p>
                  </div>
                </div>
              </div>
            )}

            {/* CTA */}
            <div className="sticky bottom-4 grid grid-cols-2 gap-3 mt-auto pt-4 z-10">
              <Button className="w-full h-12 font-bold rounded-full bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
                {isProperty ? <><MapPin className="w-5 h-5" /> Inquire Now</> : <><ShoppingCart className="w-5 h-5" /> Buy Now</>}
              </Button>
              <Button
                variant="outline"
                className="w-full h-12 font-bold rounded-full border-2 gap-2"
                onClick={() => {
                  if (!user) {
                    navigate("/auth");
                    return;
                  }
                  setChatOpen(true);
                }}
              >
                <MessageCircle className="w-5 h-5" /> Contact Seller
              </Button>
            </div>

            {/* Trust */}
            <div className="flex justify-between items-center px-4 py-3 rounded-xl bg-card/40 border border-border/50">
              <div className="flex flex-col items-center gap-1 opacity-70 hover:opacity-100 transition-opacity">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <span className="text-[9px] font-bold uppercase tracking-wider text-center leading-tight">{isProperty ? "Verified" : "Buyer Protection"}</span>
              </div>
              <div className="flex flex-col items-center gap-1 opacity-70 hover:opacity-100 transition-opacity">
                {isProperty ? <MapPin className="w-5 h-5 text-primary" /> : <Truck className="w-5 h-5 text-primary" />}
                <span className="text-[9px] font-bold uppercase tracking-wider text-center leading-tight">{isProperty ? "Location" : "Fast Delivery"}</span>
              </div>
              <div className="flex flex-col items-center gap-1 opacity-70 hover:opacity-100 transition-opacity">
                <RefreshCcw className="w-5 h-5 text-primary" />
                <span className="text-[9px] font-bold uppercase tracking-wider text-center leading-tight">{isProperty ? "Easy Contact" : "Easy Returns"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Reviews Section ── */}
        <section className="mt-12 pt-10 border-t border-border">
          <h2 className="font-display text-2xl font-extrabold mb-6">
            Reviews ({reviews.length})
          </h2>

          {/* Write a Review */}
          {user && (
            <div className="bg-card/60 border border-border/50 rounded-2xl p-5 mb-8">
              <h3 className="font-bold text-sm mb-3">Write a Review</h3>
              <div className="flex items-center gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} onClick={() => setReviewRating(s)}>
                    <Star className={`w-6 h-6 transition-colors ${s <= reviewRating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground hover:text-yellow-300"}`} />
                  </button>
                ))}
                <span className="ml-2 text-sm font-bold text-muted-foreground">{reviewRating}/5</span>
              </div>
              <Textarea
                placeholder="Share your experience with this product..."
                rows={3}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                className="mb-3"
              />
              <Button onClick={handleSubmitReview} disabled={submittingReview} className="rounded-xl font-bold">
                {submittingReview ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                Submit Review
              </Button>
            </div>
          )}

          {/* Reviews List */}
          {reviews.length === 0 ? (
            <div className="text-center py-12 bg-card/30 rounded-2xl border border-dashed border-border">
              <p className="text-muted-foreground">No reviews yet. Be the first to review!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((rev) => (
                <div key={rev.id} className="bg-card/60 border border-border/50 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {(rev.userName || "A").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-foreground">{rev.userName}</p>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className={`w-3 h-3 ${s <= (rev.rating || 0) ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"}`} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{rev.comment}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Chat Widget - contact seller */}
      {user && product && !parentBusiness && product.ownerId !== user.id && (
        <ChatWidget
          businessId={product.businessId || ''}
          businessName={parentBusiness?.title || ''}
          businessAvatar={parentBusiness?.image || ''}
          sellerId={product.ownerId}
          sellerName={parentBusiness?.title || 'Seller'}
          sellerPhoto={parentBusiness?.image || product.image}
          isOpen={chatOpen}
          onOpenChange={setChatOpen}
        />
      )}
      {user && product && parentBusiness && product.ownerId !== user.id && (
        <ChatWidget
          businessId={parentBusiness.id}
          businessName={parentBusiness.title}
          businessAvatar={parentBusiness.image}
          isOpen={chatOpen}
          onOpenChange={setChatOpen}
        />
      )}
    </div>
  );
};

export default MarketplaceDetailPage;
