import { ForbiddenException } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { SubmissionStatus } from './entities/submission.entity';
import { mockRepo } from './testing/mocks';
import { buildSubmission, OWNER_ID } from './testing/build-submission';

// Scores 55: basics (30) + sumInsured (15) + currency (5) + dates (5).
const COMPLETE_ENOUGH = {
  title: 'Lagos Tower',
  description: 'A twelve storey office block in Victoria Island',
  lineOfBusiness: 'property',
  type: 'facultative',
  sumInsured: 5_000_000,
  currency: 'USD',
  inceptionDate: '2026-01-01',
  expiryDate: '2026-12-31',
};

const setup = (fields: Record<string, any>) => {
  const subs = mockRepo();
  // One shared object, so the score written by calculateCompletenessScore is
  // visible to the re-read inside submitSubmission.
  subs.findOne.mockResolvedValue(buildSubmission(fields));
  const service = new SubmissionsService(
    subs as any,
    mockRepo() as any,
    mockRepo() as any,
    {} as any,
  );
  return service;
};

describe('submitSubmission', () => {
  it('rejects anyone other than the author', async () => {
    const service = setup(COMPLETE_ENOUGH);
    await expect(service.submitSubmission('sub-1', 'someone-else')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('only accepts drafts', async () => {
    const service = setup({ ...COMPLETE_ENOUGH, status: SubmissionStatus.SUBMITTED });
    await expect(service.submitSubmission('sub-1', OWNER_ID)).rejects.toThrow(/Only draft/);
  });

  it('blocks thin submissions and names the shortfall', async () => {
    const service = setup({ title: 'Lagos Tower', type: 'facultative' });
    await expect(service.submitSubmission('sub-1', OWNER_ID)).rejects.toThrow(/15%/);
  });

  it('submits once the threshold is met', async () => {
    const service = setup(COMPLETE_ENOUGH);
    const result = await service.submitSubmission('sub-1', OWNER_ID);
    expect(result.status).toBe(SubmissionStatus.SUBMITTED);
    expect(result.completenessScore).toBe(55);
  });
});
