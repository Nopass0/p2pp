"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface DateTimePickerProps {
  date: Date
  setDate: (date: Date) => void
  label?: string
}

export function DateTimePicker({
  date,
  setDate,
  label
}: DateTimePickerProps) {
  return (
    <div className="flex flex-row items-center mr-2 gap-4">
      {label && <Label>{label}</Label>}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-[280px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "PPp") : <span>Pick date and time</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(newDate) => newDate && setDate(new Date(newDate.setHours(date.getHours(), date.getMinutes())))}
            initialFocus
          />
          <div className="p-3 border-t border-border">
            <div className="flex items-center gap-2">
              <Input
                type="time"
                value={format(date, "HH:mm")}
                onChange={(e) => {
                  const [hours, minutes] = e.target.value.split(":")
                  const newDate = new Date(date)
                  newDate.setHours(parseInt(hours), parseInt(minutes))
                  setDate(newDate)
                }}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
