import { useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";

interface FileUploadProps {
  userId: number;
  onSuccess?: (path: string) => void;
  onError?: (error: Error) => void;
}

export function FileUpload({ userId, onSuccess, onError }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);

  const uploadMutation = api.upload.uploadPassportPhoto.useMutation({
    onSuccess: (data) => {
      setIsUploading(false);
      onSuccess?.(data.path);
    },
    onError: (error) => {
      setIsUploading(false);
      onError?.(error);
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();

    reader.onloadend = () => {
      const base64 = reader.result as string;
      uploadMutation.mutate({
        userId,
        file: {
          name: file.name,
          type: file.type,
          base64,
        },
      });
    };

    reader.readAsDataURL(file);
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        id="passport-photo-upload"
      />
      <label htmlFor="passport-photo-upload">
        <Button
          variant="outline"
          disabled={isUploading}
          className="cursor-pointer"
          asChild
        >
          <span>
            {isUploading ? "Загрузка..." : "Загрузить фото паспорта"}
          </span>
        </Button>
      </label>
    </div>
  );
}
