import React from "react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export interface PlaceholderModulePageProps {
  title: string;
  description: string;
  phase: string;
  phaseName: string;
  capabilities: string[];
}

export function PlaceholderModulePage({
  title,
  description,
  phase,
  phaseName,
  capabilities,
}: PlaceholderModulePageProps) {
  return (
    <PageContainer
      title={title}
      description={description}
      actions={
        <Badge variant="info">
          Scheduled for {phase} ({phaseName})
        </Badge>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Status Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{title} Module</CardTitle>
              <Badge variant="outline" className="font-mono text-xs">
                {phase}
              </Badge>
            </div>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2 font-mono">
                Planned Engine Capabilities
              </h4>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-600 dark:text-zinc-300">
                {capabilities.map((cap, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-blue-500 font-bold">&bull;</span>
                    <span>{cap}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link href="/dashboard">
                <Button variant="secondary" size="sm">
                  Return to Dashboard
                </Button>
              </Link>
              <a
                href="http://localhost:8000/docs"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm">
                  Inspect Backend API Endpoints
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Technical Architecture Info */}
        <Card className="space-y-4">
          <CardHeader>
            <CardTitle>Architecture Status</CardTitle>
            <CardDescription>Foundational layers ready for this module</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-zinc-500">Database Models:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">Phase 2 Done</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-zinc-500">CSP Algorithm:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">Phase 3 Done</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-zinc-500">FastAPI CRUD:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">Phase 4 Done</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-zinc-500">Frontend UI:</span>
              <span className="font-semibold text-amber-600 dark:text-amber-400 font-mono">Phase 5 Foundation</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
