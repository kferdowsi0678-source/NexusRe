import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import dataSource from '../../config/typeorm.config';
import { RoleType } from '../../modules/users/entities/role.entity';
import { OrganizationType } from '../../modules/organizations/entities/organization.entity';

async function seed() {
  await dataSource.initialize();
  console.log('🌱 Starting seed...');

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    // 1. Create Roles
    console.log('Creating roles...');
    const roles = [
      {
        name: RoleType.SUPER_ADMIN,
        description: 'Platform super administrator with full access',
        permissions: ['*'],
      },
      {
        name: RoleType.ORG_ADMIN,
        description: 'Organization administrator',
        permissions: ['org:manage', 'users:manage', 'submissions:manage'],
      },
      {
        name: RoleType.CEDANT_USER,
        description: 'Cedant/Insurance company user',
        permissions: ['submissions:create', 'submissions:read', 'submissions:update'],
      },
      {
        name: RoleType.BROKER_USER,
        description: 'Broker user managing multiple cedants',
        permissions: ['submissions:create', 'submissions:read', 'submissions:update', 'quotes:read'],
      },
      {
        name: RoleType.REINSURER_UNDERWRITER,
        description: 'Reinsurer underwriter',
        permissions: ['submissions:read', 'quotes:create', 'quotes:manage'],
      },
      {
        name: RoleType.REINSURER_ADMIN,
        description: 'Reinsurer administrator',
        permissions: ['submissions:read', 'quotes:manage', 'appetite:manage', 'users:manage'],
      },
    ];

    const createdRoles = [];
    for (const role of roles) {
      const result = await queryRunner.query(
        `INSERT INTO roles (name, description, permissions) 
         VALUES ($1, $2, $3) RETURNING id, name`,
        [role.name, role.description, JSON.stringify(role.permissions)],
      );
      createdRoles.push(result[0]);
      console.log(`✓ Created role: ${role.name}`);
    }

    // 2. Create Organizations
    console.log('\nCreating organizations...');
    const organizations = [
      {
        name: 'Platform Administration',
        type: OrganizationType.ADMIN,
        country: 'Global',
        email: 'admin@nexusre.com',
      },
      {
        name: 'Lagos General Insurance',
        type: OrganizationType.CEDANT,
        country: 'Nigeria',
        address: 'Victoria Island, Lagos',
        email: 'info@lagosgeneral.ng',
      },
      {
        name: 'African Re Brokers',
        type: OrganizationType.BROKER,
        country: 'Kenya',
        address: 'Nairobi CBD',
        email: 'contact@africanrebrokers.ke',
      },
      {
        name: 'Munich Re Africa',
        type: OrganizationType.REINSURER,
        country: 'Germany',
        address: 'Munich',
        email: 'africa@munichre.com',
      },
    ];

    const createdOrgs = [];
    for (const org of organizations) {
      const result = await queryRunner.query(
        `INSERT INTO organizations (name, type, country, address, email, "isActive") 
         VALUES ($1, $2, $3, $4, $5, true) RETURNING id, name, type`,
        [org.name, org.type, org.country, org.address || null, org.email],
      );
      createdOrgs.push(result[0]);
      console.log(`✓ Created organization: ${org.name} (${org.type})`);
    }

    // 3. Create Admin User
    console.log('\nCreating admin user...');
    const adminPassword = await bcrypt.hash('Admin123!@#', 10);
    const adminOrg = createdOrgs.find(o => o.type === 'admin');
    const superAdminRole = createdRoles.find(r => r.name === RoleType.SUPER_ADMIN);

    const adminResult = await queryRunner.query(
      `INSERT INTO users (email, password, "firstName", "lastName", "organizationId", "emailVerified", "isActive")
       VALUES ($1, $2, $3, $4, $5, true, true) RETURNING id, email`,
      ['admin@nexusre.com', adminPassword, 'Platform', 'Administrator', adminOrg.id],
    );

    await queryRunner.query(
      `INSERT INTO user_roles ("userId", "roleId") VALUES ($1, $2)`,
      [adminResult[0].id, superAdminRole.id],
    );
    console.log(`✓ Created admin user: ${adminResult[0].email}`);
    console.log('  Password: Admin123!@#');

    // 4. Create Sample Users for each organization
    console.log('\nCreating sample users...');
    const sampleUsers = [
      {
        email: 'cedant@lagosgeneral.ng',
        password: 'Cedant123!',
        firstName: 'John',
        lastName: 'Okonkwo',
        orgType: OrganizationType.CEDANT,
        roleType: RoleType.CEDANT_USER,
      },
      {
        email: 'broker@africanrebrokers.ke',
        password: 'Broker123!',
        firstName: 'Sarah',
        lastName: 'Kamau',
        orgType: OrganizationType.BROKER,
        roleType: RoleType.BROKER_USER,
      },
      {
        email: 'underwriter@munichre.com',
        password: 'Reinsurer123!',
        firstName: 'Klaus',
        lastName: 'Schmidt',
        orgType: OrganizationType.REINSURER,
        roleType: RoleType.REINSURER_UNDERWRITER,
      },
    ];

    for (const user of sampleUsers) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      const org = createdOrgs.find(o => o.type === user.orgType);
      const role = createdRoles.find(r => r.name === user.roleType);

      const userResult = await queryRunner.query(
        `INSERT INTO users (email, password, "firstName", "lastName", "organizationId", "emailVerified", "isActive")
         VALUES ($1, $2, $3, $4, $5, true, true) RETURNING id, email`,
        [user.email, hashedPassword, user.firstName, user.lastName, org.id],
      );

      await queryRunner.query(
        `INSERT INTO user_roles ("userId", "roleId") VALUES ($1, $2)`,
        [userResult[0].id, role.id],
      );
      console.log(`✓ Created user: ${user.email} (${user.roleType})`);
      console.log(`  Password: ${user.password}`);
    }

    console.log('\n✅ Seed completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   - ${createdRoles.length} roles created`);
    console.log(`   - ${createdOrgs.length} organizations created`);
    console.log(`   - ${sampleUsers.length + 1} users created`);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
  }
}

seed()
  .then(() => {
    console.log('\n🎉 Seed process finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seed error:', error);
    process.exit(1);
  });
