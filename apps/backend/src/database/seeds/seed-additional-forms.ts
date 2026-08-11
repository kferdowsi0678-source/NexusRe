import { DataSource } from 'typeorm';
import dataSource from '../../config/typeorm.config';

async function seedAdditionalFormSchemas() {
  await dataSource.initialize();
  console.log('🌱 Seeding additional form schemas (Casualty & Energy)...');

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    // 1. Casualty Facultative Form Schema
    const casualtyFacSchema = {
      type: 'object',
      required: ['liabilityType', 'policyHolder', 'sumInsured', 'territory'],
      properties: {
        liabilityType: {
          type: 'string',
          enum: ['general_liability', 'product_liability', 'professional_indemnity', 'directors_officers', 'public_liability', 'employers_liability'],
          title: 'Liability Type',
        },
        policyHolder: {
          type: 'object',
          required: ['name', 'industry'],
          properties: {
            name: { type: 'string', title: 'Policy Holder Name' },
            industry: { type: 'string', title: 'Industry/Sector' },
            yearsInBusiness: { type: 'number', title: 'Years in Business' },
            numberOfEmployees: { type: 'number', title: 'Number of Employees' },
            annualRevenue: { type: 'number', title: 'Annual Revenue' },
          },
        },
        sumInsured: {
          type: 'number',
          minimum: 0,
          title: 'Sum Insured / Limit of Indemnity',
        },
        territory: {
          type: 'object',
          properties: {
            coverage: {
              type: 'string',
              enum: ['domestic', 'regional', 'worldwide', 'worldwide_excluding_usa'],
              title: 'Geographic Coverage',
            },
            specificCountries: {
              type: 'array',
              items: { type: 'string' },
              title: 'Specific Countries',
            },
          },
        },
        retroactiveDate: {
          type: 'string',
          format: 'date',
          title: 'Retroactive Date',
        },
        claimsHistory: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              year: { type: 'number', title: 'Year' },
              numberOfClaims: { type: 'number', title: 'Number of Claims' },
              totalIncurred: { type: 'number', title: 'Total Incurred' },
              largestClaim: { type: 'number', title: 'Largest Single Claim' },
              status: { type: 'string', enum: ['open', 'closed', 'reserved'], title: 'Status' },
            },
          },
          title: 'Claims History (last 5 years)',
        },
        riskManagement: {
          type: 'object',
          properties: {
            hasQualityManagement: { type: 'boolean', title: 'Quality Management System' },
            certifications: { 
              type: 'array', 
              items: { type: 'string' },
              title: 'Certifications (ISO, etc.)'
            },
            safetyPrograms: { type: 'string', title: 'Safety Programs Description' },
          },
        },
        exclusions: {
          type: 'array',
          items: { type: 'string' },
          title: 'Requested Exclusions',
        },
        deductible: {
          type: 'number',
          title: 'Deductible/Excess',
        },
      },
    };

    const casualtyFacUI = {
      'ui:order': ['liabilityType', 'policyHolder', 'sumInsured', 'territory', 'retroactiveDate', 'claimsHistory', 'riskManagement', 'exclusions', 'deductible'],
      liabilityType: { 'ui:widget': 'select' },
      'territory.coverage': { 'ui:widget': 'select' },
    };

    await queryRunner.query(
      `INSERT INTO form_schemas (name, "formType", version, schema, "uiSchema", description, "isActive")
       VALUES ($1, $2, $3, $4, $5, $6, true)`,
      [
        'Casualty Facultative Form',
        'casualty_facultative',
        '1.0.0',
        JSON.stringify(casualtyFacSchema),
        JSON.stringify(casualtyFacUI),
        'Standard form for casualty and liability reinsurance submissions',
      ],
    );
    console.log('✓ Created Casualty Facultative form schema');

    // 2. Energy Facultative Form Schema
    const energyFacSchema = {
      type: 'object',
      required: ['facilityType', 'facilityName', 'location', 'operationType'],
      properties: {
        facilityType: {
          type: 'string',
          enum: ['oil_gas_upstream', 'oil_gas_downstream', 'refinery', 'petrochemical', 'pipeline', 'storage', 'offshore_platform', 'power_plant', 'renewable_energy'],
          title: 'Facility Type',
        },
        facilityName: {
          type: 'string',
          title: 'Facility Name',
        },
        location: {
          type: 'object',
          required: ['country'],
          properties: {
            country: { type: 'string', title: 'Country' },
            region: { type: 'string', title: 'Region' },
            coordinates: { type: 'string', title: 'GPS Coordinates' },
            onshoreOffshore: { 
              type: 'string', 
              enum: ['onshore', 'offshore', 'subsea'],
              title: 'Onshore/Offshore'
            },
            waterDepth: { type: 'number', title: 'Water Depth (meters)' },
          },
        },
        operationType: {
          type: 'string',
          enum: ['exploration', 'drilling', 'production', 'processing', 'transportation', 'storage'],
          title: 'Operation Type',
        },
        capacity: {
          type: 'object',
          properties: {
            production: { type: 'number', title: 'Production Capacity' },
            unit: { 
              type: 'string',
              enum: ['barrels_per_day', 'cubic_meters', 'MW', 'tonnes'],
              title: 'Unit'
            },
          },
        },
        valuations: {
          type: 'object',
          properties: {
            totalInsuredValue: { type: 'number', title: 'Total Insured Value' },
            physicalDamage: { type: 'number', title: 'Physical Damage' },
            businessInterruption: { type: 'number', title: 'Business Interruption' },
            operatingExpenses: { type: 'number', title: 'Increased Operating Expenses' },
            wellControl: { type: 'number', title: 'Control of Well / Seepage & Pollution' },
          },
        },
        operationalDetails: {
          type: 'object',
          properties: {
            yearCommissioned: { type: 'number', title: 'Year Commissioned' },
            operator: { type: 'string', title: 'Operator Name' },
            operatorExperience: { type: 'string', title: 'Operator Experience' },
            maintenanceSchedule: { type: 'string', title: 'Maintenance Schedule' },
          },
        },
        safetyMeasures: {
          type: 'object',
          properties: {
            hasEmergencyShutdown: { type: 'boolean', title: 'Emergency Shutdown System' },
            hasFireProtection: { type: 'boolean', title: 'Fire Protection System' },
            hasGasDetection: { type: 'boolean', title: 'Gas Detection System' },
            certifications: {
              type: 'array',
              items: { type: 'string' },
              title: 'Safety Certifications'
            },
          },
        },
        environmentalRisks: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['earthquake', 'hurricane', 'flood', 'tsunami', 'subsidence', 'erosion'],
          },
          title: 'Environmental Risks',
        },
        claimsHistory: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              year: { type: 'number' },
              incident: { type: 'string' },
              cost: { type: 'number' },
              downtime: { type: 'number', title: 'Downtime (days)' },
            },
          },
          title: 'Claims/Incident History',
        },
      },
    };

    const energyFacUI = {
      'ui:order': ['facilityType', 'facilityName', 'location', 'operationType', 'capacity', 'valuations', 'operationalDetails', 'safetyMeasures', 'environmentalRisks', 'claimsHistory'],
      facilityType: { 'ui:widget': 'select' },
      operationType: { 'ui:widget': 'select' },
      environmentalRisks: { 'ui:widget': 'checkboxes' },
    };

    await queryRunner.query(
      `INSERT INTO form_schemas (name, "formType", version, schema, "uiSchema", description, "isActive")
       VALUES ($1, $2, $3, $4, $5, $6, true)`,
      [
        'Energy Facultative Form',
        'energy_facultative',
        '1.0.0',
        JSON.stringify(energyFacSchema),
        JSON.stringify(energyFacUI),
        'Standard form for energy and oil/gas reinsurance submissions',
      ],
    );
    console.log('✓ Created Energy Facultative form schema');

    console.log('\n✅ Additional form schemas seed completed!');
    console.log('\n📋 Summary:');
    console.log('   - Casualty Facultative (v1.0.0)');
    console.log('   - Energy Facultative (v1.0.0)');
  } catch (error) {
    console.error('❌ Additional forms seed failed:', error);
    throw error;
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
  }
}

seedAdditionalFormSchemas()
  .then(() => {
    console.log('\n🎉 Additional form schemas seed finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seed error:', error);
    process.exit(1);
  });
