import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Banknote } from "lucide-react";

interface BudgetCardProps {
  budget: number;
  onChange: (value: number) => void;
}

export function BudgetCard({ budget, onChange }: BudgetCardProps) {
  return (
    <Card className="border-amber-200 bg-white shadow-lg overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200 py-4 px-5">
        <CardTitle className="flex items-center gap-2 text-green-800 text-base font-semibold">
          <Banknote className="h-4 w-4 text-green-600" />
          Budget Scenario
        </CardTitle>
        <CardDescription className="mt-0.5 text-xs text-gray-500">
          Maximum total fertilizer spend across all crops and products
        </CardDescription>
      </CardHeader>
      <CardContent className="p-5">
        <div className="space-y-1.5">
          <Label htmlFor="budget" className="text-sm font-medium text-gray-700">
            Total Available Budget (KES)
          </Label>
          <Input
            id="budget"
            type="number"
            value={budget}
            onChange={(e) => onChange(Number(e.target.value))}
            className="h-10 text-base font-semibold border-amber-200 focus-visible:ring-green-400"
          />
        </div>
      </CardContent>
    </Card>
  );
}
