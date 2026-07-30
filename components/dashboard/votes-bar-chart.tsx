"use client";

import { memo, useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function VotesBarChartComponent({
  title,
  categories,
  series,
  isLoading,
}: {
  title: string;
  categories: string[];
  series: { name: string; data: number[] }[];
  isLoading?: boolean;
}) {
  const option = useMemo(
    () => ({
      tooltip: { trigger: "axis" },
      legend: series.length > 1 ? { bottom: 0 } : undefined,
      grid: {
        left: 8,
        right: 16,
        top: 24,
        bottom: series.length > 1 ? 32 : 8,
        containLabel: true,
      },
      xAxis: { type: "category", data: categories, axisLabel: { rotate: 20 } },
      yAxis: { type: "value" },
      series: series.map((s) => ({
        name: s.name,
        type: "bar",
        data: s.data,
      })),
    }),
    [categories, series]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[280px] w-full" />
        ) : (
          <ReactECharts option={option} style={{ height: 280 }} notMerge />
        )}
      </CardContent>
    </Card>
  );
}

export const VotesBarChart = memo(VotesBarChartComponent);
