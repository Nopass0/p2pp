"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { format, isValid } from "date-fns";

export interface DateTimePickerProps {
  value: Date;
  onChange: (newDate: Date) => void;
  className?: string;
}

/**
 * DateTimePicker – компонент для выбора даты и времени.
 * Если переданная дата недействительна, используется новое Date().
 */
export function DateTimePicker({ value, onChange, className }: DateTimePickerProps) {
  // Если значение невалидное – используем новое Date()
  const validDate = isValid(value) ? value : new Date();
  // Форматирование для input type="datetime-local"
  const formattedValue = format(validDate, "yyyy-MM-dd'T'HH:mm");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    // Преобразуем строку в объект Date
    const parsedDate = new Date(newValue);
    if (isValid(parsedDate)) {
      onChange(parsedDate);
    }
  };

  return (
    <Input
      type="datetime-local"
      value={formattedValue}
      onChange={handleChange}
      className={className}
    />
  );
}
