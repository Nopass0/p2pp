"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

export default function AllowedDomainsPage() {
  const [newDomain, setNewDomain] = useState("");
  const utils = api.useContext();

  const { data: domains, isLoading } = api.admin.getAllowedDomains.useQuery();

  const addDomainMutation = api.admin.addAllowedDomain.useMutation({
    onSuccess: () => {
      toast.success("Domain added successfully");
      setNewDomain("");
      utils.admin.getAllowedDomains.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteDomainMutation = api.admin.deleteAllowedDomain.useMutation({
    onSuccess: () => {
      toast.success("Domain deleted successfully");
      utils.admin.getAllowedDomains.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain) {
      toast.error("Please enter a domain");
      return;
    }

    try {
      await addDomainMutation.mutateAsync({ domain: newDomain });
    } catch (error) {
      console.error("Failed to add domain:", error);
    }
  };

  const handleDeleteDomain = async (id: string) => {
    try {
      await deleteDomainMutation.mutateAsync({ id });
    } catch (error) {
      console.error("Failed to delete domain:", error);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Allowed Domains</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddDomain} className="mb-6 space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="domain">Domain URL</Label>
                <Input
                  id="domain"
                  placeholder="Enter domain (e.g., https://example.com)"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                />
              </div>
              <Button
                type="submit"
                className="mt-auto"
                disabled={addDomainMutation.isLoading}
              >
                Add Domain
              </Button>
            </div>
          </form>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Domain</TableHead>
                <TableHead>Added</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {domains?.map((domain) => (
                <TableRow key={domain.id}>
                  <TableCell>{domain.domain}</TableCell>
                  <TableCell>
                    {format(new Date(domain.createdAt), "dd.MM.yyyy HH:mm")}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteDomain(domain.id)}
                      disabled={deleteDomainMutation.isLoading}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}