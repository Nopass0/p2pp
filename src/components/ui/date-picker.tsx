"use client";

import * as React from "react";
import { addDays, format } from "date-fns";
import { ru } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
//@ts-ignore
interface DatePickerWithRangeProps
  extends React.HTMLAttributes<HTMLDivElement> {
  value?: DateRange;
  onChange?: (date: DateRange | undefined) => void;
}

export function DatePickerWithRange({
  className,
  value,
  onChange,
}: DatePickerWithRangeProps) {
  const [date, setDate] = React.useState<DateRange | undefined>(
    value || {
      from: undefined,
      to: undefined,
    },
  );

  // Обработка изменений даты
  const handleDateChange = (newDate: DateRange | undefined) => {
    setDate(newDate);
    onChange?.(newDate);
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "d MMM yyyy", { locale: ru })} -{" "}
                  {format(date.to, "d MMM yyyy", { locale: ru })}
                </>
              ) : (
                format(date.from, "d MMM yyyy", { locale: ru })
              )
            ) : (
              <span>Выберите период</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleDateChange}
            numberOfMonths={2}
            locale={ru}
            fromDate={new Date(2020, 0, 1)} // Минимальная дата
            toDate={new Date()} // Максимальная дата (сегодня)
            disabled={(date) =>
              date > new Date() || date < new Date(2020, 0, 1)
            }
            classNames={{
              cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
              head_cell: "text-muted-foreground font-normal text-[0.8rem]",
              day: cn("h-9 w-9 p-0 font-normal aria-selected:opacity-100"),
              day_range_end: "day-range-end",
              day_selected:
                "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
              day_today: "bg-accent text-accent-foreground",
              day_outside: "text-muted-foreground opacity-50",
              day_disabled: "text-muted-foreground opacity-50",
              day_range_middle:
                "aria-selected:bg-accent aria-selected:text-accent-foreground",
              day_hidden: "invisible",
              nav_button:
                "border-1 p-1 hover:bg-accent hover:text-accent-foreground",
              nav_button_previous: "absolute left-1",
              nav_button_next: "absolute right-1",
              caption: "relative flex justify-center pt-1 px-10",
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
