import type {
  EvaluationDataset,
  ClauseStatusRecord,
} from "~~/shared/types/evaluation";
import type {
  ComplianceSummary,
  ChapterSummary,
  GapItem,
  NotApplicableItem,
  StatusCounts,
  RiskLevel,
} from "~~/shared/types/summary";
import { generateExecutiveSummary } from "./gemini";

/**
 * Builds an empty StatusCounts object.
 */
function emptyCounts(): StatusCounts {
  return { pass: 0, fail: 0, missing: 0, na: 0, total: 0 };
}

/**
 * Adds a record's status into a StatusCounts accumulator.
 * TITLE records (empty status) are skipped entirely.
 */
function accumulateCount(
  counts: StatusCounts,
  record: ClauseStatusRecord,
): void {
  switch (record.status) {
    case "PASS":
      counts.pass++;
      counts.total++;
      break;
    case "FAIL":
      counts.fail++;
      counts.total++;
      break;
    case "MISSING":
      counts.missing++;
      counts.total++;
      break;
    case "N/A":
      counts.na++;
      // N/A is intentionally excluded from total — not a gap, not a confirmation
      break;
  }
}

/**
 * Derives a risk level from the global counts.
 * HIGH   → at least one FAIL (evaluated and definitively non-compliant)
 * MEDIUM → no FAILs but at least one MISSING (insufficient evidence)
 * LOW    → only PASSes and N/As
 */
function deriveRiskLevel(counts: StatusCounts): RiskLevel {
  if (counts.fail > 0) return "HIGH";
  if (counts.missing > 0) return "MEDIUM";
  return "LOW";
}

/**
 * Computes compliance score as a percentage (0–100), rounded to one decimal.
 * Formula: PASS / (PASS + FAIL + MISSING) * 100
 * Returns 100 if there are no evaluable items (edge case — nothing to fail).
 */
function computeScore(counts: StatusCounts): number {
  if (counts.total === 0) return 100;
  return Math.round((counts.pass / counts.total) * 1000) / 10;
}

/**
 * Converts a JUDGE record with a gap status into a GapItem.
 * Only call this for FAIL or MISSING records.
 */
function toGapItem(record: ClauseStatusRecord): GapItem {
  return {
    id: record.id,
    clause: record.clause,
    title: record.title,
    summary: record.summary,
    status: record.status as "FAIL" | "MISSING",
    justification: record.justification,
    applicable_if: record.applicable_if,
  };
}

/**
 * Converts a JUDGE record with N/A status into a NotApplicableItem.
 * Only call this for N/A records.
 */
function toNotApplicableItem(record: ClauseStatusRecord): NotApplicableItem {
  return {
    id: record.id,
    clause: record.clause,
    title: record.title,
    summary: record.summary,
    justification: record.justification,
    applicable_if: record.applicable_if,
  };
}

export async function summarize(
  data: EvaluationDataset,
): Promise<ComplianceSummary> {
  // Separate TITLE rows from JUDGE rows
  const titleRows = data.filter((r) => r.job_type === "TITLE");
  const judgeRows = data.filter((r) => r.job_type === "JUDGE");

  //  Build chapter title lookup
  // TITLE rows have job_type === 'TITLE' and their `title` field is the chapter name.
  const chapterTitles = new Map<number, string>();
  for (const row of titleRows) {
    if (row.title) {
      chapterTitles.set(row.index_chapter, row.title);
    }
  }

  // Group JUDGE rows by chapter
  // We use a Map keyed by chapter number to preserve insertion order.
  const chapterMap = new Map<
    number,
    { counts: StatusCounts; gaps: GapItem[] }
  >();
  const naItems: NotApplicableItem[] = [];

  for (const record of judgeRows) {
    const ch = record.index_chapter;

    if (!chapterMap.has(ch)) {
      chapterMap.set(ch, { counts: emptyCounts(), gaps: [] });
    }

    const bucket = chapterMap.get(ch)!;
    accumulateCount(bucket.counts, record);

    if (record.status === "FAIL" || record.status === "MISSING") {
      bucket.gaps.push(toGapItem(record));
    }

    if (record.status === "N/A") {
      naItems.push(toNotApplicableItem(record));
    }
  }

  // Build ChapterSummary array and roll up global counts
  const globalCounts = emptyCounts();
  const chapters: ChapterSummary[] = [];

  for (const [chapterNum, bucket] of chapterMap) {
    // Roll up into global counts
    globalCounts.pass += bucket.counts.pass;
    globalCounts.fail += bucket.counts.fail;
    globalCounts.missing += bucket.counts.missing;
    globalCounts.na += bucket.counts.na;
    globalCounts.total += bucket.counts.total;

    chapters.push({
      chapter: chapterNum,
      title: chapterTitles.get(chapterNum) ?? `Chapter ${chapterNum}`,
      counts: bucket.counts,
      gaps: bucket.gaps,
    });
  }

  // Flat gaps list across all chapters, preserving chapter order
  const allGaps: GapItem[] = chapters.flatMap((c) => c.gaps);

  //  Pick the most recent `created_at` as the evaluation timestamp
  const evaluatedAt = judgeRows.reduce((latest, r) => {
    return r.created_at > latest ? r.created_at : latest;
  }, judgeRows[0]?.created_at ?? new Date().toISOString());

  // Standard ref — all records share the same standard in this dataset
  const standard = data[0]?.standard.ref ?? "Unknown standard";

  // Build preliminary summary object for AI prompt
  const preliminarySummary: ComplianceSummary = {
    standard,
    evaluatedAt,
    counts: globalCounts,
    complianceScore: computeScore(globalCounts),
    riskLevel: deriveRiskLevel(globalCounts),
    chapters,
    gaps: allGaps,
    notApplicable: naItems,
    executiveSummary: null,
  };

  // Generate AI executive summary
  const executiveSummary = await generateExecutiveSummary(preliminarySummary);

  return {
    ...preliminarySummary,
    executiveSummary,
  };
}
