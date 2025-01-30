'use client';

import { api } from "@/trpc/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow, format } from "date-fns";
import { ru } from "date-fns/locale";
import { Separator } from "../ui/separator";

export function WorkStatus() {
  const [isLoading, setIsLoading] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportContent, setReportContent] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const { data: isWorkDone, refetch } = api.user.isWorkDone.useQuery();
  const { data: workHistory } = api.user.getWorkHistory.useQuery();
  
  const startWork = api.user.startWork.useMutation({
    onSuccess: () => {
      refetch();
      setIsLoading(false);
    },
  });

  const stopWork = api.user.stopWork.useMutation({
    onSuccess: () => {
      refetch();
      setIsLoading(false);
      setIsReportDialogOpen(false);
      setReportContent("");
      setSelectedFiles([]);
    },
  });

  const handleWorkAction = async () => {
    setIsLoading(true);
    if (isWorkDone?.isDone) {
      await startWork.mutateAsync({ startTime: new Date() });
    } else {
      setIsReportDialogOpen(true);
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleSubmitReport = async () => {
    if (!reportContent.trim()) {
      return;
    }

    setIsLoading(true);
    try {
      let uploadedFiles = [];
      
      // Only upload files if any were selected
      if (selectedFiles.length > 0) {
        const formData = new FormData();
        selectedFiles.forEach((file) => {
          formData.append("files", file);
        });

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        uploadedFiles = await uploadRes.json();
      }

      // Submit the report with file paths if any were uploaded
      await stopWork.mutateAsync({
        reportContent,
        files: uploadedFiles.map((file: { filename: string; path: string }) => ({
          filename: file.filename,
          path: file.path,
        })),
      });
    } catch (error) {
      console.error("Error submitting report:", error);
      setIsLoading(false);
    }
  };

  const getCurrentWorkDuration = () => {
    if (!workHistory?.[0] || workHistory[0].endTime || !workHistory[0].startTime) {
      return null;
    }

    const start = new Date(workHistory[0].startTime);
    const now = new Date();
    return formatDistanceToNow(start, { locale: ru });
  };

  return (
    <div className="mt-6">
      <div className="mb-4">
        {isWorkDone?.isDone ? (
          <Badge className="gap-2" variant="outline">
            {/* ofline dot */}
            <div className="bg-red-500 h-2 w-2 border-2 border-red-900/90 rounded-full p-1"></div>
            <p className={cn(isWorkDone.lastWorkEndDateTime !== null && "mr-2")}>
              Работа завершена
            </p>
            <Separator orientation="vertical" className="h-8 bg-background/50" />

            {isWorkDone.lastWorkEndDateTime !== null && (
              <p>
                Последняя работа завершена:{" "}
                {format(new Date(isWorkDone.lastWorkEndDateTime), "dd.MM.yyyy HH:mm", {
                  locale: ru,
                })}
              </p>
            )}
          </Badge>
        ) : (
          <Badge className="  gap-2" variant="secondary">
            {/* online dot */}
            <div className="bg-green-500 h-2 w-2 border-2 border-green-900/90 rounded-full p-1"></div>
            <p>В работе</p>
            <Separator orientation="vertical" className="h-8 bg-background/50" />
            {workHistory?.[0] && (
              <div className="text-sm">
                <p>
                  Начало:{" "}
                  {format(new Date(workHistory[0].startTime), "HH:mm", {
                    locale: ru,
                  })}
                </p>
                <p className="text-xs text-muted-foreground">
                  Длительность: {getCurrentWorkDuration()}
                </p>
              </div>
            )}
          </Badge>
        )}
      </div>

      <Button onClick={handleWorkAction} disabled={isLoading}>
        {isWorkDone?.isDone ? "Начать работу" : "Завершить работу"}
      </Button>

      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Отчет о работе</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Textarea
              placeholder="Опишите, что было сделано за сегодня..."
              value={reportContent}
              onChange={(e) => setReportContent(e.target.value)}
              className="min-h-[150px]"
            />
            <div>
              <Input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                multiple
                accept="image/*,.pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.ppt,.pptx,.xls,.xlsx"
                className="cursor-pointer"
              />
              <p className="mt-2 text-sm text-muted-foreground">
                {selectedFiles.length} файл(ов) выбрано
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleSubmitReport}
              disabled={isLoading || !reportContent.trim()}
            >
              {isLoading ? "Отправка..." : "Подтвердить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {workHistory && workHistory.length > 1 && (
        <div className="mt-6">
          <h3 className="mb-4 text-lg font-medium">История работы</h3>
          <ScrollArea className="h-[300px] rounded-md border p-4">
            {workHistory.slice(1).map((work) => (
              <div
                key={work.id}
                className="mb-4 rounded-lg border p-4 last:mb-0"
              >
                <div className="flex justify-between">
                  <div>
                    <p className="font-medium">
                      {format(new Date(work.startTime), "dd.MM.yyyy", {
                        locale: ru,
                      })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(work.startTime), "HH:mm", { locale: ru })} -{" "}
                      {work.endTime
                        ? format(new Date(work.endTime), "HH:mm", { locale: ru })
                        : "В процессе"}
                    </p>
                  </div>
                  {work.duration && (
                    <Badge variant="secondary">
                      {Math.round(work.duration * 10) / 10} ч
                    </Badge>
                  )}
                </div>
                {work.report && (
                  <div className="mt-2">
                    <p className="text-sm">{work.report.content}</p>
                    {work.report.files.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground">
                          Прикрепленные файлы:
                        </p>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {work.report.files.map((file) => (
                            <Badge key={file.id} variant="outline">
                              {file.filename}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
