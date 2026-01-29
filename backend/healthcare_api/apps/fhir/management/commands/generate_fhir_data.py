"""
Generate Synthetic FHIR R4 Healthcare Data

This command generates realistic synthetic healthcare data following FHIR R4 standards.
Uses realistic medical codes (ICD-10, SNOMED CT, LOINC, RxNorm, CVX) and demographics.
"""

import random
import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
from healthcare_api.apps.fhir.models import (
    Organization, Practitioner, Patient, Encounter, Condition,
    Observation, MedicationRequest, AllergyIntolerance, Procedure,
    Immunization, DiagnosticReport, CarePlan
)


# =============================================================================
# Realistic Medical Data
# =============================================================================

# Common ICD-10-CM codes with descriptions
ICD10_CONDITIONS = [
    ('E11.9', 'Type 2 diabetes mellitus without complications'),
    ('E11.65', 'Type 2 diabetes mellitus with hyperglycemia'),
    ('I10', 'Essential (primary) hypertension'),
    ('I25.10', 'Atherosclerotic heart disease of native coronary artery'),
    ('J06.9', 'Acute upper respiratory infection, unspecified'),
    ('J18.9', 'Pneumonia, unspecified organism'),
    ('J45.909', 'Unspecified asthma, uncomplicated'),
    ('K21.0', 'Gastro-esophageal reflux disease with esophagitis'),
    ('M54.5', 'Low back pain'),
    ('M79.3', 'Panniculitis, unspecified'),
    ('F32.9', 'Major depressive disorder, single episode, unspecified'),
    ('F41.1', 'Generalized anxiety disorder'),
    ('G43.909', 'Migraine, unspecified, not intractable'),
    ('N39.0', 'Urinary tract infection, site not specified'),
    ('R05.9', 'Cough, unspecified'),
    ('R51.9', 'Headache, unspecified'),
    ('Z23', 'Encounter for immunization'),
    ('Z00.00', 'Encounter for general adult medical examination'),
    ('Z96.641', 'Presence of right artificial hip joint'),
    ('B34.9', 'Viral infection, unspecified'),
    ('E78.5', 'Hyperlipidemia, unspecified'),
    ('G47.00', 'Insomnia, unspecified'),
    ('K59.00', 'Constipation, unspecified'),
    ('R10.9', 'Unspecified abdominal pain'),
    ('R53.83', 'Other fatigue'),
]

# LOINC codes for vital signs
VITAL_SIGNS_LOINC = [
    ('8302-2', 'Body height', 'cm', 150, 200),
    ('29463-7', 'Body weight', 'kg', 50, 120),
    ('39156-5', 'Body mass index', 'kg/m2', 18, 40),
    ('8867-4', 'Heart rate', '/min', 60, 100),
    ('9279-1', 'Respiratory rate', '/min', 12, 20),
    ('8310-5', 'Body temperature', 'Cel', 36.1, 37.5),
    ('85354-9', 'Blood pressure panel', 'mm[Hg]', 90, 140),
    ('8480-6', 'Systolic blood pressure', 'mm[Hg]', 90, 180),
    ('8462-4', 'Diastolic blood pressure', 'mm[Hg]', 60, 120),
    ('59408-5', 'Oxygen saturation', '%', 94, 100),
]

