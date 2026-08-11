import { SubmissionStatus } from '../entities/submission.entity';

export const OWNER_ID = 'user-1';

/**
 * Deliberately bare: each test opts in to the exact fields it is asserting on,
 * so completeness scores stay easy to reason about.
 */
export const buildSubmission = (overrides: Record<string, any> = {}): any => ({
  id: 'sub-1',
  status: SubmissionStatus.DRAFT,
  submittedById: OWNER_ID,
  completenessScore: 0,
  ...overrides,
});
