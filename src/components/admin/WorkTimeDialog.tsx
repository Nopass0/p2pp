'use client';

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/trpc/react";
import Image from "next/image";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { FileIcon, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WorkTimeDialogProps {
  userId: number;
  isOpen: boolean;
  onClose: () => void;
}

export function WorkTimeDialog({ userId, isOpen, onClose }: WorkTimeDialogProps) {
  const { data: workTimes } = api.admin.getUserWorkTimes.useQuery({ userId });

  const renderFile = (file: { filename: string; path: string }) => {
    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(file.filename);
    const isPdf = /\.pdf$/i.test(file.filename);

    if (isImage) {
      return (
        <div className="relative h-32 w-32 overflow-hidden rounded-lg">
          <Image
            src={file.path}
            alt={file.filename}
            fill
            className="object-cover"
          />
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 rounded-lg border p-3">
        <FileIcon className="h-4 w-4" />
        <span className="text-sm">{file.filename}</span>
        <Button
          variant="ghost"
          size="sm"
          asChild
        >
          <a href={file.path} target="_blank" rel="noopener noreferrer" download>
            {isPdf ? "Открыть" : "Скачать"}
          </a>
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>История работы сотрудника</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[600px] pr-4">
          <div className="space-y-6">
            {workTimes?.map((workTime) => (
              <div key={workTime.id} className="rounded-lg border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(workTime.startTime), "d MMMM yyyy", { locale: ru })}
                    </div>
                    <div className="font-medium">
                      {format(new Date(workTime.startTime), "HH:mm")} -{" "}
                      {workTime.endTime
                        ? format(new Date(workTime.endTime), "HH:mm")
                        : "В процессе"}
                    </div>
                  </div>
                  <div className={`h-2 w-2 rounded-full ${workTime.endTime ? "bg-red-500" : "bg-green-500"}`} />
                </div>
                {workTime.report && (
                  <div className="mt-4">
                    <div className="mb-2 text-sm font-medium">Отчет:</div>
                    <p className="text-sm text-muted-foreground">{workTime.report.content}</p>
                    {workTime.report.files.length > 0 && (
                      <div className="mt-4">
                        <div className="mb-2 text-sm font-medium">Файлы:</div>
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                          {workTime.report.files.map((file) => (
                            <div key={file.id}>{renderFile(file)}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
