import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

interface DateRangePickerProps {
  start: string
  end: string
  onStartChange: (value: string) => void
  onEndChange: (value: string) => void
  className?: string
}

export function DateRangePicker({
  start,
  end,
  onStartChange,
  onEndChange,
  className,
}: DateRangePickerProps) {
  return (
    <div className={className}>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start-date">Start Date</Label>
          <Input
            id="start-date"
            type="date"
            value={start}
            onChange={(e) => onStartChange(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end-date">End Date</Label>
          <Input
            id="end-date"
            type="date"
            value={end}
            onChange={(e) => onEndChange(e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}

