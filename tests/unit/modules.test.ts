import { describe, expect, it } from "vitest";
import { composeModules, moduleNames } from "@/ai/modules";

describe("prompt modules", () => {
  it("uses PAMI as the general module and adds the insurer override after it", () => {
    expect(moduleNames("select", "pami")).toEqual(["core", "select", "insurer/pami"]);
    expect(moduleNames("generate", "osde")).toEqual(["core", "generate", "insurer/pami", "insurer/osde"]);
  });

  it("records the version of every module it composes", () => {
    const composed = composeModules("select", "swiss-medical");
    expect(Object.keys(composed.versions)).toEqual(["core", "select", "insurer/pami", "insurer/swiss-medical"]);
    for (const version of Object.values(composed.versions)) expect(version).toMatch(/^\d{4}-\d{2}-\d{2}\.\d+$/);
    expect(composed.instructions).toContain("Tarea: SELECCIÓN DE FUENTES");
    expect(composed.instructions).toContain("Swiss Medical");
    expect(composed.instructions).not.toContain("---");
  });
});
