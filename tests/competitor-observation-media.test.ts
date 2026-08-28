import { describe, expect, it } from "vitest";
import { COMPETITOR_OBSERVATION_MEDIA_DIRECTORY, isCompetitorObservationMediaUri } from "@/lib/competitor-observation-media";

describe("وسائط رصد المنافسين", () => {
  it("يعرّف مساراً دائماً مستقلاً لصور الرصد", () => {
    expect(COMPETITOR_OBSERVATION_MEDIA_DIRECTORY).toBe("competitor-observations/");
    expect(isCompetitorObservationMediaUri(undefined)).toBe(false);
  });
});
