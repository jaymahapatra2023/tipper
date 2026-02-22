'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { ControllerRenderProps } from 'react-hook-form';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { useMediaQuery } from '@/hooks/use-media-query';

interface DatePickerProps {
  field: ControllerRenderProps;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function DatePicker({
  field,
  disabled,
  placeholder = 'Pick a date',
  className,
}: DatePickerProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [open, setOpen] = React.useState(false);

  if (isMobile) {
    return (
      <Input
        type="date"
        value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
        onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
        disabled={disabled}
        className={className}
      />
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={'outline'}
          className={cn(
            'w-full justify-start text-left font-normal',
            !field.value && 'text-muted-foreground',
            className,
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {field.value ? format(field.value, 'PPP') : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={field.value}
          onSelect={(day) => {
            field.onChange(day);
            setOpen(false);
          }}
          autoFocus
          disabled={disabled}
        />
      </PopoverContent>
    </Popover>
  );
}
