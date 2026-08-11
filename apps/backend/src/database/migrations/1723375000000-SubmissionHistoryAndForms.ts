import { MigrationInterface, QueryRunner } from 'typeorm';

export class SubmissionHistoryAndForms1723375000000 implements MigrationInterface {
  name = 'SubmissionHistoryAndForms1723375000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create submission_history table
    await queryRunner.query(`
      CREATE TABLE "submission_history" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "submissionId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "changeType" varchar NOT NULL CHECK ("changeType" IN (
          'created', 'updated', 'status_changed', 'document_added', 
          'document_removed', 'submitted'
        )),
        "changes" json,
        "snapshot" json,
        "oldStatus" varchar,
        "newStatus" varchar,
        "comment" text,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_submission_history_submission" FOREIGN KEY ("submissionId")
          REFERENCES "submissions"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_submission_history_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_submission_history_submissionId" ON "submission_history" ("submissionId")`);
    await queryRunner.query(`CREATE INDEX "IDX_submission_history_changeType" ON "submission_history" ("changeType")`);
    await queryRunner.query(`CREATE INDEX "IDX_submission_history_createdAt" ON "submission_history" ("createdAt")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "submission_history"`);
  }
}