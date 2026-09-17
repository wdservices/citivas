import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { MINI_SITES, MiniSite, propertyDocToMiniSite, marketplaceDocToMiniSite } from "@/content/miniSites";

/**
 * Mini sites combine three sources:
 *  1. the curated seed catalogue (`listedBy: "admin"`),
 *  2. properties users list from the dashboard (`house_listings`), and
 *  3. property listings from the marketplace (`marketplace`) — these are
 *     mapped onto the same MiniSite shape so all render identically.
 * Anything an admin deletes is recorded in `mini_site_removals/{slug}`.
 * Firestore failures degrade gracefully to the seed list.
 */
export function useMiniSites() {
  const [sites, setSites] = useState<MiniSite[]>(MINI_SITES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [removalRes, propRes, mpRes] = await Promise.allSettled([
          getDocs(collection(db, "mini_site_removals")),
          getDocs(collection(db, "house_listings")),
          getDocs(collection(db, "marketplace")),
        ]);
        const removed = new Set(
          removalRes.status === "fulfilled" ? removalRes.value.docs.map((d) => d.id) : []
        );

        // Properties from house_listings (only mini-site eligible)
        const userSites =
          propRes.status === "fulfilled"
            ? propRes.value.docs
                .filter((d) => (d.data() as any).miniSiteActive === true)
                .map((d) => propertyDocToMiniSite(d.id, d.data() as any))
            : [];

        // Property-type items from marketplace (shortlet, hotel, apartment, etc.)
        const PROPERTY_RE = /property|shortlet|hotel|apartment|house|real.estate/i;
        const mpSites =
          mpRes.status === "fulfilled"
            ? mpRes.value.docs
                .map((d) => marketplaceDocToMiniSite(d.id, d.data() as any))
                .filter((s) => PROPERTY_RE.test(s.type) || PROPERTY_RE.test(s.propertyType ?? ""))
            : [];

        // Merge all sources, dedupe by slug (house_listings wins over marketplace over seed)
        const slugMap = new Map<string, MiniSite>();
        for (const s of [...MINI_SITES, ...mpSites, ...userSites]) {
          if (!slugMap.has(s.slug)) slugMap.set(s.slug, s);
        }
        const all = Array.from(slugMap.values()).filter((s) => !removed.has(s.slug));
        if (active) setSites(all);
      } catch {
        if (active) setSites(MINI_SITES);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return { sites, loading };
}
