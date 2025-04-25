import React from 'react';
import { cn } from '@/lib/utils';
import { Book } from '@/lib/supabase';
import { Progress } from '@/components/ui/progress';

interface ProgressCircleProps {
  book: Book;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ProgressCircle({ book, size = "md", className }: ProgressCircleProps) {
  const progress = book.current_page && book.page_count
    ? (book.current_page / book.page_count) * 100
    : 0;

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16"
  };

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <div className={cn("relative rounded-full bg-muted", sizeClasses[size])}>
        <div className="absolute inset-0">
          <Progress
            value={progress}
            className="h-full rounded-full"
          />
        </div>
        <div className="absolute inset-0 flex items-center justify-center text-xs font-medium">
          {Math.round(progress)}%
        </div>
      </div>
      {book.current_page !== undefined && book.page_count && (
        <div className="text-xs text-gray-500">
          {book.current_page}/{book.page_count}
        </div>
      )}
    </div>
  );
} 