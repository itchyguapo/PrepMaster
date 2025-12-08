import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowRight, 
  Target, 
  TrendingUp, 
  Clock, 
  Award,
  BookOpen,
  PlayCircle
} from "lucide-react";
import { Link } from "wouter";
import { Area, AreaChart, CartesianGrid, XAxis, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { name: "Mon", score: 45 },
  { name: "Tue", score: 52 },
  { name: "Wed", score: 48 },
  { name: "Thu", score: 61 },
  { name: "Fri", score: 55 },
  { name: "Sat", score: 67 },
  { name: "Sun", score: 72 },
];

export default function Dashboard() {
  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Welcome back, Chidimma! 👋</h1>
            <p className="text-muted-foreground mt-1">You're on a 5-day streak. Keep it up!</p>
          </div>
          <div className="flex gap-3">
             <Link href="/exam/simulation">
              <Button size="lg" variant="outline" className="border-primary/20 hover:bg-primary/5 hover:text-primary">
                <Clock className="mr-2 h-5 w-5" />
                Mock Exam
              </Button>
            </Link>
            <Link href="/exam">
              <Button size="lg" className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                <PlayCircle className="mr-2 h-5 w-5" />
                Quick Practice
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Overall Accuracy</p>
                  <h3 className="text-2xl font-bold font-display">68%</h3>
                </div>
              </div>
              <Progress value={68} className="mt-4 h-2 bg-primary/10" />
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-secondary/20 flex items-center justify-center text-secondary-foreground">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Study Time</p>
                  <h3 className="text-2xl font-bold font-display">12h 45m</h3>
                </div>
              </div>
              <p className="text-xs text-green-600 mt-4 font-medium flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" /> +2.5h this week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Questions Answered</p>
                  <h3 className="text-2xl font-bold font-display">1,248</h3>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-4">Top 10% of students</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Current Level</p>
                  <h3 className="text-2xl font-bold font-display">Scholar</h3>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-4">250xp to next level</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Performance Trend</CardTitle>
              <CardDescription>Your average score over the last 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="name" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      itemStyle={{ color: 'hsl(var(--primary))' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="score" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorScore)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Recommended Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Recommended Focus</CardTitle>
              <CardDescription>Based on your recent mistakes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { subject: "Mathematics", topic: "Quadratic Equations", difficulty: "Hard", color: "bg-red-100 text-red-700" },
                { subject: "English", topic: "Oral English", difficulty: "Medium", color: "bg-yellow-100 text-yellow-700" },
                { subject: "Physics", topic: "Waves & Optics", difficulty: "Hard", color: "bg-red-100 text-red-700" },
              ].map((item, i) => (
                <div key={i} className="group p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-accent/50 transition-all cursor-pointer">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="secondary" className="text-xs font-semibold">{item.subject}</Badge>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${item.color}`}>
                      {item.difficulty}
                    </span>
                  </div>
                  <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">{item.topic}</h4>
                  <div className="flex items-center text-xs text-muted-foreground mt-2 gap-1 group-hover:translate-x-1 transition-transform">
                    Start Practice <ArrowRight className="h-3 w-3" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Recent Exams */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-bold">Recent History</h2>
            <Button variant="ghost" className="text-primary hover:text-primary/80">View All</Button>
          </div>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {[
              { exam: "JAMB Mock 2024", subject: "Use of English", score: "58/60", date: "2 hours ago", status: "Completed" },
              { exam: "WAEC Past Question", subject: "General Mathematics", score: "35/50", date: "Yesterday", status: "Completed" },
              { exam: "Topic Test", subject: "Chemistry - Organic", score: "--", date: "In Progress", status: "Paused" },
            ].map((row, i) => (
              <div key={i} className="flex items-center justify-between p-4 border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold ${row.status === 'Paused' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                    {row.subject.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">{row.subject}</h4>
                    <p className="text-sm text-muted-foreground">{row.exam}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-right hidden sm:block">
                    <p className="font-medium text-foreground">{row.score}</p>
                    <p className="text-muted-foreground">{row.status}</p>
                  </div>
                  <Button size="sm" variant={row.status === 'Paused' ? 'default' : 'outline'}>
                    {row.status === 'Paused' ? 'Resume' : 'Review'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
