import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, DollarSign, CreditCard, Loader2, RefreshCw } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/adminApi";

type FinanceOverview = {
  monthlyRevenue: number;
  revenueChange: number;
  avgRevenuePerUser: number;
  arpuChange: number;
  totalActiveSubscriptions: number;
  revenueData: Array<{ name: string; amount: number }>;
};

type Transaction = {
  id: string;
  user: string;
  plan: string;
  amount: string;
  date: string;
  status: string;
  createdAt: string | Date;
};

export default function Finance() {
  const { toast } = useToast();
  const [overview, setOverview] = useState<FinanceOverview | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFinanceData = async (showLoading = false) => {
    if (showLoading) setRefreshing(true);
    setLoading(true);
    try {
      // Fetch overview
      const overviewRes = await adminFetch("/api/admin/finance/overview");
      if (overviewRes.ok) {
        const overviewData = await overviewRes.json();
        setOverview(overviewData);
      } else {
        console.error("Failed to fetch finance overview");
        toast({
          title: "Error",
          description: "Failed to load finance overview.",
          variant: "destructive",
        });
      }

      // Fetch transactions
      const transactionsRes = await adminFetch("/api/admin/finance/transactions?limit=20");
      if (transactionsRes.ok) {
        const transactionsData = await transactionsRes.json();
        setTransactions(transactionsData);
      } else {
        console.error("Failed to fetch transactions");
      }
    } catch (err) {
      console.error("Error fetching finance data:", err);
      toast({
        title: "Error",
        description: "Failed to load finance data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      if (showLoading) setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchFinanceData();
  }, []);

  const handleExport = async (format: "csv" | "json" = "csv") => {
    try {
      const res = await adminFetch(`/api/admin/finance/export?format=${format}`);
      if (res.ok) {
        if (format === "csv") {
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `finance-report-${new Date().toISOString().split("T")[0]}.csv`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        } else {
          const data = await res.json();
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `finance-report-${new Date().toISOString().split("T")[0]}.json`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }
        toast({
          title: "Export Successful",
          description: `Financial report exported as ${format.toUpperCase()}.`,
        });
      } else {
        throw new Error("Export failed");
      }
    } catch (err) {
      console.error("Error exporting finance data:", err);
      toast({
        title: "Export Failed",
        description: "Failed to export financial report.",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading && !overview) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading finance data...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold font-display">Financial Overview</h1>
            <p className="text-muted-foreground">Track revenue, subscriptions, and payouts.</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => void fetchFinanceData(true)}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="outline" onClick={() => void handleExport("csv")}>
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
            <Button variant="outline" onClick={() => void handleExport("json")}>
              <Download className="mr-2 h-4 w-4" /> Export JSON
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {overview ? formatCurrency(overview.monthlyRevenue) : "₦0"}
              </div>
              <p className={`text-xs ${overview && overview.revenueChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                {overview && overview.revenueChange !== 0 
                  ? `${overview.revenueChange >= 0 ? "+" : ""}${overview.revenueChange.toFixed(1)}% from last month`
                  : "No change"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Revenue Per User</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {overview ? formatCurrency(overview.avgRevenuePerUser) : "₦0"}
              </div>
              <p className={`text-xs ${overview && overview.arpuChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                {overview && overview.arpuChange !== 0
                  ? `${overview.arpuChange >= 0 ? "+" : ""}${overview.arpuChange.toFixed(1)}% from last month`
                  : "No change"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {overview ? overview.totalActiveSubscriptions : 0}
              </div>
              <p className="text-xs text-muted-foreground">Currently active</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Growth (Last 6 Months)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {overview && overview.revenueData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={overview.revenueData}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                        itemStyle={{ color: 'hsl(var(--primary))' }}
                        formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                      />
                      <Area type="monotone" dataKey="amount" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorRevenue)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No revenue data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length > 0 ? (
                <div className="space-y-4">
                  {transactions.map((txn) => (
                    <div key={txn.id} className="flex items-center justify-between border-b last:border-0 pb-4 last:pb-0">
                      <div className="flex items-center gap-4">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                          txn.status === 'Success' ? 'bg-green-100 text-green-600' : 
                          txn.status === 'Cancelled' ? 'bg-yellow-100 text-yellow-600' : 
                          'bg-red-100 text-red-600'
                        }`}>
                          {txn.status === 'Success' ? <DollarSign className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
                        </div>
                        <div>
                          <p className="font-medium">{txn.user}</p>
                          <p className="text-xs text-muted-foreground">{txn.plan} • {txn.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{txn.amount}</p>
                        <p className={`text-xs ${
                          txn.status === 'Success' ? 'text-green-600' : 
                          txn.status === 'Cancelled' ? 'text-yellow-600' : 
                          'text-red-600'
                        }`}>
                          {txn.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No transactions found
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
