import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase4AuditEmailPrefs1723377000000 implements MigrationInterface {
  name = 'Phase4AuditEmailPrefs1723377000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "action" varchar NOT NULL CHECK ("action" IN (
          'create', 'update', 'delete', 'login', 'logout', 'login_failed'
        )),
        "resourceType" varchar NOT NULL CHECK ("resourceType" IN (
          'user', 'organization', 'submission', 'quote', 'document',
          'form_schema', 'risk_appetite', 'message', 'notification'
        )),
        "resourceId" varchar NOT NULL,
        "actorId" uuid,
        "organizationId" uuid,
        "before" json,
        "after" json,
        "ipAddress" varchar,
        "userAgent" text,
        "metadata" json,
        "createdAt" timestamp NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_actor" ON "audit_logs" ("actorId", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_resource" ON "audit_logs" ("resourceType", "resourceId", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_created" ON "audit_logs" ("createdAt")`,
    );

    await queryRunner.query(`
      CREATE TABLE "email_preferences" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL UNIQUE,
        "quoteReceived" boolean NOT NULL DEFAULT true,
        "quoteStatusChanged" boolean NOT NULL DEFAULT true,
        "messageReceived" boolean NOT NULL DEFAULT true,
        "submissionStatusChanged" boolean NOT NULL DEFAULT false,
        "weeklyDigest" boolean NOT NULL DEFAULT false,
        CONSTRAINT "FK_email_preferences_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "email_preferences"`);
    await queryRunner.query(`DROP TABLE "audit_logs"`);
  }
}
