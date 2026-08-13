import { MigrationInterface, QueryRunner } from 'typeorm';

export class DocumentExtraction1723378000000 implements MigrationInterface {
  name = 'DocumentExtraction1723378000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "document_extractions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "documentId" uuid NOT NULL,
        "submissionId" uuid NOT NULL,
        "status" varchar NOT NULL DEFAULT 'pending' CHECK ("status" IN (
          'pending', 'processing', 'completed', 'reviewed', 'failed', 'unsupported'
        )),
        "provider" varchar CHECK ("provider" IN ('anthropic', 'heuristic')),
        "model" varchar,
        "fields" json,
        "summary" text,
        "coverage" integer NOT NULL DEFAULT 0,
        "errorMessage" text,
        "inputTokens" integer,
        "outputTokens" integer,
        "requestedById" uuid,
        "reviewedById" uuid,
        "reviewedAt" timestamp,
        "appliedKeys" json,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_document_extractions_document" FOREIGN KEY ("documentId")
          REFERENCES "submission_documents"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_document_extractions_submission" FOREIGN KEY ("submissionId")
          REFERENCES "submissions"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_document_extractions_requested_by" FOREIGN KEY ("requestedById")
          REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_document_extractions_reviewed_by" FOREIGN KEY ("reviewedById")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_document_extractions_documentId" ON "document_extractions" ("documentId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_document_extractions_submission_created" ON "document_extractions" ("submissionId", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_document_extractions_status" ON "document_extractions" ("status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "document_extractions"`);
  }
}
