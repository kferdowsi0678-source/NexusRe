import { MigrationInterface, QueryRunner } from 'typeorm';

export class SubmissionsSchema1723372000000 implements MigrationInterface {
  name = 'SubmissionsSchema1723372000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create submissions table
    await queryRunner.query(`
      CREATE TABLE "submissions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "title" varchar NOT NULL,
        "type" varchar NOT NULL CHECK ("type" IN ('treaty', 'facultative')),
        "lineOfBusiness" varchar NOT NULL CHECK ("lineOfBusiness" IN (
          'property', 'casualty', 'energy', 'marine', 'aviation', 'cyber',
          'political_violence', 'agriculture', 'engineering', 'professional_indemnity',
          'motor', 'liability'
        )),
        "status" varchar NOT NULL DEFAULT 'draft' CHECK ("status" IN (
          'draft', 'submitted', 'under_review', 'quoted', 'negotiating',
          'bound', 'declined', 'expired'
        )),
        "description" text,
        "sumInsured" decimal(15,2),
        "currency" varchar,
        "inceptionDate" date,
        "expiryDate" date,
        "riskDetails" json,
        "lossHistory" json,
        "completenessScore" int NOT NULL DEFAULT 0,
        "cedantId" uuid NOT NULL,
        "submittedById" uuid NOT NULL,
        "submittedAt" timestamp,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_submissions_cedant" FOREIGN KEY ("cedantId")
          REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_submissions_submittedBy" FOREIGN KEY ("submittedById")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Create indexes for submissions
    await queryRunner.query(`CREATE INDEX "IDX_submissions_cedantId" ON "submissions" ("cedantId")`);
    await queryRunner.query(`CREATE INDEX "IDX_submissions_status" ON "submissions" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_submissions_lineOfBusiness" ON "submissions" ("lineOfBusiness")`);
    await queryRunner.query(`CREATE INDEX "IDX_submissions_createdAt" ON "submissions" ("createdAt")`);
    await queryRunner.query(`CREATE INDEX "IDX_submissions_type" ON "submissions" ("type")`);

    // Create submission_documents table
    await queryRunner.query(`
      CREATE TABLE "submission_documents" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "fileName" varchar NOT NULL,
        "fileType" varchar NOT NULL,
        "fileSize" int NOT NULL,
        "fileUrl" varchar NOT NULL,
        "s3Key" varchar,
        "description" text,
        "isExtracted" boolean NOT NULL DEFAULT false,
        "extractedData" json,
        "submissionId" uuid NOT NULL,
        "uploadedById" uuid NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_submission_documents_submission" FOREIGN KEY ("submissionId")
          REFERENCES "submissions"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_submission_documents_uploadedBy" FOREIGN KEY ("uploadedById")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Create indexes for submission_documents
    await queryRunner.query(`CREATE INDEX "IDX_submission_documents_submissionId" ON "submission_documents" ("submissionId")`);

    // Create quotes table
    await queryRunner.query(`
      CREATE TABLE "quotes" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "submissionId" uuid NOT NULL,
        "reinsurerId" uuid NOT NULL,
        "submittedById" uuid NOT NULL,
        "status" varchar NOT NULL DEFAULT 'indication' CHECK ("status" IN (
          'indication', 'firm_offer', 'declined', 'accepted', 'expired'
        )),
        "rate" decimal(10,4) NOT NULL,
        "premium" decimal(15,2) NOT NULL,
        "capacity" decimal(10,2) NOT NULL,
        "terms" text,
        "conditions" text,
        "exclusions" text,
        "validUntil" date,
        "additionalInfo" json,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_quotes_submission" FOREIGN KEY ("submissionId")
          REFERENCES "submissions"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_quotes_reinsurer" FOREIGN KEY ("reinsurerId")
          REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_quotes_submittedBy" FOREIGN KEY ("submittedById")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Create indexes for quotes
    await queryRunner.query(`CREATE INDEX "IDX_quotes_submissionId" ON "quotes" ("submissionId")`);
    await queryRunner.query(`CREATE INDEX "IDX_quotes_reinsurerId" ON "quotes" ("reinsurerId")`);
    await queryRunner.query(`CREATE INDEX "IDX_quotes_status" ON "quotes" ("status")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "quotes"`);
    await queryRunner.query(`DROP TABLE "submission_documents"`);
    await queryRunner.query(`DROP TABLE "submissions"`);
  }
}
