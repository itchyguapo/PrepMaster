import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Target, Award, BookOpen, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

type PerformanceData = {
  recentScores: Array<{ percentage: number; date: Date | string }>;
  averageScore: number;
  scoreTrend: "improving" | "declining" | "stable";
  totalAttempts: number;
  weakTopics: Array<{ subject: string; percentage: number }>;
  recentAverage: number;
  previousAverage: number;
};

export default function Analytics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [performance, setPerformance] = useState<PerformanceData | null>(null);

  useEffect(() => {
    const fetchPerformance = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`/api/exams/performance?supabaseId=${user.id}`);
        if (res.ok) {
          const data = await res.json();
          // Convert date strings to Date objects
          const processedData = {
            ...data,
            recentScores: data.recentScores.map((s: any) => ({
              ...s,
              date: s.date ? new Date(s.date) : new Date(),
            })),
          };
          setPerformance(processedData);
        } else {
          console.error("Failed to fetch performance data");
        }
      } catch (error) {
        console.error("Error fetching performance:", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchPerformance();
  }, [user]);

  // Prepare chart data
  const chartData = performance?.recentScores
    .slice()
    .reverse()
    .map((score) => ({
      date: new Date(score.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      score: Math.round(score.percentage),
    })) || [];

  // Calculate strong subjects (subjects with > 70% average)
  // For now, we'll use weak topics to infer strong ones, or show a message
  const strongSubjects: string[] = []; // Would need additional API endpoint for this
  const improvement = performance
    ? Math.round(performance.recentAverage - performance.previousAverage)
    : 0;

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground">Track your performance and identify areas for improvement.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : !performance || performance.totalAttempts === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Performance Data Yet</h3>
              <p className="text-muted-foreground">
                Complete some exams to see your analytics and track your progress over time.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{Math.round(performance.averageScore)}%</div>
                  <p className="text-xs text-muted-foreground">
                    {improvement > 0 ? (
                      <span className="text-green-600 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" /> +{improvement}% vs previous
                      </span>
                    ) : improvement < 0 ? (
                      <span className="text-red-600 flex items-center gap-1">
                        <TrendingDown className="h-3 w-3" /> {improvement}% vs previous
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Stable performance</span>
                    )}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Exams</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{performance.totalAttempts}</div>
                  <p className="text-xs text-muted-foreground">Completed exams</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Performance Trend</CardTitle>
                  <Award className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold capitalize">{performance.scoreTrend}</div>
                  <p className="text-xs text-muted-foreground">
                    Recent: {Math.round(performance.recentAverage)}% | Previous: {Math.round(performance.previousAverage)}%
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Over Time</CardTitle>
                <CardDescription>Your recent exam scores (last 5 attempts)</CardDescription>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Line type="monotone" dataKey="score" stroke="#8884d8" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No performance data yet. Complete some exams to see your progress!
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Subject Analysis */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Areas for Improvement</CardTitle>
                  <CardDescription>Subjects that need more practice (below 60%)</CardDescription>
                </CardHeader>
                <CardContent>
                  {performance.weakTopics.length > 0 ? (
                    <div className="space-y-4">
                      {performance.weakTopics.map((topic) => (
                        <div key={topic.subject}>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium">{topic.subject}</span>
                            <span className="text-sm text-muted-foreground">{topic.percentage}%</span>
                          </div>
                          <Progress value={topic.percentage} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1">
                            Focus on reviewing {topic.subject} concepts
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-green-600 font-medium mb-2">Great job! 🎉</p>
                      <p className="text-sm text-muted-foreground">
                        You're performing well in all subjects. Keep up the excellent work!
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Performance Insights</CardTitle>
                  <CardDescription>Key metrics and recommendations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Recent Average</span>
                      <span className="text-sm font-bold">{Math.round(performance.recentAverage)}%</span>
                    </div>
                    <Progress value={performance.recentAverage} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Overall Average</span>
                      <span className="text-sm font-bold">{Math.round(performance.averageScore)}%</span>
                    </div>
                    <Progress value={performance.averageScore} className="h-2" />
                  </div>
                  {performance.scoreTrend === "improving" && (
                    <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                      <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                        📈 Your scores are improving! Keep practicing to maintain this momentum.
                      </p>
                    </div>
                  )}
                  {performance.scoreTrend === "declining" && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                      <p className="text-sm text-yellow-700 dark:text-yellow-400 font-medium">
                        ⚠️ Your recent scores have declined. Review weak topics and practice more.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}

