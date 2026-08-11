import dataSource from '../../config/typeorm.config';

/**
 * Gives the matching engine something to work with. Idempotent: appetites are
 * keyed on (reinsurerId, name), so re-running will not duplicate rows.
 */
async function seedRiskAppetite() {
  await dataSource.initialize();
  console.log('Seeding risk appetite...');

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    const reinsurers = await queryRunner.query(
      `SELECT id, name FROM organizations WHERE type = 'reinsurer' AND "isActive" = true`,
    );

    if (!reinsurers.length) {
      console.log('No reinsurer organizations found. Run "npm run seed" first.');
      return;
    }

    const target = reinsurers[0];

    const appetites = [
      {
        name: 'African property facultative',
        linesOfBusiness: ['property', 'engineering'],
        submissionTypes: ['facultative'],
        countries: ['Nigeria', 'Kenya', 'Ghana', 'South Africa'],
        worldwide: false,
        structurePreference: 'proportional',
        minSumInsured: 500000,
        maxSumInsured: 50000000,
        currency: 'USD',
        maxCapacityShare: 25,
        notes: 'Prefers well-protected commercial risks in major cities.',
      },
      {
        name: 'Worldwide energy and marine',
        linesOfBusiness: ['energy', 'marine'],
        submissionTypes: [],
        countries: [],
        worldwide: true,
        structurePreference: 'any',
        minSumInsured: 5000000,
        maxSumInsured: 500000000,
        currency: 'USD',
        maxCapacityShare: 15,
        notes: 'Onshore and offshore. Will look at anything with a survey.',
      },
      {
        name: 'Casualty treaty',
        linesOfBusiness: ['casualty', 'liability', 'professional_indemnity'],
        submissionTypes: ['treaty'],
        countries: [],
        worldwide: false,
        structurePreference: 'non_proportional',
        minSumInsured: null,
        maxSumInsured: null,
        currency: 'EUR',
        maxCapacityShare: 40,
        notes: 'Excess of loss only.',
      },
    ];

    let created = 0;
    for (const appetite of appetites) {
      const existing = await queryRunner.query(
        `SELECT id FROM risk_appetites WHERE "reinsurerId" = $1 AND name = $2`,
        [target.id, appetite.name],
      );
      if (existing.length) {
        console.log(`  exists, skipping: ${appetite.name}`);
        continue;
      }

      await queryRunner.query(
        `INSERT INTO risk_appetites (
           name, "reinsurerId", "linesOfBusiness", "submissionTypes", countries,
           worldwide, "structurePreference", "minSumInsured", "maxSumInsured",
           currency, "maxCapacityShare", notes, "isActive"
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true)`,
        [
          appetite.name,
          target.id,
          JSON.stringify(appetite.linesOfBusiness),
          JSON.stringify(appetite.submissionTypes),
          JSON.stringify(appetite.countries),
          appetite.worldwide,
          appetite.structurePreference,
          appetite.minSumInsured,
          appetite.maxSumInsured,
          appetite.currency,
          appetite.maxCapacityShare,
          appetite.notes,
        ],
      );
      created++;
      console.log(`  created: ${appetite.name}`);
    }

    console.log(`\nDone. ${created} appetite(s) created for ${target.name}.`);
  } catch (error) {
    console.error('Risk appetite seed failed:', error);
    throw error;
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
  }
}

seedRiskAppetite()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
