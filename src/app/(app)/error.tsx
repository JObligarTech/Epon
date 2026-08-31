"use client";

import { useEffect } from "react";
import { Fallback } from "@/components/errors/Fallback";
import { Button } from "@/components/ui";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Next strips the message in production and leaves a digest that matches
    // the server log, so there is something to report without the browser ever
    // being told what the schema looks like.
    console.error("Unhandled error in the app shell", error);
  }, [error]);

  return (
    <Fallback
      title="That did not load"
      body="Something went wrong fetching your accounts. It is usually temporary — trying again is worth a shot."
      reference={error.digest}
    >
      <Button variant="primary" onClick={reset}>
        Try again
      </Button>
    </Fallback>
  );
}
