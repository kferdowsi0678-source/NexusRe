import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

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

@Entity('form_schemas')
export class FormSchema {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'enum', enum: FormType })
  formType: FormType;

  @Column()
  version: string;

  @Column({ type: 'json' })
  schema: any; // JSON Schema definition

  @Column({ type: 'json', nullable: true })
  uiSchema: any; // UI rendering hints

  @Column({ type: 'json', nullable: true })
  validationRules: any; // Custom validation rules

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
