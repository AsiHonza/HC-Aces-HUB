import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StatAdjusterProps {
  value: string;
  onChange: (val: string) => void;
  min?: number;
  max?: number;
  className?: string;
}

export function StatAdjuster({
  value,
  onChange,
  min = 0,
  max,
  className,
}: StatAdjusterProps) {
  const num = parseInt(value || '0', 10);

  const updateValue = (delta: number) => {
    let newVal = num + delta;
    if (min !== undefined && newVal < min) newVal = min;
    if (max !== undefined && newVal > max) newVal = max;
    onChange(String(newVal));
  };

  return (
    <div className={cn('flex items-center justify-center gap-1.5', className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-7 w-7"
        onClick={() => updateValue(-1)}
        aria-label="Snížit hodnotu"
      >
        <Minus className="h-3 w-3" />
      </Button>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => e.target.select()}
        className="w-14 h-7 text-center font-bold text-sm px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-7 w-7"
        onClick={() => updateValue(1)}
        aria-label="Zvýšit hodnotu"
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );
}
