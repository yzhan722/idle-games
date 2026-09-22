import { z } from "zod";

export type SafeHttpError = {
  status: number;
  body: { error: string; message?: string; details?: unknown };
};

const GENERIC_500 = {
  error: "internal_error",
  message: "服务器内部错误，请稍后重试",
} as const;

export function mapThrownError(error: unknown): SafeHttpError {
  if (error instanceof z.ZodError) {
    return {
      status: 400,
      body: {
        error: "invalid_request",
        message: "请求参数不合法",
        details: error.errors.map((e) => ({ path: e.path.join("."), message: e.message })),
      },
    };
  }
  if (error && typeof error === "object" && "validation" in error) {
    return { status: 400, body: { error: "invalid_request", message: "请求参数不合法" } };
  }

  const record = error as { error?: unknown; code?: unknown; statusCode?: unknown } | null;
  if (
    record?.error === "rate_limited" ||
    record?.code === "FST_ERR_RATE_LIMIT" ||
    record?.statusCode === 429
  ) {
    return {
      status: 429,
      body: { error: "rate_limited", message: "请求过于频繁，请稍后重试" },
    };
  }
  // Fastify's own client-side errors (empty JSON body, payload too large, bad content type …)
  // carry a 4xx statusCode; they are the caller's fault and must not be reported as 500.
  if (typeof record?.statusCode === "number" && record.statusCode >= 400 && record.statusCode < 500) {
    return {
      status: record.statusCode,
      body: { error: "invalid_request", message: "请求不合法" },
    };
  }

  const msg = String((error as { message?: unknown } | null)?.message || "");
  if (msg === "state_not_found") {
    return { status: 404, body: { error: "state_not_found", message: "玩家状态不存在，请重新进入游戏" } };
  }
  if (msg === "state_version_conflict") {
    return { status: 409, body: { error: "state_version_conflict", message: "状态已被其他请求更新，请重试" } };
  }
  if (msg === "Unauthorized") {
    return { status: 401, body: { error: "Unauthorized" } };
  }

  return { status: 500, body: { ...GENERIC_500 } };
}

export function isLeakingInternalError(body: { error?: string; message?: string }): boolean {
  const blob = `${body.error || ""} ${body.message || ""}`.toLowerCase();
  return (
    blob.includes("at ") ||
    blob.includes(".ts:") ||
    blob.includes("e:\\") ||
    blob.includes("d:\\") ||
    blob.includes("c:\\") ||
    blob.includes("/home/") ||
    blob.includes("password") ||
    blob.includes("jwt_secret") ||
    blob.includes("select ") ||
    blob.includes("syntax error")
  );
}
