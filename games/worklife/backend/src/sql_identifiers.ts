const ENHANCEMENT_REQUEST_COLUMNS = {
  requester: "requester_id",
  provider: "provider_id",
} as const;

export type EnhancementRequestColumn = (typeof ENHANCEMENT_REQUEST_COLUMNS)[keyof typeof ENHANCEMENT_REQUEST_COLUMNS];

/** 动态 SQL identifier 白名单：拒绝任意用户字符串拼进列名。 */
export function enhancementRequestUserColumn(type: string): EnhancementRequestColumn {
  if (type === "requester" || type === "provider") {
    return ENHANCEMENT_REQUEST_COLUMNS[type];
  }
  throw new Error("invalid_enhancement_request_type");
}
