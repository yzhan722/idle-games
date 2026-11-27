export type RuntimeFlags = {
  NODE_ENV?: string;
  E2E_SEED?: string;
  E2E_FAST?: string;
  JWT_SECRET?: string;
};

/** 仓库里写着的示例密钥：谁都看得到，拿来签发就等于没有登录。 */
const SAMPLE_SECRET = /change_me|your_secure_jwt_secret|dev_secret_key/i;

export function assertRuntimePolicy(flags: RuntimeFlags): void {
  if (flags.NODE_ENV === "production" &&
      (flags.E2E_SEED === "1" || flags.E2E_FAST === "1")) {
    throw new Error("test_flags_forbidden_in_production");
  }
  if (flags.NODE_ENV === "production" && SAMPLE_SECRET.test(flags.JWT_SECRET ?? "")) {
    throw new Error("sample_jwt_secret_forbidden_in_production");
  }
}

/**
 * 信任哪些转发方给的客户端地址（TRUST_PROXY）。不填只信本机与内网的反向代理（docker 里的 nginx），
 * 否则未登录的人会被算成同一个来源、共用一份限流额度；从公网直连的人伪造不了。
 * 可填 false（不信任）、数字（从近到远信任几跳）或 proxy-addr 的网段写法。
 */
export function parseTrustProxy(value: string | undefined): boolean | string | ((address: string, hop: number) => boolean) {
  const v = (value ?? "").trim();
  if (v === "") return "loopback, linklocal, uniquelocal";
  if (v === "0" || v.toLowerCase() === "false") return false;
  if (/^\d+$/.test(v)) return (_address, hop) => hop < Number(v);
  return v;
}
