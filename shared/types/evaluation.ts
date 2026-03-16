export type ClauseStatus = '' | 'PASS' | 'MISSING' | 'FAIL' | 'N/A'

export type EvaluationJobType = 'JUDGE' | 'TITLE'

export interface EvaluationStandardRef {
  id: string
  ref: string
}

export interface ClauseStatusRecord {
  id: string
  created_at: string
  status: ClauseStatus
  evaluation: string
  justification: string | null
  arbitration: string | null
  standard: EvaluationStandardRef
  clause: string
  title: string | null
  summary: string | null
  applicable_if: string | null
  conditions: string | null
  references: string | null
  index: number
  index_chapter: number
  job_type: EvaluationJobType
  group_id: string
}

export type EvaluationDataset = ClauseStatusRecord[]
