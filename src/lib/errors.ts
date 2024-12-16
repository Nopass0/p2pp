import { TRPCError } from "@trpc/server";

export function handleTRPCError(error: unknown): never {
  if (error instanceof TRPCError) {
    throw error;
  }

  console.error("Unexpected error:", error);

  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "An unexpected error occurred",
    cause: error,
  });
}

export function isAuthError(error: unknown): boolean {
  return (
    error instanceof TRPCError &&
    (error.code === "UNAUTHORIZED" || error.code === "FORBIDDEN")
  );
}

export function isTelegramError(error: unknown): boolean {
  return (
    error instanceof TRPCError &&
    error.code === "BAD_REQUEST" &&
    error.message.toLowerCase().includes("telegram")
  );
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof TRPCError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred";
}

export function createAuthError(
  message: string = "Authentication failed",
): TRPCError {
  return new TRPCError({
    code: "UNAUTHORIZED",
    message,
  });
}

export function createValidationError(
  message: string = "Validation failed",
): TRPCError {
  return new TRPCError({
    code: "BAD_REQUEST",
    message,
  });
}

export function handleApiError(error: unknown): never {
  console.error("API Error:", error);

  if (error instanceof Response) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `API error: ${error.statusText}`,
      cause: error,
    });
  }

  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "API call failed",
    cause: error,
  });
}
