"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { env } from "@/env";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (!reader.result) {
        return reject("No result from FileReader");
      }
      // e.g. "data:application/octet-stream;base64,AAAA..."
      const base64String = (reader.result as string).split(",")[1];
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

export default function ApplicationVersionPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [version, setVersion] = useState("");
  const [uploading, setUploading] = useState(false);

  const utils = api.useContext();

  const { data: versions, isLoading } = api.admin.getAppVersions.useQuery();

  // This TRPC mutation (uploadVersionMutation) is presumably saving record in your local DB
  const uploadVersionMutation = api.admin.uploadAppVersion.useMutation({
    onSuccess: () => {
      toast.success("Version uploaded successfully");
      setFile(null);
      setVersion("");
      utils.admin.getAppVersions.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Another TRPC call that sets a version as main
  const setMainVersionMutation = api.admin.setMainVersion.useMutation({
    onSuccess: () => {
      toast.success("Main version updated");
      utils.admin.getAppVersions.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleUpload = async () => {
    if (!file || !version) {
      toast.error("Please select a file and enter a version number");
      return;
    }

    setUploading(true);
    try {
      // 1) Convert the file to a base64 string
      const fileBase64 = await fileToBase64(file);

      // 2) Build the request payload for the Bun server
      const payload = {
        fileContent: fileBase64,
        fileName: file.name,
        version,
        userId: 123, // or from your login session
      };

      // 3) Send the POST to your Bun server
      const response = await fetch(`${env.NEXT_PUBLIC_SERVICES_URL}/addVersion`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      // If the server or route is unreachable or doesn't exist, you'll get a 404
      if (!response.ok) {
        throw new Error("Failed to upload file");
      }

      // 4) Expect { hash, downloadUrl } from the server
      const { hash, downloadUrl } = await response.json();

      // 5) (Optional) Create a new record in your local DB with TRPC
      await uploadVersionMutation.mutateAsync({
        version,
        fileName: file.name,
        hash,
        downloadUrl,
      });

      toast.success("Version uploaded successfully");
      setFile(null);
      setVersion("");
    } catch (error) {
      toast.error("Failed to upload version");
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Upload New Version</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="version">Version</Label>
              <Input
                id="version"
                placeholder="1.0.0"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="file">Application File</Label>
              <Input
                id="file"
                type="file"
                accept=".exe,.zip"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
            <Button
              onClick={handleUpload}
              disabled={uploading || !file || !version}
            >
              {uploading ? "Uploading..." : "Upload Version"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Version History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>File Name</TableHead>
                <TableHead>Uploaded By</TableHead>
                <TableHead>Upload Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {versions?.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>{v.version}</TableCell>
                  <TableCell>{v.fileName}</TableCell>
                  <TableCell>
                    {v.user.firstName} {v.user.lastName}
                  </TableCell>
                  <TableCell>
                    {format(new Date(v.createdAt), "dd.MM.yyyy HH:mm")}
                  </TableCell>
                  <TableCell>
                    {v.isMain && <Badge>Main Version</Badge>}
                  </TableCell>
                  <TableCell className="space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(v.downloadUrl, "_blank")}
                    >
                      Download
                    </Button>
                    {!v.isMain && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setMainVersionMutation.mutate({ id: v.id })
                        }
                      >
                        Set as Main
                      </Button>
                    )}
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
