import assert from "node:assert/strict";
import test from "node:test";

import {getMembershipBadge} from "../src/extraction/membershipBadge.ts";

test("reads membership badges across video and TV metadata", () => {
  assert.equal(
    getMembershipBadge({badges: [{label: "Members only"}]}),
    "members",
  );
  assert.equal(
    getMembershipBadge({
      metadata: {lines: [{items: [{badge: {label: "회원 우선 공개"}}]}]},
    }),
    "earlyAccess",
  );
  assert.equal(
    getMembershipBadge({
      badges: [
        {style: "BADGE_STYLE_TYPE_MEMBERS_ONLY"},
        {label: "Members early access"},
      ],
    }),
    "earlyAccess",
  );
});
test("does not infer membership from a video title or unrelated content", () => {
  assert.equal(
    getMembershipBadge({title: "Members only", description: "회원 우선 공개"}),
    undefined,
  );
  assert.equal(getMembershipBadge({badges: [{label: "4K"}]}), undefined);
  const circular = {};
  circular.badges = circular;
  assert.equal(getMembershipBadge(circular), undefined);
});
