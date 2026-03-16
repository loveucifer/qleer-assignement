/**
 * counts of each clause status for a given scope (chapter or overall).
 * `total` = pass + fail + missing (N/A excluded — not a gap, not a pass)
 */
export interface StatusCounts {
  pass: number;
  fail: number;
  missing: number;
  na: number;
  total: number;
}

/**
 * a clause that is either FAIL or MISSING.
 * FAIL   → evaluated, definitively non-compliant
 * MISSING → insufficient evidence to prove compliance
 */
export interface GapItem {
  id: string;
  clause: string;
  title: string | null;
  summary: string | null;
  status: "FAIL" | "MISSING";
  justification: string | null;
  applicable_if: string | null;
}

/**
 * A clause marked N/A — not applicable to this product/context.
 * Shown separately so reviewers can verify the exclusion reasoning.
 */
export interface NotApplicableItem {
  id: string;
  clause: string;
  title: string | null;
  summary: string | null;
  justification: string | null;
  applicable_if: string | null;
}

/**
 *  counts + the gaps found inside that chapter.
 */
export interface ChapterSummary {
  chapter: number;
  title: string;
  counts: StatusCounts;
  gaps: GapItem[];
}

/**
 * Overall risk level derived from the gap analysis.
 * HIGH   → at least one FAIL (definitively non-compliant)
 * MEDIUM → no FAILs but at least one MISSING (evidence gaps)
 * LOW    → only PASSes and N/As
 */
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

/**
 * The full compliance gap summary returned by GET /api/summary.
 */
export interface ComplianceSummary {
  /** The standard being evaluated, e.g. "EN 60204-1:2018" */
  standard: string;
  /** ISO timestamp of when the evaluation was last created */
  evaluatedAt: string;
  /** Global status counts across all chapters */
  counts: StatusCounts;
  /**
   * Compliance score as a percentage (0–100).
   * Formula: PASS / (PASS + FAIL + MISSING) * 100
   * N/A clauses are excluded — they are neither gaps nor confirmations.
   */
  complianceScore: number;
  /** Derived risk level */
  riskLevel: RiskLevel;
  /** Per-chapter breakdown */
  chapters: ChapterSummary[];
  /** Flat list of all gaps across all chapters, ordered by clause index */
  gaps: GapItem[];
  /** Flat list of all N/A clauses — excluded from score but shown for traceability */
  notApplicable: NotApplicableItem[];
  /** AI-generated executive summary (3-4 sentences) — may be null if generation fails */
  executiveSummary: string | null;
}
