import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, DollarSign, CreditCard } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { useToast } from "@/hooks/use-toast";

const revenueData = [
  { name: "Jan", amount: 1200000 },
  { name: "Feb", amount: 1500000 },
  { name: "Mar", amount: 1800000 },
  { name: "Apr", amount: 2100000 },
  { name: "May", amount: 2450000 },
  { name: "Jun", amount: 3200000 },
];

const transactions = [
  { id: "TXN-001", user: "Chidimma O.", plan: "Premium", amount: "₦4,000", date: "Today, 10:23 AM", status: "Success" },
  { id: "TXN-002", user: "Emmanuel K.", plan: "Basic", amount: "₦1,500", date: "Today, 09:15 AM", status: "Success" },
  { id: "TXN-003", user: "Sarah J.", plan: "Standard", amount: "₦2,500", date: "Yesterday", status: "Failed" },
  { id: "TXN-004", user: "David M.", plan: "Premium", amount: "₦4,000", date: "Yesterday", status: "Success" },
  { id: "TXN-005", user: "Grace P.", plan: "Standard", amount: "₦2,500", date: "2 days ago", status: "Success" },
];

export default function Finance() {
  const { toast } = useToast();

  const handleExport = () => {
    toast({
      title: "Export Started",
      description: "Financial report is being generated. It will download shortly.",
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold font-display">Financial Overview</h1>
            <p className="text-muted-foreground">Track revenue, subscriptions, and payouts.</p>
          </div>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export Report
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₦3,200,000</div>
              <p className="text-xs text-muted-foreground">+32% from last month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Revenue Per User</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₦2,150</div>
              <p className="text-xs text-muted-foreground">+5% from last month</p>
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₦0.00</div>
              <p className="text-xs text-muted-foreground">All payouts processed</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
             <CardHeader>
              <CardTitle>Revenue Growth</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData}>
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
                      formatter={(value) => [`₦${value}`, "Revenue"]}
                    />
                    <Area type="monotone" dataKey="amount" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
             <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {transactions.map((txn, i) => (
                  <div key={i} className="flex items-center justify-between border-b last:border-0 pb-4 last:pb-0">
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${txn.status === 'Success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {txn.status === 'Success' ? <DollarSign className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
                      </div>
                      <div>
                        <p className="font-medium">{txn.user}</p>
                        <p className="text-xs text-muted-foreground">{txn.plan} • {txn.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{txn.amount}</p>
                      <p className={`text-xs ${txn.status === 'Success' ? 'text-green-600' : 'text-red-600'}`}>{txn.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
