import { MigrationInterface, QueryRunner } from 'typeorm';

export class AuthEnhancements1723373000000 implements MigrationInterface {
  name = 'AuthEnhancements1723373000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create refresh_tokens table
    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "token" varchar NOT NULL,
        "userId" uuid NOT NULL,
        "expiresAt" timestamp NOT NULL,
        "isRevoked" boolean NOT NULL DEFAULT false,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_refresh_tokens_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    
    await queryRunner.query(`CREATE INDEX "IDX_refresh_tokens_userId" ON "refresh_tokens" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_refresh_tokens_token" ON "refresh_tokens" ("token")`);

    // Create password_reset_tokens table
    await queryRunner.query(`
      CREATE TABLE "password_reset_tokens" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "token" varchar NOT NULL,
        "userId" uuid NOT NULL,
        "expiresAt" timestamp NOT NULL,
        "isUsed" boolean NOT NULL DEFAULT false,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_password_reset_tokens_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    
    await queryRunner.query(`CREATE INDEX "IDX_password_reset_tokens_userId" ON "password_reset_tokens" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_password_reset_tokens_token" ON "password_reset_tokens" ("token")`);

    // Create organization_invitations table
    await queryRunner.query(`
      CREATE TABLE "organization_invitations" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "email" varchar NOT NULL,
        "organizationId" uuid NOT NULL,
        "roleId" uuid NOT NULL,
        "token" varchar NOT NULL UNIQUE,
        "invitedById" uuid NOT NULL,
        "expiresAt" timestamp NOT NULL,
        "isAccepted" boolean NOT NULL DEFAULT false,
        "acceptedAt" timestamp,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_invitations_organization" FOREIGN KEY ("organizationId")
          REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_invitations_role" FOREIGN KEY ("roleId")
          REFERENCES "roles"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_invitations_invitedBy" FOREIGN KEY ("invitedById")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    
    await queryRunner.query(`CREATE INDEX "IDX_invitations_email" ON "organization_invitations" ("email")`);
    await queryRunner.query(`CREATE INDEX "IDX_invitations_organizationId" ON "organization_invitations" ("organizationId")`);
    await queryRunner.query(`CREATE INDEX "IDX_invitations_token" ON "organization_invitations" ("token")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "organization_invitations"`);
    await queryRunner.query(`DROP TABLE "password_reset_tokens"`);
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
  }
}
