"use client";

import React from "react";

export default function LoadingState(): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-12">
      <div className="relative h-16 w-16">
        <div className="absolute inset-0 rounded-full border-4 border-muted" />
        <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
      <div className="text-center">
        <p className="text-lg font-medium text-foreground">
          Analyzing repository...
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Fetching files, parsing imports, and generating AI insights
        </p>
      </div>
    </div>
  );
}

