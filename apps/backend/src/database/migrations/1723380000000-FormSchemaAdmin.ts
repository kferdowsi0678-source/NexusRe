import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 5.7 — form schemas become editable from the admin panel.
 *
 * Until now a row in form_schemas was whatever the seed scripts inserted, and
 * "name" was unique, so a schema could never carry more than one version. This
 * migration turns the table into a versioned, publishable catalogue:
 *
 *  - drafts and published versions of the same schema share a name,
 *  - "isPublished" records the lifecycle explicitly (existing rows are
 *    backfilled from "isActive" so the consumer endpoints keep behaving),
 *  - authorship and line of business are tracked for the admin list view.
 */
export class FormSchemaAdmin1723380000000 implements MigrationInterface {
  name = 'FormSchemaAdmin1723380000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // The original table declared "name" varchar NOT NULL UNIQUE, which
    // Postgres named automatically. Look the constraint up rather than guess.
    await queryRunner.query(`
      DO $$
      DECLARE existing record;
      BEGIN
        FOR existing IN
          SELECT con.conname
          FROM pg_constraint con
          JOIN pg_class rel ON rel.oid = con.conrelid
          WHERE rel.relname = 'form_schemas'
            AND con.contype = 'u'
            AND (
              SELECT array_agg(att.attname ORDER BY att.attname)
              FROM unnest(con.conkey) AS k
              JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = k
            ) = ARRAY['name']
        LOOP
          EXECUTE format('ALTER TABLE "form_schemas" DROP CONSTRAINT %I', existing.conname);
        END LOOP;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "form_schemas"
        ADD COLUMN IF NOT EXISTS "isPublished" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "publishedAt" timestamp,
        ADD COLUMN IF NOT EXISTS "publishedById" uuid,
        ADD COLUMN IF NOT EXISTS "createdById" uuid,
        ADD COLUMN IF NOT EXISTS "lineOfBusiness" varchar
    `);

    await queryRunner.query(`
      ALTER TABLE "form_schemas"
        ADD CONSTRAINT "CHK_form_schemas_lineOfBusiness" CHECK ("lineOfBusiness" IS NULL OR "lineOfBusiness" IN (
          'property', 'casualty', 'energy', 'marine', 'aviation', 'cyber',
          'political_violence', 'agriculture', 'engineering',
          'professional_indemnity', 'motor', 'liability'
        ))
    `);

    // Everything the seeds created is live today, so it is published.
    await queryRunner.query(`
      UPDATE "form_schemas"
      SET "isPublished" = true, "publishedAt" = COALESCE("publishedAt", "createdAt")
      WHERE "isActive" = true
    `);

    await queryRunner.query(`
      ALTER TABLE "form_schemas"
        ADD CONSTRAINT "UQ_form_schemas_name_version" UNIQUE ("name", "version")
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_form_schemas_isPublished" ON "form_schemas" ("isPublished")`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_form_schemas_name" ON "form_schemas" ("name")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_form_schemas_name"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_form_schemas_isPublished"`);
    await queryRunner.query(
      `ALTER TABLE "form_schemas" DROP CONSTRAINT IF EXISTS "UQ_form_schemas_name_version"`,
    );
    await queryRunner.query(
      `ALTER TABLE "form_schemas" DROP CONSTRAINT IF EXISTS "CHK_form_schemas_lineOfBusiness"`,
    );

    // Only one row per name may survive the restored unique constraint.
    await queryRunner.query(`
      DELETE FROM "form_schemas" a
      USING "form_schemas" b
      WHERE a."name" = b."name" AND a."createdAt" > b."createdAt"
    `);

    await queryRunner.query(`
      ALTER TABLE "form_schemas"
        DROP COLUMN IF EXISTS "lineOfBusiness",
        DROP COLUMN IF EXISTS "createdById",
        DROP COLUMN IF EXISTS "publishedById",
        DROP COLUMN IF EXISTS "publishedAt",
        DROP COLUMN IF EXISTS "isPublished"
    `);

    await queryRunner.query(
      `ALTER TABLE "form_schemas" ADD CONSTRAINT "UQ_form_schemas_name" UNIQUE ("name")`,
    );
  }
}
