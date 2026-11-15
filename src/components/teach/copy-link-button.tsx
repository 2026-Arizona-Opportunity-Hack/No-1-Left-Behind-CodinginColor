"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/** Copies the shareable class link (/join?class=CODE) so a teacher can paste it anywhere. */
export function CopyLinkButton({ classCode }: { classCode: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={async () => {
        const url = `${window.location.origin}/join?class=${encodeURIComponent(classCode)}`;
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }}>
        {copied ? "✓ Link copied" : "Copy class link"}
      </Button>
      <span role="status" className="sr-only">{copied ? "Class link copied" : ""}</span>
    </>
  );
}
