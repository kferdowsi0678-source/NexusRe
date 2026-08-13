import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LineOfBusiness } from '../../submissions/entities/submission.entity';

export enum FormType {
  PROPERTY_FACULTATIVE = 'property_facultative',
  ENGINEERING_FACULTATIVE = 'engineering_facultative',
  TREATY_GENERIC = 'treaty_generic',
  CASUALTY_FACULTATIVE = 'casualty_facultative',
  ENERGY_FACULTATIVE = 'energy_facultative',
}

export enum FieldType {
  TEXT = 'text',
  NUMBER = 'number',
  DATE = 'date',
  SELECT = 'select',
  MULTISELECT = 'multiselect',
  TEXTAREA = 'textarea',
  BOOLEAN = 'boolean',
  CURRENCY = 'currency',
  PERCENTAGE = 'percentage',
  FILE = 'file',
}

/**
 * One row is one *version* of a form schema. Versions of the same schema share
 * a name, so the pair (name, version) is what has to be unique.
 */
@Entity('form_schemas')
@Index(['name', 'version'], { unique: true })
export class FormSchema {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: FormType })
  formType: FormType;

  @Column()
  version: string;

  @Column({ type: 'json' })
  schema: any;

  @Column({ type: 'json', nullable: true })
  uiSchema: any;

  @Column({ type: 'json', nullable: true })
  validationRules: any;

  /**
   * Whether consumers may fetch this version. Kept in step with isPublished so
   * the long-standing public read endpoints never surface a draft.
   */
  @Column({ default: true })
  isActive: boolean;

  /** Explicit lifecycle flag: false while a version is still a draft. */
  @Column({ default: false })
  isPublished: boolean;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  publishedById: string | null;

  @Column({ type: 'uuid', nullable: true })
  createdById: string | null;

  /** Optional line of business this schema serves, for the admin catalogue. */
  @Column({ type: 'varchar', nullable: true })
  lineOfBusiness: LineOfBusiness | null;

  @Column({ nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}