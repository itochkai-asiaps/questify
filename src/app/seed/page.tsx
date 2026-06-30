"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { seedRoadmap } from "@/lib/actions/seed";
import { Loader2, CheckCircle2, Sprout } from "lucide-react";

export default function SeedPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleSeed = async () => {
    setLoading(true);
    const { count, error } = await seedRoadmap();
    setLoading(false);
    if (error) {
      setResult(`Error: ${error}`);
    } else {
      setResult(`${count} tasks created! Check Kanban or Tasks.`);
    }
  };

  return (
    <div className="container mx-auto max-w-md p-6 pt-20">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sprout className="size-5 text-green-500" />
            Seed Roadmap Tasks
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Create all roadmap items as tasks in your account. Existing tasks are not affected.
          </p>
          <Button
            onClick={handleSeed}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Seed Tasks"
            )}
          </Button>
          {result && (
            <p className="text-sm text-center text-green-600 flex items-center justify-center gap-1">
              <CheckCircle2 className="size-4" />
              {result}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
