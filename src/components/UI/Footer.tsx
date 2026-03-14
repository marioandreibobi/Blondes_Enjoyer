import React from "react";
import { Hexagon } from "lucide-react";

export default function Footer(): React.ReactElement {
  return (
    <footer className="relative z-10 border-t border-border py-8">
      <div className="container mx-auto flex flex-col items-center gap-2 px-4">
        <div className="flex items-center gap-2">
          <Hexagon className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">
            Code<span className="text-gradient-primary">Atlas</span>
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Map your codebase. Understand everything.
        </p>
      </div>
    </footer>
  );
}
