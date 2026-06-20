"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PlanForm } from "@/components/plans/plan-form";

export default function NewPlanPage() {
  const router = useRouter();

  return (
    <div className="container mx-auto max-w-lg p-6">
      {/* Back button */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <PlanForm mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}
