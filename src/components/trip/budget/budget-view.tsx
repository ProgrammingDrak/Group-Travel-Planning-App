"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DollarSign,
  TrendingUp,
  Users,
  Download,
  PieChart,
  CheckCircle,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import type { Trip, Participant, CardWithVoteStats, Expense, ExpenseSplit } from "@/types";

interface BudgetViewProps {
  trip: Trip;
  cards: CardWithVoteStats[];
  participants: Participant[];
  tripId: string;
}

interface ExpenseWithDetails extends Expense {
  splits: (ExpenseSplit & { participant?: Participant })[];
  paid_by?: Participant;
  card_title?: string;
}

export function BudgetView({ trip, cards, participants }: BudgetViewProps) {
  const [expenses, setExpenses] = useState<ExpenseWithDetails[]>([]);
  const [, setLoading] = useState(true);

  const supabase = createClient();

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("expenses")
        .select(`
          *,
          expense_splits(*)
        `)
        .in("card_id", cards.map((c) => c.id));

      if (error) throw error;

      const enriched: ExpenseWithDetails[] = (data || []).map((exp) => {
        const paidBy = participants.find((p) => p.id === exp.paid_by_participant_id);
        const card = cards.find((c) => c.id === exp.card_id);
        const splits = ((exp as Record<string, unknown>).expense_splits as ExpenseSplit[] || []).map((split) => ({
          ...split,
          participant: participants.find((p) => p.id === split.participant_id),
        }));

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { expense_splits: _es, ...expData } = exp as Record<string, unknown>;
        return {
          ...expData,
          splits,
          paid_by: paidBy,
          card_title: card?.title,
        } as ExpenseWithDetails;
      });

      setExpenses(enriched);
    } catch {
      // Silently handle - empty expenses is fine
    } finally {
      setLoading(false);
    }
  }, [cards, participants, supabase]);

  useEffect(() => {
    if (cards.length > 0) {
      fetchExpenses();
    } else {
      setLoading(false);
    }
  }, [cards, fetchExpenses]);

  const totalSpent = useMemo(
    () => expenses.reduce((sum, e) => sum + Number(e.amount), 0),
    [expenses]
  );

  const isPerPerson = trip.budget_type === "per_person";
  const storedBudget = Number(trip.total_budget) || 0;
  const totalBudget = isPerPerson
    ? storedBudget * participants.length
    : storedBudget;
  const perPersonBudget = isPerPerson
    ? storedBudget
    : participants.length > 0 ? storedBudget / participants.length : 0;
  const percentSpent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const perPerson = participants.length > 0 ? totalSpent / participants.length : 0;

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach((e) => {
      const cat = e.category || "Other";
      map.set(cat, (map.get(cat) || 0) + Number(e.amount));
    });
    return Array.from(map.entries())
      .map(([category, total]) => ({
        category,
        total,
        percentage: totalSpent > 0 ? (total / totalSpent) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [expenses, totalSpent]);

  const settlements = useMemo(() => {
    const balances = new Map<string, number>();

    // Initialize all participants with 0
    participants.forEach((p) => balances.set(p.id, 0));

    // Calculate what each person paid vs what they owe
    expenses.forEach((exp) => {
      // Payer gets credit for the full amount
      const payerId = exp.paid_by_participant_id;
      balances.set(payerId, (balances.get(payerId) || 0) + Number(exp.amount));

      // Each person in the split owes their portion
      exp.splits.forEach((split) => {
        balances.set(
          split.participant_id,
          (balances.get(split.participant_id) || 0) - Number(split.amount_owed)
        );
      });
    });

    // Group by payer for display
    const payerGroups = new Map<
      string,
      {
        payer: Participant;
        totalPaid: number;
        owedBy: { participant: Participant; amount: number; settled: boolean }[];
      }
    >();

    expenses.forEach((exp) => {
      if (!exp.paid_by) return;
      const existing = payerGroups.get(exp.paid_by_participant_id);
      if (!existing) {
        payerGroups.set(exp.paid_by_participant_id, {
          payer: exp.paid_by,
          totalPaid: Number(exp.amount),
          owedBy: exp.splits
            .filter((s) => s.participant_id !== exp.paid_by_participant_id)
            .map((s) => ({
              participant: s.participant || participants[0],
              amount: Number(s.amount_owed),
              settled: s.is_settled,
            })),
        });
      } else {
        existing.totalPaid += Number(exp.amount);
        exp.splits
          .filter((s) => s.participant_id !== exp.paid_by_participant_id)
          .forEach((s) => {
            const existingOwed = existing.owedBy.find(
              (o) => o.participant.id === s.participant_id
            );
            if (existingOwed) {
              existingOwed.amount += Number(s.amount_owed);
              if (!s.is_settled) existingOwed.settled = false;
            } else {
              existing.owedBy.push({
                participant: s.participant || participants[0],
                amount: Number(s.amount_owed),
                settled: s.is_settled,
              });
            }
          });
      }
    });

    return Array.from(payerGroups.values());
  }, [expenses, participants]);

  const exportCSV = () => {
    const rows = [
      ["Card", "Category", "Amount", "Paid By", "Split With", "Amount Owed", "Settled"],
    ];

    expenses.forEach((exp) => {
      exp.splits.forEach((split) => {
        rows.push([
          exp.card_title || "",
          exp.category || "Other",
          String(exp.amount),
          exp.paid_by
            ? `${exp.paid_by.first_name} ${exp.paid_by.last_name}`
            : "",
          split.participant
            ? `${split.participant.first_name} ${split.participant.last_name}`
            : "",
          String(split.amount_owed),
          split.is_settled ? "Yes" : "No",
        ]);
      });
    });

    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "trip-expenses.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const progressColor =
    percentSpent > 90 ? "bg-red-500" : percentSpent > 75 ? "bg-yellow-500" : "bg-green-500";

  return (
    <div className="space-y-6">
      {/* Section 1: Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5" />
            Budget Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total Spent</span>
            <span className="font-semibold text-lg">
              ${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          {storedBudget > 0 && (
            <>
              <div className="relative">
                <Progress value={Math.min(percentSpent, 100)} className="h-3" />
                <div
                  className={`absolute inset-y-0 left-0 rounded-full transition-all ${progressColor}`}
                  style={{ width: `${Math.min(percentSpent, 100)}%`, height: "100%", borderRadius: "inherit" }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {percentSpent.toFixed(0)}% of ${totalBudget.toLocaleString()} budget
                  {isPerPerson && ` (${participants.length} × $${storedBudget.toLocaleString()}/person)`}
                </span>
                <span>
                  ${Math.max(0, totalBudget - totalSpent).toLocaleString(undefined, { minimumFractionDigits: 2 })} remaining
                </span>
              </div>
            </>
          )}
          <Separator />
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Users className="h-4 w-4" />
              Per person {storedBudget > 0 ? `(budget: $${perPersonBudget.toLocaleString(undefined, { maximumFractionDigits: 0 })})` : "average"}
            </span>
            <span className="font-medium">
              ${perPerson.toLocaleString(undefined, { minimumFractionDigits: 2 })} spent
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: By Category */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PieChart className="h-5 w-5" />
            By Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          {categoryBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No expenses recorded yet.
            </p>
          ) : (
            <div className="space-y-3">
              {categoryBreakdown.map(({ category, total, percentage }) => (
                <div key={category} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{category}</span>
                    <span className="text-muted-foreground">
                      ${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}{" "}
                      ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Settlement Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-5 w-5" />
            Settlement Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {settlements.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No expenses to settle.
            </p>
          ) : (
            <div className="space-y-4">
              {settlements.map((group) => (
                <div key={group.payer.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                      {group.payer.first_name[0]}
                      {group.payer.last_name[0]}
                    </div>
                    <span className="font-medium text-sm">
                      {group.payer.first_name} paid ${group.totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="ml-9 space-y-1">
                    {group.owedBy.map((owed) => (
                      <div
                        key={owed.participant.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="flex items-center gap-2">
                          {owed.settled ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          )}
                          {owed.participant.first_name} {owed.participant.last_name}
                        </span>
                        <span className={owed.settled ? "text-green-600" : "text-yellow-600"}>
                          ${owed.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          {owed.settled ? " ✓" : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={exportCSV} disabled={expenses.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export Expense Report
        </Button>
        {/* TODO Phase 2: Auto-categorize expense (AI parsing) */}
        <Button variant="outline" disabled title="Coming in Phase 2">
          <Sparkles className="h-4 w-4 mr-2" />
          Auto-categorize
        </Button>
      </div>
    </div>
  );
}
