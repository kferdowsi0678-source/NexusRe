import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1723371000000 implements MigrationInterface {
  name = 'InitialSchema1723371000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create organizations table
    await queryRunner.query(`
      CREATE TABLE "organizations" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar NOT NULL UNIQUE,
        "type" varchar NOT NULL CHECK ("type" IN ('cedant', 'broker', 'reinsurer', 'admin')),
        "country" varchar,
        "address" varchar,
        "phone" varchar,
        "email" varchar UNIQUE,
        "website" varchar,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now()
      )
    `);

    // Create roles table
    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar NOT NULL UNIQUE CHECK ("name" IN (
          'super_admin', 'org_admin', 'cedant_user', 'broker_user', 
          'reinsurer_underwriter', 'reinsurer_admin'
        )),
        "description" varchar NOT NULL,
        "permissions" json,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now()
      )
    `);

    // Create users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "email" varchar NOT NULL UNIQUE,
        "password" varchar NOT NULL,
        "firstName" varchar NOT NULL,
        "lastName" varchar NOT NULL,
        "phone" varchar,
        "emailVerified" boolean NOT NULL DEFAULT false,
        "mfaEnabled" boolean NOT NULL DEFAULT false,
        "mfaSecret" varchar,
        "isActive" boolean NOT NULL DEFAULT true,
        "organizationId" uuid NOT NULL,
        "lastLoginAt" timestamp,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_users_organization" FOREIGN KEY ("organizationId") 
          REFERENCES "organizations"("id") ON DELETE CASCADE
      )
    `);

    // Create user_roles junction table
    await queryRunner.query(`
      CREATE TABLE "user_roles" (
        "userId" uuid NOT NULL,
        "roleId" uuid NOT NULL,
        PRIMARY KEY ("userId", "roleId"),
        CONSTRAINT "FK_user_roles_user" FOREIGN KEY ("userId") 
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_roles_role" FOREIGN KEY ("roleId") 
          REFERENCES "roles"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "user_roles"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TABLE "roles"`);
    await queryRunner.query(`DROP TABLE "organizations"`);
  }
}
