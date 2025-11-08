import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    positive: boolean;
  };
  testId?: string;
}

export function StatsCard({ title, value, icon: Icon, trend, testId }: StatsCardProps) {
  return (
    <Card className="card-gradient-overlay shadow-[0_0_20px_-5px_rgba(99,179,237,0.3)] hover:shadow-[0_0_30px_-5px_rgba(99,179,237,0.5),0_0_60px_-10px_rgba(99,179,237,0.3)] transition-all duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </CardTitle>
        <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg">
          <Icon className="w-5 h-5 text-primary-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold font-mono gradient-text" data-testid={testId}>
          {value}
        </div>
        {trend && (
          <p className={`text-xs ${trend.positive ? 'text-chart-2' : 'text-destructive'} mt-1 font-medium`}>
            {trend.value}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
