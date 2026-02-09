"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = {
  className?: string
  selected?: Date
  onSelect?: (date: Date | undefined) => void
  disabled?: (date: Date) => boolean
  month?: Date
  onMonthChange?: (date: Date) => void
}

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function isToday(date: Date): boolean {
  return isSameDay(date, new Date())
}

function Calendar({
  className,
  selected,
  onSelect,
  disabled,
  month: controlledMonth,
  onMonthChange,
}: CalendarProps) {
  const [internalMonth, setInternalMonth] = React.useState(
    () => controlledMonth || selected || new Date()
  )

  const currentMonth = controlledMonth || internalMonth
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  const setMonth = React.useCallback(
    (date: Date) => {
      if (onMonthChange) {
        onMonthChange(date)
      } else {
        setInternalMonth(date)
      }
    },
    [onMonthChange]
  )

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)

  const prevMonth = () => {
    setMonth(new Date(year, month - 1, 1))
  }

  const nextMonth = () => {
    setMonth(new Date(year, month + 1, 1))
  }

  const handleDayClick = (day: number) => {
    const date = new Date(year, month, day)
    if (disabled && disabled(date)) return
    if (onSelect) {
      if (selected && isSameDay(selected, date)) {
        onSelect(undefined)
      } else {
        onSelect(date)
      }
    }
  }

  const monthName = new Intl.DateTimeFormat("en-US", { month: "long" }).format(
    currentMonth
  )

  const days: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) {
    days.push(null)
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i)
  }

  const weeks: (number | null)[][] = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }
  // Pad last week
  const lastWeek = weeks[weeks.length - 1]
  while (lastWeek && lastWeek.length < 7) {
    lastWeek.push(null)
  }

  return (
    <div className={cn("p-3", className)}>
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={prevMonth}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-sm font-medium">
          {monthName} {year}
        </div>
        <button
          type="button"
          onClick={nextMonth}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {DAYS_OF_WEEK.map((day) => (
              <th
                key={day}
                className="text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] text-center"
              >
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, weekIdx) => (
            <tr key={weekIdx}>
              {week.map((day, dayIdx) => {
                if (day === null) {
                  return <td key={dayIdx} className="p-0 text-center" />
                }
                const date = new Date(year, month, day)
                const isSelected = selected ? isSameDay(selected, date) : false
                const isTodayDate = isToday(date)
                const isDisabled = disabled ? disabled(date) : false

                return (
                  <td key={dayIdx} className="p-0 text-center">
                    <button
                      type="button"
                      onClick={() => handleDayClick(day)}
                      disabled={isDisabled}
                      className={cn(
                        "inline-flex h-9 w-9 items-center justify-center rounded-md text-sm transition-colors",
                        "hover:bg-accent hover:text-accent-foreground",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isSelected &&
                          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                        isTodayDate &&
                          !isSelected &&
                          "bg-accent text-accent-foreground",
                        isDisabled &&
                          "text-muted-foreground opacity-50 cursor-not-allowed hover:bg-transparent"
                      )}
                    >
                      {day}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
