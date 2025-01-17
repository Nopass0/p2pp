"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import { useToast } from "@/components/ui/use-toast";

export default function SettingsPage() {
  const [gatePercentage, setGatePercentage] = useState("");
  const { toast } = useToast();
  const updateGatePercentage = api.admin.updateGatePercentage.useMutation({
    //@ts-ignore

    onSuccess: () => {
      toast({ title: "Gate percentage updated successfully" });
    },
    onError: (error) => {
      toast({
        title: "Error updating gate percentage",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleGatePercentageUpdate = () => {
    //@ts-ignore

    updateGatePercentage.mutate({ percentage: parseFloat(gatePercentage) });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>Gate Percentage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Input
              type="number"
              value={gatePercentage}
              onChange={(e) => setGatePercentage(e.target.value)}
              placeholder="Enter gate percentage"
            />
            <Button onClick={handleGatePercentageUpdate}>Update</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
