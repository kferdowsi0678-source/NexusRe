import { SubmissionsService } from './submissions.service';
import { mockRepo } from './testing/mocks';
import { buildSubmission } from './testing/build-submission';

const score = async (fields: Record<string, any>) => {
  const subs = mockRepo();
  subs.findOne.mockResolvedValue(buildSubmission(fields));
  const service = new SubmissionsService(
    subs as any,
    mockRepo() as any,
    mockRepo() as any,
    {} as any,
  );
  return service.calculateCompletenessScore('sub-1');
};

describe('calculateCompletenessScore', () => {
  it('gives an empty submission nothing', async () => {
    await expect(score({})).resolves.toBe(0);
  });

  it('ignores a title too short to be meaningful', async () => {
    await expect(score({ title: 'abc' })).resolves.toBe(0);
    await expect(score({ title: 'Lagos Tower' })).resolves.toBe(10);
  });

  it('adds the basic-information block', async () => {
    const fields = {
      title: 'Lagos Tower',
      description: 'A twelve storey office block in Victoria Island',
      lineOfBusiness: 'property',
      type: 'facultative',
    };
    await expect(score(fields)).resolves.toBe(30);
  });

  it('caps riskDetails at fifteen and documents at twenty', async () => {
    const riskDetails = { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 };
    const documents = [1, 2, 3, 4, 5].map((n) => ({ id: String(n) }));
    await expect(score({ riskDetails })).resolves.toBe(15);
    await expect(score({ documents })).resolves.toBe(20);
  });

  it('never exceeds one hundred', async () => {
    const fields = {
      title: 'Lagos Tower',
      description: 'A twelve storey office block in Victoria Island',
      lineOfBusiness: 'property',
      type: 'facultative',
      sumInsured: 5_000_000,
      currency: 'USD',
      inceptionDate: '2026-01-01',
      expiryDate: '2026-12-31',
      riskDetails: { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 },
      lossHistory: { claims: [] },
      documents: [1, 2, 3, 4, 5].map((n) => ({ id: String(n) })),
    };
    await expect(score(fields)).resolves.toBe(100);
  });
});
