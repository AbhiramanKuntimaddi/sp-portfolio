declare module "design-lab" {
  import type { ComponentType } from "react";

  export type VarMap = string | string[];

  /** The six font roles of the shared vocabulary (see RULES.md). */
  export type FontRole = "sans" | "body" | "heading" | "display" | "label" | "mono";

  export type DesignLabConfig = {
    /** Which font pickers to show, in this order. Default: ["sans", "display", "mono"]. */
    fonts?: FontRole[];
    /** Name the pickers in the project's own words, e.g. { palette: "Colours", heading: "Headings" }. */
    labels?: { palette?: string } & Partial<Record<FontRole, string>>;
    /** The fonts the project uses now, shown next to each picker. */
    current?: Partial<Record<FontRole, string>>;
    /** The local helper's address, for setups other than Next (which reads NEXT_PUBLIC_DESIGN_LAB_HELPER). */
    helper?: string;

    /**
     * @deprecated v1 only: map the Lab onto custom variable names. Projects on
     * the v2 vocabulary leave this out and the Lab writes the standard tokens.
     */
    vars?: {
      background: VarMap;
      foreground: VarMap;
      accent: VarMap;
      muted?: VarMap;
      line?: VarMap;
      fontSans: VarMap;
      fontDisplay?: VarMap;
      fontMono?: VarMap;
    };
    /** @deprecated v1: use current.sans */
    currentFontLabel?: string;
    /** @deprecated v1: use current.display */
    currentDisplayLabel?: string;
    /** @deprecated v1: use current.mono */
    currentMonoLabel?: string;
    /** @deprecated v1: use fonts */
    fontOrder?: ("fontSans" | "fontDisplay" | "fontMono")[];
  };

  export const DesignLab: ComponentType<{ config?: DesignLabConfig }>;
}
