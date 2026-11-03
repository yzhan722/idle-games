export type RuntimeFlags = {
  NODE_ENV?: string;
  E2E_SEED?: string;
  E2E_FAST?: string;
};

export function assertRuntimePolicy(flags: RuntimeFlags): void {
  if (flags.NODE_ENV === "production" &&
      (flags.E2E_SEED === "1" || flags.E2E_FAST === "1")) {
    throw new Error("test_flags_forbidden_in_production");
  }
}
