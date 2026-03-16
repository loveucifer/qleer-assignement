import type { ComplianceSummary } from "~~/shared/types/summary";
import type { EvaluationDataset } from "~~/shared/types/evaluation";
import evaluationFixture from "~~/server/data/evaluation.json";

export default defineEventHandler(async (): Promise<ComplianceSummary> => {
  const data = evaluationFixture as EvaluationDataset;
  return await summarize(data);
});
