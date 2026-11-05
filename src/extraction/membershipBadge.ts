export type MembershipBadge = "members" | "earlyAccess";

/** Inspect badge metadata only; titles and descriptions are not access labels. */
export function getMembershipBadge(node: unknown): MembershipBadge | undefined {
  const seen = new Set<object>();
  let result: MembershipBadge | undefined;
  let remaining = 400;
  function visit(value: unknown, depth: number, inBadge: boolean) {
    if (depth > 10 || --remaining < 0 || value == null) return;
    if (typeof value === "string" && inBadge) {
      if (
        /early[ _-]?access|members.{0,20}first|우선.?공개|선공개|vorabzugriff/i.test(
          value,
        )
      )
        result = "earlyAccess";
      else if (
        result !== "earlyAccess" &&
        /members?[ _-]?only|회원.?전용|멤버십.?전용|nur für mitglieder|BADGE_STYLE_TYPE_MEMBERS_ONLY/i.test(
          value,
        )
      )
        result = "members";
      return;
    }
    if (typeof value !== "object" || seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) {
      value.forEach(item => visit(item, depth + 1, inBadge));
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      if (child === true && /^(is_early_access|isEarlyAccess)$/.test(key))
        result = "earlyAccess";
      if (
        child === true &&
        /^(is_members_only|isMembersOnly)$/.test(key) &&
        result !== "earlyAccess"
      )
        result = "members";
      const badge = /badge/i.test(key);
      if (
        badge ||
        inBadge ||
        /^(metadata|lines|items|rows|overlays|contents|content|header|footer|secondary_text|secondaryText)$/.test(
          key,
        )
      ) {
        visit(child, depth + 1, inBadge || badge);
      }
    }
  }
  visit(node, 0, false);
  return result;
}
