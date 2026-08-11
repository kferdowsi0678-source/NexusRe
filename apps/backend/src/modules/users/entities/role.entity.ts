import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
} from 'typeorm';
import { User } from './user.entity';

export enum RoleType {
  SUPER_ADMIN = 'super_admin',
  ORG_ADMIN = 'org_admin',
  CEDANT_USER = 'cedant_user',
  BROKER_USER = 'broker_user',
  REINSURER_UNDERWRITER = 'reinsurer_underwriter',
  REINSURER_ADMIN = 'reinsurer_admin',
}

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, type: 'enum', enum: RoleType })
  name: RoleType;

  @Column()
  description: string;

  @Column('json', { nullable: true })
  permissions: string[];

  @ManyToMany(() => User, (user) => user.roles)
  users: User[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
