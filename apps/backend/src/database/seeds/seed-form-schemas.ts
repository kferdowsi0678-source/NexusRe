import { DataSource } from 'typeorm';
import dataSource from '../../config/typeorm.config';

async function seedFormSchemas() {
  await dataSource.initialize();
  console.log('🌱 Seeding form schemas...');

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    // 1. Property Facultative Form Schema
    const propertyFacSchema = {
      type: 'object',
      required: ['propertyType', 'constructionType', 'yearBuilt', 'occupancy', 'address'],
      properties: {
        propertyType: {
          type: 'string',
          enum: ['building', 'warehouse', 'factory', 'office', 'retail', 'residential', 'mixed_use'],
          title: 'Property Type',
        },
        constructionType: {
          type: 'string',
          enum: ['concrete', 'steel', 'wood', 'brick', 'mixed'],
          title: 'Construction Type',
        },
        yearBuilt: {
          type: 'number',
          minimum: 1800,
          maximum: 2030,
          title: 'Year Built',
        },
        occupancy: {
          type: 'string',
          title: 'Occupancy Description',
        },
        address: {
          type: 'object',
          required: ['street', 'city', 'country'],
          properties: {
            street: { type: 'string', title: 'Street Address' },
            city: { type: 'string', title: 'City' },
            state: { type: 'string', title: 'State/Province' },
            country: { type: 'string', title: 'Country' },
            postalCode: { type: 'string', title: 'Postal Code' },
          },
        },
        numberOfFloors: {
          type: 'number',
          minimum: 1,
          title: 'Number of Floors',
        },
        totalArea: {
          type: 'number',
          minimum: 0,
          title: 'Total Area (sq m)',
        },
        hasBasement: {
          type: 'boolean',
          title: 'Has Basement',
        },
        hasElevator: {
          type: 'boolean',
          title: 'Has Elevator',
        },
        protectionSystems: {
          type: 'object',
          properties: {
            fireAlarm: { type: 'boolean', title: 'Fire Alarm System' },
            sprinklers: { type: 'boolean', title: 'Sprinkler System' },
            securityAlarm: { type: 'boolean', title: 'Security Alarm' },
            cctv: { type: 'boolean', title: 'CCTV' },
            fireExtinguishers: { type: 'boolean', title: 'Fire Extinguishers' },
          },
        },
        nearbyRisks: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['flood_zone', 'earthquake_zone', 'industrial_area', 'coastal', 'forest'],
          },
          title: 'Nearby Risks',
        },
        previousClaims: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              year: { type: 'number' },
              claimType: { type: 'string' },
              amount: { type: 'number' },
              description: { type: 'string' },
            },
          },
          title: 'Previous Claims (last 5 years)',
        },
      },
    };

    const propertyFacUI = {
      'ui:order': ['propertyType', 'constructionType', 'yearBuilt', 'occupancy', 'address', 'numberOfFloors', 'totalArea', 'hasBasement', 'hasElevator', 'protectionSystems', 'nearbyRisks', 'previousClaims'],
      propertyType: { 'ui:widget': 'select' },
      constructionType: { 'ui:widget': 'select' },
      occupancy: { 'ui:widget': 'textarea', 'ui:options': { rows: 3 } },
      nearbyRisks: { 'ui:widget': 'checkboxes' },
    };

    await queryRunner.query(
      `INSERT INTO form_schemas (name, "formType", version, schema, "uiSchema", description, "isActive")
       VALUES ($1, $2, $3, $4, $5, $6, true)`,
      [
        'Property Facultative Form',
        'property_facultative',
        '1.0.0',
        JSON.stringify(propertyFacSchema),
        JSON.stringify(propertyFacUI),
        'Standard form for property facultative reinsurance submissions',
      ],
    );
    console.log('✓ Created Property Facultative form schema');

    // 2. Engineering Facultative Form Schema
    const engineeringFacSchema = {
      type: 'object',
      required: ['projectType', 'projectName', 'contractValue', 'projectLocation', 'contractor'],
      properties: {
        projectType: {
          type: 'string',
          enum: ['construction', 'civil_engineering', 'infrastructure', 'oil_gas', 'power_plant', 'mining'],
          title: 'Project Type',
        },
        projectName: {
          type: 'string',
          title: 'Project Name',
        },
        contractValue: {
          type: 'number',
          minimum: 0,
          title: 'Contract Value',
        },
        projectLocation: {
          type: 'object',
          required: ['country', 'city'],
          properties: {
            country: { type: 'string', title: 'Country' },
            city: { type: 'string', title: 'City' },
            gpsCoordinates: { type: 'string', title: 'GPS Coordinates' },
          },
        },
        contractor: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', title: 'Contractor Name' },
            experience: { type: 'string', title: 'Experience Description' },
            financialRating: { type: 'string', title: 'Financial Rating' },
          },
        },
        projectDuration: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date', title: 'Start Date' },
            completionDate: { type: 'string', format: 'date', title: 'Completion Date' },
            maintenancePeriod: { type: 'number', title: 'Maintenance Period (months)' },
          },
        },
        coverageRequired: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['CAR', 'EAR', 'CPM', 'TPL', 'ALOP'],
          },
          title: 'Coverage Required',
        },
        projectDescription: {
          type: 'string',
          title: 'Project Description',
        },
        designDetails: {
          type: 'object',
          properties: {
            architect: { type: 'string', title: 'Architect' },
            engineer: { type: 'string', title: 'Engineer' },
            supervisor: { type: 'string', title: 'Site Supervisor' },
          },
        },
        specialRisks: {
          type: 'array',
          items: { type: 'string' },
          title: 'Special Risks/Hazards',
        },
      },
    };

    const engineeringFacUI = {
      'ui:order': ['projectType', 'projectName', 'contractValue', 'projectLocation', 'contractor', 'projectDuration', 'coverageRequired', 'projectDescription', 'designDetails', 'specialRisks'],
      projectType: { 'ui:widget': 'select' },
      coverageRequired: { 'ui:widget': 'checkboxes' },
      projectDescription: { 'ui:widget': 'textarea', 'ui:options': { rows: 5 } },
    };

    await queryRunner.query(
      `INSERT INTO form_schemas (name, "formType", version, schema, "uiSchema", description, "isActive")
       VALUES ($1, $2, $3, $4, $5, $6, true)`,
      [
        'Engineering Facultative Form',
        'engineering_facultative',
        '1.0.0',
        JSON.stringify(engineeringFacSchema),
        JSON.stringify(engineeringFacUI),
        'Standard form for engineering and construction reinsurance submissions',
      ],
    );
    console.log('✓ Created Engineering Facultative form schema');

    // 3. Treaty Generic Form Schema
    const treatyGenericSchema = {
      type: 'object',
      required: ['treatyType', 'linesOfBusiness', 'geographicScope', 'effectiveDate', 'expiryDate'],
      properties: {
        treatyType: {
          type: 'string',
          enum: ['quota_share', 'surplus', 'excess_of_loss', 'stop_loss', 'aggregate_excess'],
          title: 'Treaty Type',
        },
        linesOfBusiness: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['property', 'casualty', 'motor', 'marine', 'aviation', 'energy', 'engineering'],
          },
          title: 'Lines of Business Covered',
        },
        geographicScope: {
          type: 'object',
          properties: {
            countries: {
              type: 'array',
              items: { type: 'string' },
              title: 'Countries Covered',
            },
            regions: {
              type: 'array',
              items: { type: 'string' },
              title: 'Regions',
            },
            worldwide: { type: 'boolean', title: 'Worldwide Coverage' },
          },
        },
        effectiveDate: {
          type: 'string',
          format: 'date',
          title: 'Effective Date',
        },
        expiryDate: {
          type: 'string',
          format: 'date',
          title: 'Expiry Date',
        },
        treatyStructure: {
          type: 'object',
          properties: {
            retention: { type: 'number', title: 'Retention Amount' },
            limit: { type: 'number', title: 'Treaty Limit' },
            numberOfReinstatements: { type: 'number', title: 'Number of Reinstatements' },
            premiumRate: { type: 'number', title: 'Premium Rate (%)' },
          },
        },
        underwritingYear: {
          type: 'number',
          minimum: 2000,
          maximum: 2050,
          title: 'Underwriting Year',
        },
        estimatedPremium: {
          type: 'number',
          minimum: 0,
          title: 'Estimated Premium Income',
        },
        historicalData: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              year: { type: 'number', title: 'Year' },
              premiumIncome: { type: 'number', title: 'Premium Income' },
              claims: { type: 'number', title: 'Claims' },
              lossRatio: { type: 'number', title: 'Loss Ratio (%)' },
            },
          },
          title: 'Historical Performance (last 5 years)',
        },
        exclusions: {
          type: 'array',
          items: { type: 'string' },
          title: 'Exclusions',
        },
        specialConditions: {
          type: 'string',
          title: 'Special Conditions/Terms',
        },
      },
    };

    const treatyGenericUI = {
      'ui:order': ['treatyType', 'linesOfBusiness', 'geographicScope', 'effectiveDate', 'expiryDate', 'treatyStructure', 'underwritingYear', 'estimatedPremium', 'historicalData', 'exclusions', 'specialConditions'],
      treatyType: { 'ui:widget': 'select' },
      linesOfBusiness: { 'ui:widget': 'checkboxes' },
      specialConditions: { 'ui:widget': 'textarea', 'ui:options': { rows: 5 } },
    };

    await queryRunner.query(
      `INSERT INTO form_schemas (name, "formType", version, schema, "uiSchema", description, "isActive")
       VALUES ($1, $2, $3, $4, $5, $6, true)`,
      [
        'Treaty Generic Form',
        'treaty_generic',
        '1.0.0',
        JSON.stringify(treatyGenericSchema),
        JSON.stringify(treatyGenericUI),
        'Generic form for treaty reinsurance submissions',
      ],
    );
    console.log('✓ Created Treaty Generic form schema');

    console.log('\n✅ Form schemas seed completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   - 3 form schemas created');
    console.log('   - Property Facultative (v1.0.0)');
    console.log('   - Engineering Facultative (v1.0.0)');
    console.log('   - Treaty Generic (v1.0.0)');
  } catch (error) {
    console.error('❌ Form schemas seed failed:', error);
    throw error;
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
  }
}

seedFormSchemas()
  .then(() => {
    console.log('\n🎉 Form schemas seed process finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seed error:', error);
    process.exit(1);
  });
