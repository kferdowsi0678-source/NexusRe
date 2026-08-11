import { MigrationInterface, QueryRunner } from 'typeorm';

export class FormSchemasTable1723374000000 implements MigrationInterface {
  name = 'FormSchemasTable1723374000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "form_schemas" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar NOT NULL UNIQUE,
        "formType" varchar NOT NULL CHECK ("formType" IN (
          'property_facultative', 'engineering_facultative', 'treaty_generic',
          'casualty_facultative', 'energy_facultative'
        )),
        "version" varchar NOT NULL,
        "schema" json NOT NULL,
        "uiSchema" json,
        "validationRules" json,
        "isActive" boolean NOT NULL DEFAULT true,
        "description" varchar,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_form_schemas_formType" ON "form_schemas" ("formType")`);
    await queryRunner.query(`CREATE INDEX "IDX_form_schemas_isActive" ON "form_schemas" ("isActive")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "form_schemas"`);
  }
}