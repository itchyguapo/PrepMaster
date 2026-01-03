import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Activity,
  ArrowUpRight,
  UserCheck,
  RefreshCw,
  Building2
} from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/adminApi";

type DashboardStats = {
  totalRevenue: number;
  revenueChange: number;
  activeSubscriptions: number;
  subscriptionsChange: number;
  questionsInBank: number;
  questionsChange: number;
  activeTutors: number;
  tutorsChange: number;
  subscriptionGrowth: number[];
  recentActivity: Array<{
    user: string;
    action: string;
    time: string;
  }>;
  pendingInquiries?: number;
};

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async (showLoading = false) => {
    if (showLoading) setRefreshing(true);
    setError(null);
    try {
      console.log("[ADMIN DASHBOARD] Fetching stats...");
      const res = await adminFetch("/api/admin/stats");
      console.log("[ADMIN DASHBOARD] Response status:", res.status);
      
      if (res.ok) {
        const data = await res.json();
        console.log("[ADMIN DASHBOARD] Stats received:", data);
        setStats(data);
        setError(null);
      } else {
        let errorMessage = `HTTP ${res.status}: ${res.statusText}`;
        let errorData: any = null;
        
        try {
          const contentType = res.headers.get("content-type");
          if (contentType?.includes("application/json")) {
            errorData = await res.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
            
            // Add help message if available
            if (errorData.help) {
              errorMessage += `\n\n💡 ${errorData.help}`;
            }
            
            // Add debug info in development
            if (errorData.debug && process.env.NODE_ENV === "development") {
              console.error("[ADMIN DASHBOARD] Debug info:", errorData.debug);
              errorMessage += `\n\nDebug: ${JSON.stringify(errorData.debug, null, 2)}`;
            }
          } else {
            const errorText = await res.text().catch(() => "");
            errorMessage = errorText || errorMessage;
          }
        } catch (parseError) {
          console.error("[ADMIN DASHBOARD] Error parsing response:", parseError);
          const errorText = await res.text().catch(() => "");
          errorMessage = errorText || errorMessage;
        }
        
        console.error("[ADMIN DASHBOARD] Error response:", errorData || errorMessage);
        setError(errorMessage);
        setStats(null);
        
        // If 403, suggest checking diagnostic endpoint
        if (res.status === 403) {
          console.warn("[ADMIN DASHBOARD] 💡 Tip: Check /api/admin/diagnostic?supabaseId=YOUR_ID for detailed admin status");
        }
      }
    } catch (err: any) {
      console.error("[ADMIN DASHBOARD] Exception:", err);
      setError(err.message || "Failed to connect to server. Please check your connection and try again.");
      setStats(null);
    } finally {
      if (showLoading) setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchStats();
    
    // Refresh stats every 30 seconds
    const interval = setInterval(() => {
      void fetchStats();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-8">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading dashboard stats...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!stats) {
    return (
      <AdminLayout>
        <div className="space-y-8">
          <div className="text-center py-12 space-y-4">
            <p className="text-muted-foreground">Failed to load dashboard stats.</p>
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 max-w-md mx-auto space-y-2">
                <p className="text-sm text-destructive font-medium">Error:</p>
                <p className="text-sm text-muted-foreground">{error}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Check the browser console (F12) and server logs for more details.
                </p>
              </div>
            )}
            <Button onClick={() => void fetchStats(true)} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold font-display">System Overview</h1>
            <p className="text-muted-foreground">Welcome back, Administrator.</p>
          </div>
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => void fetchStats(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">
                {stats.revenueChange >= 0 ? "+" : ""}{stats.revenueChange.toFixed(1)}% from last month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+{stats.activeSubscriptions}</div>
              <p className="text-xs text-muted-foreground">
                +{stats.subscriptionsChange} new this week
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Questions in Bank</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.questionsInBank.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                +{stats.questionsChange} added recently
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Tutors</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeTutors}</div>
              <p className="text-xs text-muted-foreground">
                {stats.tutorsChange > 0 ? `+${stats.tutorsChange} new` : "No changes"} this week
              </p>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setLocation("/admin/tutor-inquiries")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Inquiries</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingInquiries || 0}</div>
              <p className="text-xs text-muted-foreground">
                Tutor & school quotes
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Subscription Growth</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-[200px] flex items-end justify-between gap-2 px-4">
                {stats.subscriptionGrowth.map((h, i) => (
                   <div key={i} className="w-full bg-primary/20 hover:bg-primary/30 rounded-t-sm transition-all relative group" style={{ height: `${Math.max(5, h)}%` }}>
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-popover text-popover-foreground text-xs p-1 rounded border shadow-sm">
                        {h} Users
                      </div>
                   </div>
                ))}
              </div>
              <div className="flex justify-between mt-2 text-xs text-muted-foreground px-4">
                <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
              </div>
            </CardContent>
          </Card>
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                System events and alerts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {stats.recentActivity.length > 0 ? (
                  stats.recentActivity.map((item, i) => (
                    <div key={i} className="flex items-center">
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">{item.action}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.user} • {item.time}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No recent activity</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
