import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default function ConflictsPage() {
  return (
    <PageContainer
      title="Conflict Diagnostics & Resolution"
      description="Operational gate overlaps, capability violations, curfew mismatches, and solver diagnostic reports."
      actions={
        <Link href="/reasoning">
          <Button variant="primary" size="sm">
            Inspect Solver Reasoning &rarr;
          </Button>
        </Link>
      }
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>CSP Conflict & Violation Diagnostics</CardTitle>
            <Badge variant="warning">Explainable AI Connected</Badge>
          </div>
          <CardDescription>
            The pure Python CSP solver records detailed conflict events whenever gate capability or buffer time constraints are violated.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            To view individual flight conflicts, unassigned flight root causes, and backtrack sequences triggered by infeasible schedules, visit the Explainable AI Reasoning Inspector.
          </p>
          <div>
            <Link href="/reasoning">
              <Button variant="primary" size="md">
                Launch Explainable AI Reasoning Console &rarr;
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
