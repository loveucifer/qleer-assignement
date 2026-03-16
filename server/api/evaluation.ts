import type { EvaluationDataset } from '~~/shared/types/evaluation'
import evaluationFixture from '~~/server/data/evaluation.json'

export default defineEventHandler(async (): Promise<EvaluationDataset> => {
  return evaluationFixture as EvaluationDataset
})
