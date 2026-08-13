import {
  AiAssessment,
  MAX_ADJUSTMENT,
  RankableMatch,
  blendAiAssessments,
  rankBlendedMatches,
  withoutAi,
} from './appetite-ai-ranking';

function match(overrides: Partial<RankableMatch> = {}): RankableMatch {
  return {
    appetiteId: 'ap-1',
    reinsurerName: 'Munich Re',
    score: 70,
    reasons: ['Writes property'],
    ...overrides,
  };
}

describe('blendAiAssessments', () => {
  it('leaves rows untouched when the model said nothing', () => {
    const [row] = blendAiAssessments([match()], []);

    expect(row.combinedScore).toBe(70);
    expect(row.ruleScore).toBe(70);
    expect(row.aiAdjustment).toBe(0);
    expect(row.aiApplied).toBe(false);
    expect(row.aiRationale).toBeUndefined();
  });

  it('applies a positive adjustment and keeps the rule score for audit', () => {
    const [row] = blendAiAssessments(
      [match()],
      [{ appetiteId: 'ap-1', adjustment: 10, rationale: 'Core class for this market.' }],
    );

    expect(row.ruleScore).toBe(70);
    expect(row.combinedScore).toBe(80);
    expect(row.aiRationale).toBe('Core class for this market.');
    expect(row.aiApplied).toBe(true);
  });

  it('applies a negative adjustment', () => {
    const [row] = blendAiAssessments(
      [match()],
      [{ appetiteId: 'ap-1', adjustment: -15, rationale: 'Capacity is small for this size.' }],
    );

    expect(row.combinedScore).toBe(55);
  });

  it('clamps an adjustment that exceeds the permitted range', () => {
    const [up] = blendAiAssessments(
      [match({ score: 50 })],
      [{ appetiteId: 'ap-1', adjustment: 900, rationale: 'Perfect.' }],
    );
    const [down] = blendAiAssessments(
      [match({ score: 50 })],
      [{ appetiteId: 'ap-1', adjustment: -900, rationale: 'Terrible.' }],
    );

    expect(up.aiAdjustment).toBe(MAX_ADJUSTMENT);
    expect(down.aiAdjustment).toBe(-MAX_ADJUSTMENT);
  });

  it('keeps the combined score inside 0-100', () => {
    const [high] = blendAiAssessments(
      [match({ score: 95 })],
      [{ appetiteId: 'ap-1', adjustment: 20, rationale: 'x' }],
    );
    const [low] = blendAiAssessments(
      [match({ score: 5 })],
      [{ appetiteId: 'ap-1', adjustment: -20, rationale: 'x' }],
    );

    expect(high.combinedScore).toBe(100);
    expect(low.combinedScore).toBe(0);
  });

  it('ignores assessments for candidates that were never offered', () => {
    const [row] = blendAiAssessments(
      [match()],
      [{ appetiteId: 'hallucinated-id', adjustment: 20, rationale: 'Invented market.' }],
    );

    expect(row.aiApplied).toBe(false);
    expect(row.combinedScore).toBe(70);
  });

  it('never adds a market the rules did not return', () => {
    const rows = blendAiAssessments(
      [match()],
      [
        { appetiteId: 'ap-1', adjustment: 5, rationale: 'ok' },
        { appetiteId: 'ap-99', adjustment: 20, rationale: 'invented' },
      ],
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].appetiteId).toBe('ap-1');
  });

  it('takes the first assessment when the model repeats a candidate', () => {
    const [row] = blendAiAssessments(
      [match()],
      [
        { appetiteId: 'ap-1', adjustment: 10, rationale: 'first' },
        { appetiteId: 'ap-1', adjustment: -10, rationale: 'second' },
      ],
    );

    expect(row.aiRationale).toBe('first');
    expect(row.combinedScore).toBe(80);
  });

  it('survives malformed assessments without throwing', () => {
    const assessments = [
      null,
      { adjustment: 5, rationale: 'no id' },
      { appetiteId: 'ap-1', adjustment: 'lots', rationale: 42 },
    ] as unknown as AiAssessment[];

    const [row] = blendAiAssessments([match()], assessments);

    expect(row.aiAdjustment).toBe(0);
    expect(row.aiRationale).toBeUndefined();
    expect(row.combinedScore).toBe(70);
  });

  it('rounds a fractional adjustment', () => {
    const [row] = blendAiAssessments(
      [match()],
      [{ appetiteId: 'ap-1', adjustment: 7.6, rationale: 'x' }],
    );

    expect(row.aiAdjustment).toBe(8);
  });

  it('does not badge a no-op assessment as AI-assisted', () => {
    const [row] = blendAiAssessments(
      [match()],
      [{ appetiteId: 'ap-1', adjustment: 0, rationale: '   ' }],
    );

    expect(row.aiApplied).toBe(false);
  });

  it('truncates an over-long rationale', () => {
    const [row] = blendAiAssessments(
      [match()],
      [{ appetiteId: 'ap-1', adjustment: 0, rationale: 'x'.repeat(900) }],
    );

    expect(row.aiRationale).toHaveLength(400);
    expect(row.aiRationale?.endsWith('…')).toBe(true);
  });
});

describe('rankBlendedMatches', () => {
  it('orders by combined score, not rule score', () => {
    const rows = blendAiAssessments(
      [
        match({ appetiteId: 'a', reinsurerName: 'Alpha Re', score: 80 }),
        match({ appetiteId: 'b', reinsurerName: 'Beta Re', score: 65 }),
      ],
      [
        { appetiteId: 'a', adjustment: -15, rationale: 'Peripheral for them.' },
        { appetiteId: 'b', adjustment: 15, rationale: 'Exactly their book.' },
      ],
    );

    expect(rankBlendedMatches(rows).map((r) => r.appetiteId)).toEqual(['b', 'a']);
  });

  it('breaks ties on rule score before name', () => {
    const rows = blendAiAssessments(
      [
        match({ appetiteId: 'a', reinsurerName: 'Alpha Re', score: 60 }),
        match({ appetiteId: 'b', reinsurerName: 'Beta Re', score: 70 }),
      ],
      [
        { appetiteId: 'a', adjustment: 10, rationale: 'x' },
        { appetiteId: 'b', adjustment: 0, rationale: 'y' },
      ],
    );

    expect(rankBlendedMatches(rows).map((r) => r.appetiteId)).toEqual(['b', 'a']);
  });

  it('is stable for identical scores', () => {
    const rows = withoutAi([
      match({ appetiteId: 'z', reinsurerName: 'Zurich Re', score: 60 }),
      match({ appetiteId: 'a', reinsurerName: 'Africa Re', score: 60 }),
    ]);

    expect(rankBlendedMatches(rows).map((r) => r.reinsurerName)).toEqual([
      'Africa Re',
      'Zurich Re',
    ]);
  });
});

describe('withoutAi', () => {
  it('produces the same shape as a blended result', () => {
    const [row] = withoutAi([match()]);

    expect(row).toMatchObject({
      ruleScore: 70,
      combinedScore: 70,
      aiAdjustment: 0,
      aiApplied: false,
    });
  });
});
