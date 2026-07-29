"use client";

import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function VotesBarChart({
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
  const option = {
    tooltip: { trigger: "axis" },
    legend: series.length > 1 ? { bottom: 0 } : undefined,
    grid: { left: 8, right: 16, top: 24, bottom: series.length > 1 ? 32 : 8, containLabel: true },
    xAxis: { type: "category", data: categories, axisLabel: { rotate: 20 } },
    yAxis: { type: "value" },
    series: series.map((s) => ({
      name: s.name,
      type: "bar",
      data: s.data,
    })),
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ReactECharts option={option} style={{ height: 280 }} notMerge />
      </CardContent>
    </Card>
  );
}