# LOINC codes for lab tests
LAB_TESTS_LOINC = [
    ('2339-0', 'Glucose [Mass/volume] in Blood', 'mg/dL', 70, 140),
    ('2345-7', 'Glucose [Mass/volume] in Serum or Plasma', 'mg/dL', 70, 140),
    ('4548-4', 'Hemoglobin A1c/Hemoglobin.total in Blood', '%', 4.5, 10.0),
    ('2093-3', 'Cholesterol [Mass/volume] in Serum or Plasma', 'mg/dL', 125, 300),
    ('2085-9', 'HDL Cholesterol', 'mg/dL', 30, 90),
    ('2089-1', 'LDL Cholesterol', 'mg/dL', 50, 200),
    ('2571-8', 'Triglycerides', 'mg/dL', 50, 400),
    ('2160-0', 'Creatinine [Mass/volume] in Serum or Plasma', 'mg/dL', 0.6, 1.5),
    ('3094-0', 'Urea nitrogen [Mass/volume] in Serum or Plasma', 'mg/dL', 7, 25),
    ('17861-6', 'Calcium [Mass/volume] in Serum or Plasma', 'mg/dL', 8.5, 10.5),
    ('2823-3', 'Potassium [Moles/volume] in Serum or Plasma', 'mmol/L', 3.5, 5.5),
    ('2951-2', 'Sodium [Moles/volume] in Serum or Plasma', 'mmol/L', 136, 145),
    ('718-7', 'Hemoglobin [Mass/volume] in Blood', 'g/dL', 11, 17),
    ('4544-3', 'Hematocrit [Volume Fraction] of Blood', '%', 35, 50),
    ('6690-2', 'Leukocytes [#/volume] in Blood', '10*3/uL', 4, 11),
    ('777-3', 'Platelets [#/volume] in Blood', '10*3/uL', 150, 400),
    ('1742-6', 'Alanine aminotransferase [Enzymatic activity/volume] in Serum or Plasma', 'U/L', 7, 56),
    ('1920-8', 'Aspartate aminotransferase [Enzymatic activity/volume] in Serum or Plasma', 'U/L', 10, 40),
    ('1975-2', 'Bilirubin.total [Mass/volume] in Serum or Plasma', 'mg/dL', 0.1, 1.2),
    ('2532-0', 'Lactate dehydrogenase [Enzymatic activity/volume] in Serum or Plasma', 'U/L', 140, 280),
]

# RxNorm medications
MEDICATIONS_RXNORM = [
    ('197361', 'Amlodipine 5 MG Oral Tablet', '5 mg', 'Oral', 1, 'd'),
    ('310798', 'Metformin hydrochloride 500 MG Oral Tablet', '500 mg', 'Oral', 2, 'd'),
    ('197361', 'Lisinopril 10 MG Oral Tablet', '10 mg', 'Oral', 1, 'd'),
    ('311989', 'Atorvastatin 20 MG Oral Tablet', '20 mg', 'Oral', 1, 'd'),
    ('197319', 'Omeprazole 20 MG Delayed Release Oral Capsule', '20 mg', 'Oral', 1, 'd'),
    ('866924', 'Metoprolol Succinate 50 MG Extended Release Oral Tablet', '50 mg', 'Oral', 1, 'd'),
    ('197318', 'Aspirin 81 MG Delayed Release Oral Tablet', '81 mg', 'Oral', 1, 'd'),
    ('310429', 'Furosemide 40 MG Oral Tablet', '40 mg', 'Oral', 1, 'd'),
    ('197380', 'Levothyroxine Sodium 50 MCG Oral Tablet', '50 mcg', 'Oral', 1, 'd'),
    ('312961', 'Sertraline 50 MG Oral Tablet', '50 mg', 'Oral', 1, 'd'),
    ('197517', 'Gabapentin 300 MG Oral Capsule', '300 mg', 'Oral', 3, 'd'),
    ('857005', 'Acetaminophen 500 MG Oral Tablet', '500 mg', 'Oral', 4, 'd'),
    ('197591', 'Ibuprofen 400 MG Oral Tablet', '400 mg', 'Oral', 3, 'd'),
    ('312289', 'Prednisone 10 MG Oral Tablet', '10 mg', 'Oral', 1, 'd'),
    ('197650', 'Amoxicillin 500 MG Oral Capsule', '500 mg', 'Oral', 3, 'd'),
    ('197511', 'Azithromycin 250 MG Oral Tablet', '250 mg', 'Oral', 1, 'd'),
    ('311026', 'Hydrochlorothiazide 25 MG Oral Tablet', '25 mg', 'Oral', 1, 'd'),
    ('860975', 'Losartan potassium 50 MG Oral Tablet', '50 mg', 'Oral', 1, 'd'),
    ('197446', 'Clopidogrel 75 MG Oral Tablet', '75 mg', 'Oral', 1, 'd'),
    ('197381', 'Montelukast 10 MG Oral Tablet', '10 mg', 'Oral', 1, 'd'),
]

