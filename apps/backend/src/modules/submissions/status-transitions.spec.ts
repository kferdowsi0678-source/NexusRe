import { ForbiddenException } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { SubmissionStatus } from './entities/submission.entity';
import { mockRepo } from './testing/mocks';
import { buildSubmission } from './testing/build-submission';

const setup = (status: SubmissionStatus) => {
  const subs = mockRepo();
  const history = mockRepo();
  subs.findOne.mockResolvedValue(buildSubmission({ status }));
  const service = new SubmissionsService(
    subs as any,
    mockRepo() as any,
    history as any,
    {} as any,
  );
  return { service, history };
};

describe('updateStatus', () => {
  it('allows draft to submitted', async () => {
    const { service } = setup(SubmissionStatus.DRAFT);
    const result = await service.updateStatus('sub-1', SubmissionStatus.SUBMITTED);
    expect(result.status).toBe(SubmissionStatus.SUBMITTED);
    expect(result.submittedAt).toBeInstanceOf(Date);
  });

  it('refuses to skip the review stages', async () => {
    const { service } = setup(SubmissionStatus.DRAFT);
    await expect(
      service.updateStatus('sub-1', SubmissionStatus.BOUND),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('treats bound as terminal', async () => {
    const { service } = setup(SubmissionStatus.BOUND);
    await expect(
      service.updateStatus('sub-1', SubmissionStatus.NEGOTIATING),
    ).rejects.toThrow(/Cannot transition from bound/);
  });

  it('records history only when an actor is known', async () => {
    const withActor = setup(SubmissionStatus.SUBMITTED);
    await withActor.service.updateStatus('sub-1', SubmissionStatus.UNDER_REVIEW, 'user-9');
    expect(withActor.history.save).toHaveBeenCalledTimes(1);

    const anonymous = setup(SubmissionStatus.SUBMITTED);
    await anonymous.service.updateStatus('sub-1', SubmissionStatus.UNDER_REVIEW);
    expect(anonymous.history.save).not.toHaveBeenCalled();
  });
});
