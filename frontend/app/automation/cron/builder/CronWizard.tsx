"use client";

import React, { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import CronBuilder from "@/app/automation/cron/components/CronBuilder";
import CronPreview from "@/app/automation/cron/components/CronPreview";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbSeparator,
  BreadcrumbLink,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";

import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { updateProfile } from "@/app/automation/utils/api";

/**
 * Cron Wizard with 3 Steps:
 * 1. Build cron via UI
 * 2. Review cron & preview next runs
 * 3. Apply cron to profile OR copy it
 */
export default function CronWizard() {
  const router = useRouter();
  const params = useSearchParams();

  const profileIdParam = params?.get("profileId");
  const profileId = profileIdParam ? Number(profileIdParam) : null;

  const [step, setStep] = useState<number>(1);
  const [cronExpr, setCronExpr] = useState<string>("*/5 * * * * *");
  const [loadingApply, setLoadingApply] = useState(false);

  const [previewData, setPreviewData] = useState<{
    pretty?: string;
    approxIntervalSec?: number | null;
    nextRuns?: string[];
  }>({});

  const onCronChange = useCallback((expr: string) => {
    setCronExpr(expr);
  }, []);

  // CronPreview can call this to pass backend validate data
  const onSetPreview = (data: any) => {
    setPreviewData({
      pretty: data?.pretty ?? "",
      approxIntervalSec: data?.approxIntervalSec ?? null,
      nextRuns: data?.nextRuns ?? [],
    });
  };

  const handleNext = () => setStep((s) => Math.min(3, s + 1));
  const handleBack = () => setStep((s) => Math.max(1, s - 1));

  const copyCron = async () => {
    try {
      await navigator.clipboard.writeText(cronExpr);
      toast.success("Copied cron expression");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const applyToProfile = async () => {
    if (!profileId) {
      toast.error("This wizard was not opened from a Profile page");
      return;
    }

    setLoadingApply(true);

    try {
      await updateProfile(profileId, { cron: cronExpr });
      toast.success("Cron applied successfully");
      router.push(`/automation/profiles/${profileId}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to apply cron");
    } finally {
      setLoadingApply(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-10 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Cron Builder Wizard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Build human-friendly cron expressions with live preview.
          </p>
        </div>

        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/automation">Automation</BreadcrumbLink>
            </BreadcrumbItem>

            <BreadcrumbSeparator />

            <BreadcrumbItem>
              <BreadcrumbPage>Cron Builder</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main section */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                Step {step} —{" "}
                {step === 1 ? "Build" : step === 2 ? "Review" : "Apply"}
              </CardTitle>
            </CardHeader>

            <CardContent>
              {step === 1 && (
                <CronBuilder value={cronExpr} onChange={onCronChange} />
              )}

              {step === 2 && (
                <>
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs text-slate-500">Expression</div>
                      <Input readOnly value={cronExpr} className="font-mono" />
                    </div>

                    <Separator />

                    <div>
                      <h4 className="text-sm font-medium">Preview & Details</h4>
                     <CronPreview
  cron={cronExpr}
  pretty={previewData.pretty ?? ""}
  interval={previewData.approxIntervalSec ?? null}
  nextRuns={previewData.nextRuns ?? []}
  error={null}
/>

                    </div>
                  </div>
                </>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium">Final Expression</h4>

                    <div className="mt-2 flex items-center gap-2">
                      <div className="font-mono bg-slate-100 p-2 rounded flex-1 break-words">
                        {cronExpr}
                      </div>

                      <Button onClick={copyCron} size="sm">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="text-sm font-medium">Actions</h4>
                    <p className="text-sm text-slate-500">
                      Copy or apply to a profile.
                    </p>

                    <div className="mt-3 flex gap-2">
                      <Button variant="outline" onClick={copyCron}>
                        Copy
                      </Button>

                      <Button
                        onClick={applyToProfile}
                        disabled={!profileId || loadingApply}
                      >
                        {profileId
                          ? loadingApply
                            ? "Applying…"
                            : "Apply to Profile"
                          : "Open from Profile to Apply"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-500">Step {step} of 3</span>

            <div className="flex gap-2">
              <Button onClick={handleBack} variant="outline" disabled={step === 1}>
                Back
              </Button>

              {step < 3 ? (
                <Button onClick={handleNext}>Next</Button>
              ) : (
                <Button onClick={() => setStep(3)}>Review</Button>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Live Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-slate-500">Expression</div>
              <div className="font-mono bg-slate-100 p-2 rounded my-2">
                {cronExpr}
              </div>

              <CronPreview
  cron={cronExpr}
  pretty={previewData.pretty ?? ""}
  interval={previewData.approxIntervalSec ?? null}
  nextRuns={previewData.nextRuns ?? []}
  error={null}
/>

            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button onClick={copyCron}>Copy</Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setCronExpr("0 */5 * * * *");
                  toast.success("Example cron applied");
                }}
              >
                Example: Every 5 Min
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