# CVX vaccine codes
VACCINES_CVX = [
    ('08', 'Hepatitis B vaccine'),
    ('10', 'Poliovirus vaccine, inactivated'),
    ('20', 'DTaP vaccine'),
    ('21', 'Varicella vaccine'),
    ('33', 'Pneumococcal polysaccharide vaccine'),
    ('52', 'Hepatitis A vaccine, adult'),
    ('88', 'Influenza virus vaccine'),
    ('94', 'MMRV vaccine'),
    ('113', 'Td vaccine'),
    ('115', 'Tdap vaccine'),
    ('116', 'Rotavirus vaccine, pentavalent'),
    ('133', 'PCV13 vaccine'),
    ('140', 'Influenza vaccine, high-dose'),
    ('141', 'Influenza vaccine, injectable'),
    ('150', 'Influenza vaccine, intranasal'),
    ('187', 'Zoster vaccine, recombinant'),
    ('207', 'COVID-19 vaccine, mRNA'),
    ('208', 'COVID-19 vaccine, mRNA'),
    ('212', 'COVID-19 vaccine, vector'),
    ('218', 'COVID-19 vaccine, bivalent'),
]

# SNOMED CT allergy codes
ALLERGIES_SNOMED = [
    ('91936005', 'Penicillin allergy'),
    ('293586001', 'Sulfonamide allergy'),
    ('294505008', 'Aspirin allergy'),
    ('417532002', 'Ibuprofen allergy'),
    ('419511003', 'Peanut allergy'),
    ('91935009', 'Shellfish allergy'),
    ('418689008', 'Latex allergy'),
    ('232347008', 'Egg allergy'),
    ('425525006', 'Milk allergy'),
    ('418634005', 'Soy allergy'),
    ('409137002', 'Tree nut allergy'),
    ('294915005', 'Codeine allergy'),
    ('91934008', 'Bee venom allergy'),
    ('300916003', 'Dust mite allergy'),
    ('418290006', 'Wheat allergy'),
]

# SNOMED CT procedure codes
PROCEDURES_SNOMED = [
    ('430193006', 'Medication reconciliation'),
    ('103693007', 'Diagnostic procedure'),
    ('165829005', 'Physical examination'),
    ('409073007', 'Education'),
    ('182813001', 'Referral to service'),
    ('71388002', 'Procedure on blood'),
    ('27658006', 'Amoxicillin therapy'),
    ('281789004', 'Electrocardiogram'),
    ('77477000', 'Computed tomography'),
    ('16310003', 'Ultrasonography'),
    ('312681000', 'Bone density scan'),
    ('241615005', 'Magnetic resonance imaging'),
    ('386053000', 'Evaluation procedure'),
    ('410410001', 'Assessment procedure'),
    ('33879002', 'Administration of vaccine'),
]

# Names data
FIRST_NAMES_MALE = ['James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Christopher', 'Charles', 'Daniel', 'Matthew', 'Anthony', 'Mark', 'Donald', 'Steven', 'Paul', 'Andrew', 'Joshua', 'Kenneth', 'Kevin', 'Brian', 'George', 'Timothy', 'Ronald', 'Edward', 'Jason', 'Jeffrey', 'Ryan']
FIRST_NAMES_FEMALE = ['Mary', 'Patricia', 'Jennifer', 'Linda', 'Barbara', 'Elizabeth', 'Susan', 'Jessica', 'Sarah', 'Karen', 'Lisa', 'Nancy', 'Betty', 'Margaret', 'Sandra', 'Ashley', 'Kimberly', 'Emily', 'Donna', 'Michelle', 'Dorothy', 'Carol', 'Amanda', 'Melissa', 'Deborah', 'Stephanie', 'Rebecca', 'Sharon', 'Laura', 'Cynthia']
LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson']

CITIES = [
    ('Boston', 'MA', '02101'),
    ('Cambridge', 'MA', '02139'),
    ('Worcester', 'MA', '01601'),
    ('Springfield', 'MA', '01101'),
    ('New York', 'NY', '10001'),
    ('Los Angeles', 'CA', '90001'),
    ('Chicago', 'IL', '60601'),
    ('Houston', 'TX', '77001'),
    ('Phoenix', 'AZ', '85001'),
    ('Philadelphia', 'PA', '19101'),
    ('San Antonio', 'TX', '78201'),
    ('San Diego', 'CA', '92101'),
    ('Dallas', 'TX', '75201'),
    ('San Jose', 'CA', '95101'),
    ('Austin', 'TX', '73301'),
]

