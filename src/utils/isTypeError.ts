function isTypedError(
    error: unknown
  ): error is { status?: number; message?: string; errors?: any } {
    
    return (
      typeof error === "object" &&
      error !== null &&
      ("status" in error || "message" in error || "errors" in error)
    );
  }
  
  export default isTypedError;
  