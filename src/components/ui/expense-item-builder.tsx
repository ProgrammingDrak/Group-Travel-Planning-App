"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, DollarSign, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ExpenseItem {
  id: string;
  label: string;
  amount: number;
  type: "per_person" | "communal";
}

interface ExpenseItemBuilderProps {
  items: ExpenseItem[];
  onChange: (items: ExpenseItem[]) => void;
  className?: string;
}

export function ExpenseItemBuilder({
  items,
  onChange,
  className,
}: ExpenseItemBuilderProps) {
  const [addingType, setAddingType] = useState<"per_person" | "communal" | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newAmount, setNewAmount] = useState("");

  const totalBudget = items.reduce((sum, item) => sum + item.amount, 0);

  const communalTotal = items
    .filter((i) => i.type === "communal")
    .reduce((sum, i) => sum + i.amount, 0);

  const perPersonTotal = items
    .filter((i) => i.type === "per_person")
    .reduce((sum, i) => sum + i.amount, 0);

  const handleAdd = () => {
    if (!addingType || !newAmount) return;
    const amount = parseFloat(newAmount);
    if (isNaN(amount) || amount <= 0) return;

    const item: ExpenseItem = {
      id: `expense-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      label: newLabel.trim() || (addingType === "per_person" ? "Per Person" : "Communal"),
      amount,
      type: addingType,
    };

    onChange([...items, item]);
    setNewLabel("");
    setNewAmount("");
    setAddingType(null);
  };

  const handleRemove = (id: string) => {
    onChange(items.filter((i) => i.id !== id));
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Budget summary */}
      <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            Total: ${totalBudget.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            Communal: ${communalTotal.toFixed(2)}
          </span>
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            Per Person: ${perPersonTotal.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Existing items */}
      {items.length > 0 && (
        <div className="space-y-1.5">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 rounded-md border px-3 py-2"
            >
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] px-1.5",
                  item.type === "communal"
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-green-50 text-green-700 border-green-200"
                )}
              >
                {item.type === "communal" ? (
                  <Users className="h-2.5 w-2.5 mr-0.5" />
                ) : (
                  <User className="h-2.5 w-2.5 mr-0.5" />
                )}
                {item.type === "communal" ? "Communal" : "Per Person"}
              </Badge>
              <span className="text-sm flex-1 truncate">{item.label}</span>
              <span className="text-sm font-medium">
                ${item.amount.toFixed(2)}
              </span>
              <button
                type="button"
                onClick={() => handleRemove(item.id)}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add new expense form */}
      {addingType ? (
        <div className="rounded-md border p-3 space-y-2 bg-muted/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium flex items-center gap-1">
              {addingType === "communal" ? (
                <>
                  <Users className="h-3 w-3" /> New Communal Expense
                </>
              ) : (
                <>
                  <User className="h-3 w-3" /> New Per Person Expense
                </>
              )}
            </span>
            <button
              type="button"
              onClick={() => {
                setAddingType(null);
                setNewLabel("");
                setNewAmount("");
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Label</Label>
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder={addingType === "per_person" ? "Per Person" : "Communal"}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Amount ($)</Label>
              <Input
                type="number"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="h-8 text-sm"
              />
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            className="w-full h-7 text-xs"
            onClick={handleAdd}
            disabled={!newAmount || parseFloat(newAmount) <= 0}
          >
            Add Expense
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1 text-xs gap-1"
            onClick={() => setAddingType("communal")}
          >
            <Users className="h-3.5 w-3.5" />
            Add Communal Expense
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1 text-xs gap-1"
            onClick={() => setAddingType("per_person")}
          >
            <User className="h-3.5 w-3.5" />
            Add Per Person Expense
          </Button>
        </div>
      )}
    </div>
  );
}