STREETS = ['Main St', 'Oak Ave', 'Maple Dr', 'Cedar Ln', 'Pine Rd', 'Elm St', 'Washington Ave', 'Park Pl', 'Lake Dr', 'Hill Rd', 'River Rd', 'Forest Ave', 'Spring St', 'Valley Rd', 'Church St']

SPECIALTIES = [
    ('207Q00000X', 'Family Medicine'),
    ('207R00000X', 'Internal Medicine'),
    ('207RC0000X', 'Cardiovascular Disease'),
    ('207RE0101X', 'Endocrinology'),
    ('207RG0100X', 'Gastroenterology'),
    ('207RH0000X', 'Hematology'),
    ('207RI0200X', 'Infectious Disease'),
    ('207RN0300X', 'Nephrology'),
    ('207RP1001X', 'Pulmonary Disease'),
    ('207RR0500X', 'Rheumatology'),
    ('2084N0400X', 'Neurology'),
    ('2084P0800X', 'Psychiatry'),
    ('207V00000X', 'Obstetrics & Gynecology'),
    ('2086S0120X', 'Pediatrics'),
    ('207X00000X', 'Orthopaedic Surgery'),
]


class Command(BaseCommand):
    help = 'Generate synthetic FHIR R4 healthcare data'

    def add_arguments(self, parser):
        parser.add_argument('--patients', type=int, default=100, help='Number of patients to generate')
        parser.add_argument('--practitioners', type=int, default=20, help='Number of practitioners')
        parser.add_argument('--organizations', type=int, default=5, help='Number of organizations')
        parser.add_argument('--clear', action='store_true', help='Clear existing FHIR data first')

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write('Clearing existing FHIR data...')
            self.clear_data()

        self.stdout.write('Generating FHIR R4 synthetic data...')

        # Generate organizations
        organizations = self.generate_organizations(options['organizations'])
        self.stdout.write(f'  Created {len(organizations)} organizations')

        # Generate practitioners
        practitioners = self.generate_practitioners(options['practitioners'], organizations)
        self.stdout.write(f'  Created {len(practitioners)} practitioners')

        # Generate patients
        patients = self.generate_patients(options['patients'], practitioners, organizations)
        self.stdout.write(f'  Created {len(patients)} patients')

        # Generate clinical data for each patient
        total_encounters = 0
        total_conditions = 0
        total_observations = 0
        total_medications = 0
        total_allergies = 0
        total_procedures = 0
        total_immunizations = 0

        for patient in patients:
            encounters = self.generate_encounters(patient, practitioners, organizations)
            total_encounters += len(encounters)

            conditions = self.generate_conditions(patient, encounters, practitioners)
            total_conditions += len(conditions)

            observations = self.generate_observations(patient, encounters, practitioners)
            total_observations += len(observations)

            medications = self.generate_medications(patient, encounters, practitioners, conditions)
            total_medications += len(medications)

            allergies = self.generate_allergies(patient, encounters, practitioners)
            total_allergies += len(allergies)

            procedures = self.generate_procedures(patient, encounters, practitioners)
            total_procedures += len(procedures)

            immunizations = self.generate_immunizations(patient, encounters, practitioners, organizations)
            total_immunizations += len(immunizations)

        self.stdout.write(f'  Created {total_encounters} encounters')
        self.stdout.write(f'  Created {total_conditions} conditions')
        self.stdout.write(f'  Created {total_observations} observations')
        self.stdout.write(f'  Created {total_medications} medication requests')
        self.stdout.write(f'  Created {total_allergies} allergies')
        self.stdout.write(f'  Created {total_procedures} procedures')
        self.stdout.write(f'  Created {total_immunizations} immunizations')

        self.stdout.write(self.style.SUCCESS('Successfully generated FHIR data!'))

    def clear_data(self):
        """Clear all FHIR data"""
        CarePlan.objects.all().delete()
        DiagnosticReport.objects.all().delete()
        Immunization.objects.all().delete()
        Procedure.objects.all().delete()
        AllergyIntolerance.objects.all().delete()
        MedicationRequest.objects.all().delete()
        Observation.objects.all().delete()
        Condition.objects.all().delete()
        Encounter.objects.all().delete()
        Patient.objects.all().delete()
        Practitioner.objects.all().delete()
        Organization.objects.all().delete()

    def generate_organizations(self, count):
        """Generate healthcare organizations"""
        org_types = [
            ('prov', 'Healthcare Provider'),
            ('dept', 'Hospital Department'),
            ('team', 'Care Team'),
        ]
        org_names = [
            'General Hospital', 'Medical Center', 'Community Health Center',
            'Family Practice', 'Specialty Clinic', 'Urgent Care Center',
            'Regional Medical Center', 'University Hospital', 'Health System',
            'Wellness Center'
        ]

        organizations = []
        for i in range(count):
            city, state, zip_code = random.choice(CITIES)
            org_type = random.choice(org_types)
            org = Organization.objects.create(
                resource_type='Organization',
                identifier=f'ORG-{uuid.uuid4().hex[:8].upper()}',
                name=f'{city} {random.choice(org_names)}',
                type_code=org_type[0],
                type_display=org_type[1],
                telecom_phone=f'+1-{random.randint(200,999)}-{random.randint(200,999)}-{random.randint(1000,9999)}',
                telecom_email=f'info@{city.lower().replace(" ", "")}health.org',
                address_line=f'{random.randint(100,9999)} {random.choice(STREETS)}',
                address_city=city,
                address_state=state,
                address_postal_code=zip_code,
            )
            organizations.append(org)
        return organizations

    def generate_practitioners(self, count, organizations):
        """Generate healthcare practitioners"""
        practitioners = []
        for i in range(count):
            gender = random.choice(['male', 'female'])
            first_name = random.choice(FIRST_NAMES_MALE if gender == 'male' else FIRST_NAMES_FEMALE)
            last_name = random.choice(LAST_NAMES)
            specialty = random.choice(SPECIALTIES)

            practitioner = Practitioner.objects.create(
                resource_type='Practitioner',
                identifier_npi=f'{random.randint(1000000000, 9999999999)}',
                name_prefix='Dr.',
                name_given=first_name,
                name_family=last_name,
                name_suffix=random.choice(['MD', 'DO', 'MD, PhD', '']) or None,
                gender=gender,
                birth_date=self.random_date(1950, 1990),
                qualification_code='MD',
                qualification_display='Doctor of Medicine',
                specialty_code=specialty[0],
                specialty_display=specialty[1],
                organization=random.choice(organizations) if organizations else None,
                telecom_email=f'{first_name.lower()}.{last_name.lower()}@healthcare.org',
            )
            practitioners.append(practitioner)
        return practitioners

    def generate_patients(self, count, practitioners, organizations):
        """Generate patients"""
        patients = []
        races = [
            ('2106-3', 'White'),
            ('2054-5', 'Black or African American'),
            ('2028-9', 'Asian'),
            ('1002-5', 'American Indian or Alaska Native'),
            ('2076-8', 'Native Hawaiian or Other Pacific Islander'),
            ('2131-1', 'Other Race'),
        ]
        ethnicities = [
            ('2135-2', 'Hispanic or Latino'),
            ('2186-5', 'Not Hispanic or Latino'),
        ]

        for i in range(count):
            gender = random.choice(['male', 'female'])
            first_name = random.choice(FIRST_NAMES_MALE if gender == 'male' else FIRST_NAMES_FEMALE)
            last_name = random.choice(LAST_NAMES)
            birth_date = self.random_date(1940, 2020)
            city, state, zip_code = random.choice(CITIES)
            race = random.choice(races)
            ethnicity = random.choice(ethnicities)

            # 5% deceased
            deceased = random.random() < 0.05
            deceased_date = None
            if deceased:
                deceased_date = self.random_datetime_after(birth_date)

            patient = Patient.objects.create(
                resource_type='Patient',
                identifier_mrn=f'MRN-{uuid.uuid4().hex[:10].upper()}',
                identifier_ssn=f'{random.randint(100,999)}-{random.randint(10,99)}-{random.randint(1000,9999)}',
                name_given=first_name,
                name_family=last_name,
                name_prefix=random.choice(['Mr.', 'Ms.', 'Mrs.', '']) or None,
                gender=gender,
                birth_date=birth_date,
                deceased_boolean=deceased,
                deceased_date_time=deceased_date,
                address_line=f'{random.randint(100,9999)} {random.choice(STREETS)}',
                address_city=city,
                address_state=state,
                address_postal_code=zip_code,
                address_district=f'{city} County',
                telecom_phone_home=f'+1-{random.randint(200,999)}-{random.randint(200,999)}-{random.randint(1000,9999)}',
                telecom_phone_mobile=f'+1-{random.randint(200,999)}-{random.randint(200,999)}-{random.randint(1000,9999)}',
                telecom_email=f'{first_name.lower()}.{last_name.lower()}{random.randint(1,99)}@email.com',
                marital_status_code=random.choice(['S', 'M', 'D', 'W', 'UNK']),
                extension_race_code=race[0],
                extension_race_display=race[1],
                extension_ethnicity_code=ethnicity[0],
                extension_ethnicity_display=ethnicity[1],
                extension_birth_sex='M' if gender == 'male' else 'F',
                general_practitioner=random.choice(practitioners) if practitioners else None,
                managing_organization=random.choice(organizations) if organizations else None,
            )
            patients.append(patient)
        return patients

    def generate_encounters(self, patient, practitioners, organizations):
        """Generate encounters for a patient"""
        encounters = []
        num_encounters = random.randint(2, 15)

        encounter_classes = [
            ('AMB', 'Ambulatory'),
            ('EMER', 'Emergency'),
            ('IMP', 'Inpatient'),
            ('VR', 'Virtual'),
        ]

        for i in range(num_encounters):
            enc_class = random.choice(encounter_classes)
            start = self.random_datetime(patient.birth_date.year + 1, 2024)
            duration_hours = random.randint(1, 72) if enc_class[0] == 'IMP' else random.randint(1, 4)
            end = start + timedelta(hours=duration_hours)

            encounter = Encounter.objects.create(
                resource_type='Encounter',
                identifier=f'ENC-{uuid.uuid4().hex[:12].upper()}',
                status='finished',
                class_code=enc_class[0],
                class_display=enc_class[1],
                type_code='185349003',
                type_display='Encounter for check up',
                subject=patient,
                participant_practitioner=random.choice(practitioners) if practitioners else None,
                service_provider=random.choice(organizations) if organizations else None,
                period_start=start,
                period_end=end,
                reason_code=random.choice(ICD10_CONDITIONS)[0],
                reason_display=random.choice(ICD10_CONDITIONS)[1],
            )
            encounters.append(encounter)
        return encounters

    def generate_conditions(self, patient, encounters, practitioners):
        """Generate conditions for a patient"""
        conditions = []
        num_conditions = random.randint(1, 8)
        selected_conditions = random.sample(ICD10_CONDITIONS, min(num_conditions, len(ICD10_CONDITIONS)))

        for code, display in selected_conditions:
            encounter = random.choice(encounters) if encounters else None
            onset = encounter.period_start if encounter else self.random_datetime(patient.birth_date.year + 10, 2024)

            # 30% resolved
            resolved = random.random() < 0.3
            abatement = None
            clinical_status = 'active'
            if resolved:
                clinical_status = 'resolved'
                abatement = onset + timedelta(days=random.randint(7, 365))

            condition = Condition.objects.create(
                resource_type='Condition',
                identifier=f'COND-{uuid.uuid4().hex[:12].upper()}',
                clinical_status_code=clinical_status,
                verification_status_code='confirmed',
                category_code='encounter-diagnosis',
                code_system='http://hl7.org/fhir/sid/icd-10-cm',
                code_code=code,
                code_display=display,
                subject=patient,
                encounter=encounter,
                onset_date_time=onset,
                abatement_date_time=abatement,
                recorder=random.choice(practitioners) if practitioners else None,
            )
            conditions.append(condition)
        return conditions

    def generate_observations(self, patient, encounters, practitioners):
        """Generate vital signs and lab observations"""
        observations = []

        for encounter in encounters:
            # Vital signs for each encounter
            for code, display, unit, low, high in random.sample(VITAL_SIGNS_LOINC, random.randint(3, 6)):
                value = round(random.uniform(low, high), 1)
                observation = Observation.objects.create(
                    resource_type='Observation',
                    identifier=f'OBS-{uuid.uuid4().hex[:12].upper()}',
                    status='final',
                    category_code='vital-signs',
                    category_display='Vital Signs',
                    code_system='http://loinc.org',
                    code_code=code,
                    code_display=display,
                    subject=patient,
                    encounter=encounter,
                    effective_date_time=encounter.period_start,
                    performer=random.choice(practitioners) if practitioners else None,
                    value_quantity_value=Decimal(str(value)),
                    value_quantity_unit=unit,
                    value_quantity_code=unit,
                )
                observations.append(observation)

            # Lab tests for some encounters (50% chance)
            if random.random() < 0.5:
                for code, display, unit, low, high in random.sample(LAB_TESTS_LOINC, random.randint(3, 8)):
                    value = round(random.uniform(low * 0.8, high * 1.2), 2)
                    # Determine interpretation
                    interpretation_code = 'N'
                    interpretation_display = 'Normal'
                    if value < low:
                        interpretation_code = 'L'
                        interpretation_display = 'Low'
                    elif value > high:
                        interpretation_code = 'H'
                        interpretation_display = 'High'

                    observation = Observation.objects.create(
                        resource_type='Observation',
                        identifier=f'OBS-{uuid.uuid4().hex[:12].upper()}',
                        status='final',
                        category_code='laboratory',
                        category_display='Laboratory',
                        code_system='http://loinc.org',
                        code_code=code,
                        code_display=display,
                        subject=patient,
                        encounter=encounter,
                        effective_date_time=encounter.period_start,
                        performer=random.choice(practitioners) if practitioners else None,
                        value_quantity_value=Decimal(str(value)),
                        value_quantity_unit=unit,
                        value_quantity_code=unit,
                        interpretation_code=interpretation_code,
                        interpretation_display=interpretation_display,
                        reference_range_low_value=Decimal(str(low)),
                        reference_range_high_value=Decimal(str(high)),
                        reference_range_unit=unit,
                    )
                    observations.append(observation)

        return observations

    def generate_medications(self, patient, encounters, practitioners, conditions):
        """Generate medication requests"""
        medications = []
        num_meds = random.randint(0, 6)
        selected_meds = random.sample(MEDICATIONS_RXNORM, min(num_meds, len(MEDICATIONS_RXNORM)))

        for code, display, dose, route, freq, period in selected_meds:
            encounter = random.choice(encounters) if encounters else None
            condition = random.choice(conditions) if conditions else None

            # 80% active, 20% completed
            status = 'active' if random.random() < 0.8 else 'completed'

            medication = MedicationRequest.objects.create(
                resource_type='MedicationRequest',
                identifier=f'MEDRX-{uuid.uuid4().hex[:12].upper()}',
                status=status,
                intent='order',
                medication_codeable_concept_code=code,
                medication_codeable_concept_display=display,
                subject=patient,
                encounter=encounter,
                requester=random.choice(practitioners) if practitioners else None,
                authored_on=encounter.period_start if encounter else timezone.now(),
                reason_code=condition.code_code if condition else None,
                reason_display=condition.code_display if condition else None,
                dosage_text=f'Take {dose} by mouth {freq} time(s) per {period}',
                dosage_dose_value=Decimal(dose.split()[0]),
                dosage_dose_unit=dose.split()[1] if len(dose.split()) > 1 else 'mg',
                dosage_route_code='26643006',
                dosage_route_display='Oral',
                dosage_timing_frequency=freq,
                dosage_timing_period=1,
                dosage_timing_period_unit=period,
                dispense_number_of_repeats=random.randint(0, 5),
                dispense_expected_supply_days=30,
            )
            medications.append(medication)
        return medications

    def generate_allergies(self, patient, encounters, practitioners):
        """Generate allergies"""
        allergies = []
        num_allergies = random.choices([0, 1, 2, 3], weights=[40, 35, 20, 5])[0]
        selected_allergies = random.sample(ALLERGIES_SNOMED, min(num_allergies, len(ALLERGIES_SNOMED)))

        for code, display in selected_allergies:
            encounter = random.choice(encounters) if encounters else None
            category = 'medication' if 'allergy' in display.lower() and any(med in display.lower() for med in ['penicillin', 'sulfonamide', 'aspirin', 'ibuprofen', 'codeine']) else 'food' if any(food in display.lower() for food in ['peanut', 'shellfish', 'egg', 'milk', 'soy', 'nut', 'wheat']) else 'environment'

            allergy = AllergyIntolerance.objects.create(
                resource_type='AllergyIntolerance',
                identifier=f'ALLERGY-{uuid.uuid4().hex[:12].upper()}',
                clinical_status_code='active',
                verification_status_code='confirmed',
                type='allergy',
                category=category,
                criticality=random.choice(['low', 'high']),
                code_system='http://snomed.info/sct',
                code_code=code,
                code_display=display,
                patient=patient,
                encounter=encounter,
                recorded_date=encounter.period_start if encounter else timezone.now(),
                recorder=random.choice(practitioners) if practitioners else None,
                reaction_severity=random.choice(['mild', 'moderate', 'severe']),
            )
            allergies.append(allergy)
        return allergies

    def generate_procedures(self, patient, encounters, practitioners):
        """Generate procedures"""
        procedures = []
        num_procedures = random.randint(1, 5)
        selected_procedures = random.sample(PROCEDURES_SNOMED, min(num_procedures, len(PROCEDURES_SNOMED)))

        for code, display in selected_procedures:
            encounter = random.choice(encounters) if encounters else None

            procedure = Procedure.objects.create(
                resource_type='Procedure',
                identifier=f'PROC-{uuid.uuid4().hex[:12].upper()}',
                status='completed',
                code_system='http://snomed.info/sct',
                code_code=code,
                code_display=display,
                subject=patient,
                encounter=encounter,
                performed_date_time=encounter.period_start if encounter else timezone.now(),
                performer=random.choice(practitioners) if practitioners else None,
            )
            procedures.append(procedure)
        return procedures

    def generate_immunizations(self, patient, encounters, practitioners, organizations):
        """Generate immunizations"""
        immunizations = []
        num_immunizations = random.randint(3, 10)
        selected_vaccines = random.sample(VACCINES_CVX, min(num_immunizations, len(VACCINES_CVX)))

        for code, display in selected_vaccines:
            encounter = random.choice(encounters) if encounters else None

            immunization = Immunization.objects.create(
                resource_type='Immunization',
                identifier=f'IMM-{uuid.uuid4().hex[:12].upper()}',
                status='completed',
                vaccine_code_code=code,
                vaccine_code_display=display,
                patient=patient,
                encounter=encounter,
                occurrence_date_time=encounter.period_start if encounter else self.random_datetime(patient.birth_date.year, 2024),
                performer=random.choice(practitioners) if practitioners else None,
                performer_organization=random.choice(organizations) if organizations else None,
                primary_source=True,
                lot_number=f'LOT{random.randint(10000, 99999)}',
            )
            immunizations.append(immunization)
        return immunizations

    def random_date(self, start_year, end_year):
        """Generate random date"""
        start = datetime(start_year, 1, 1)
        end = datetime(end_year, 12, 31)
        delta = end - start
        random_days = random.randint(0, delta.days)
        return (start + timedelta(days=random_days)).date()

    def random_datetime(self, start_year, end_year):
        """Generate random datetime"""
        date = self.random_date(start_year, end_year)
        return timezone.make_aware(datetime.combine(date, datetime.min.time()) + timedelta(hours=random.randint(8, 18)))

    def random_datetime_after(self, date):
        """Generate random datetime after a given date"""
        start = datetime.combine(date, datetime.min.time()) if isinstance(date, type(date)) else date
        end = datetime.now()
        if start >= end:
            return timezone.make_aware(end)
        delta = end - start
        random_days = random.randint(0, delta.days)
        return timezone.make_aware(start + timedelta(days=random_days))
