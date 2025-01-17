"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/trpc/react";
import { DateRangePicker } from "@/components/ui/date-picker";

interface CustomMetricsProps {
  dateRange: { from: Date; to: Date };
}

export function CustomMetrics({ dateRange }: CustomMetricsProps) {
  const [newMetric, setNewMetric] = useState({
    name: "",
    formula: "",
    description: "",
  });
  const [selectedMetricId, setSelectedMetricId] = useState<number | null>(null);

  const { data: customMetrics, refetch } =
    api.admin.getCustomMetrics.useQuery();
  const createCustomMetric = api.admin.createCustomMetric.useMutation({
    onSuccess: () => refetch(),
  });
  const calculateCustomMetric = api.admin.calculateCustomMetric.useQuery(
    {
      metricId: selectedMetricId!,
      startDate: dateRange.from,
      endDate: dateRange.to,
    },
    { enabled: !!selectedMetricId },
  );

  const handleAddMetric = () => {
    createCustomMetric.mutate(newMetric);
    setNewMetric({ name: "", formula: "", description: "" });
  };

  return (
    <div className="h-full space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Добавить новую метрику</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="metricName">Название метрики</Label>
              <Input
                id="metricName"
                value={newMetric.name}
                onChange={(e) =>
                  setNewMetric({ ...newMetric, name: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="metricFormula">Формула</Label>
              <Input
                id="metricFormula"
                value={newMetric.formula}
                onChange={(e) =>
                  setNewMetric({ ...newMetric, formula: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="metricDescription">Описание</Label>
              <Input
                id="metricDescription"
                value={newMetric.description}
                onChange={(e) =>
                  setNewMetric({ ...newMetric, description: e.target.value })
                }
              />
            </div>
          </div>
          <Button onClick={handleAddMetric} className="mt-4">
            Добавить метрику
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Рассчитать метрику</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="metricSelect">Выберите метрику</Label>
              <select
                id="metricSelect"
                value={selectedMetricId || ""}
                onChange={(e) => setSelectedMetricId(Number(e.target.value))}
                className="w-full rounded border p-2"
              >
                <option value="">Выберите метрику</option>
                {customMetrics?.map((metric) => (
                  <option key={metric.id} value={metric.id}>
                    {metric.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {calculateCustomMetric.data && (
            <div className="mt-4">
              <h3 className="font-bold">{calculateCustomMetric.data.name}</h3>
              <p>Значение: {calculateCustomMetric.data.value}</p>
              <p>Формула: {calculateCustomMetric.data.formula}</p>
              <p>Описание: {calculateCustomMetric.data.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Существующие метрики</CardTitle>
        </CardHeader>
        <CardContent>
          {customMetrics?.map((metric) => (
            <div key={metric.id} className="mb-4">
              <h3 className="font-bold">{metric.name}</h3>
              <p>Формула: {metric.formula}</p>
              <p>Описание: {metric.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
