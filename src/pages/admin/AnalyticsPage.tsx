import { useEffect, useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  listenUsers, listenAllBusinesses, listenHouseListings,
  listenMarketplaceItems, listenAllEvents,
  AdminUser, AdminBusiness, AdminMarketplaceItem, AdminPropertyItem,
} from '@/lib/adminData';
import { PlatformHealthCharts } from '@/components/admin/PlatformHealthCharts';
import { AdminDashboardSkeleton } from '@/components/ui/ListingSkeletons';

export default function AdminAnalyticsPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [businesses, setBusinesses] = useState<AdminBusiness[]>([]);
  const [properties, setProperties] = useState<AdminPropertyItem[]>([]);
  const [marketplace, setMarketplace] = useState<AdminMarketplaceItem[]>([]);
  const [events, setEvents] = useState<AdminBusiness[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubUsers = listenUsers(setUsers);
    const unsubBiz = listenAllBusinesses((items) => {
      setBusinesses(items);
      setLoading(false);
    });
    const unsubProp = listenHouseListings(setProperties);
    const unsubMkt = listenMarketplaceItems(setMarketplace);
    const unsubEv = listenAllEvents(setEvents);
    return () => {
      unsubUsers();
      unsubBiz();
      unsubProp();
      unsubMkt();
      unsubEv();
    };
  }, []);

  const topStatesData = useMemo(() => {
    const counts: Record<string, { state: string; properties: number; products: number; restaurants: number; events: number }> = {};
    const bump = (rawState: string | undefined, key: 'properties' | 'products' | 'restaurants' | 'events') => {
      const s = rawState?.trim() || 'Unspecified';
      if (!counts[s]) counts[s] = { state: s, properties: 0, products: 0, restaurants: 0, events: 0 };
      counts[s][key] += 1;
    };
    properties.forEach((p) => bump(p.state, 'properties'));
    marketplace.forEach((m) => bump(m.state, 'products'));
    businesses.forEach((b) => {
      if (b.category === 'Event') bump(b.state, 'events');
      else if (b.category === 'Restaurant' || b.type === 'Restaurant') bump(b.state, 'restaurants');
    });
    events.forEach((e) => bump(e.state, 'events'));

    return Object.values(counts)
      .sort((a, b) => (b.properties + b.products + b.restaurants + b.events) - (a.properties + a.products + a.restaurants + a.events))
      .slice(0, 10);
  }, [properties, marketplace, businesses, events]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl md:text-4xl font-extrabold text-ink">Analytics Dashboard</h1>
        <p className="text-sm text-ink/60 mt-1">
          Real-time user acquisition, listing submission velocity, and geographic distribution across Nigeria.
        </p>
      </div>

      {loading ? (
        <AdminDashboardSkeleton />
      ) : (
        <>
          <PlatformHealthCharts
            users={users}
            businesses={businesses}
            properties={properties}
            marketplace={marketplace}
            events={events}
          />

          <div className="card">
            <div className="mb-5">
              <h3 className="font-display text-lg font-bold text-ink">Top Active States by Vertical</h3>
              <p className="text-xs text-ink/60 mt-0.5">
                Distribution of properties, products, restaurants, and events across the top 10 states
              </p>
            </div>
            {topStatesData.length === 0 ? (
              <p className="text-sm text-ink/50">No state metrics recorded yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={topStatesData} margin={{ top: 8, right: 8, left: -12, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E0D4" vertical={false} />
                  <XAxis dataKey="state" tick={{ fontSize: 11, fill: '#6B6255' }} angle={-20} textAnchor="end" height={55} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6B6255' }} />
                  <Tooltip contentStyle={{ background: '#FFF', border: '1px solid #E8E0D4', borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="properties" name="Property" stackId="s" fill="#1E88E5" />
                  <Bar dataKey="products" name="Product" stackId="s" fill="#D9891F" />
                  <Bar dataKey="restaurants" name="Restaurant" stackId="s" fill="#ea580c" />
                  <Bar dataKey="events" name="Event" stackId="s" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      )}
    </div>
  );
}
