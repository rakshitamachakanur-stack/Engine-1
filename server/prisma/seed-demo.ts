import 'dotenv/config';
import {
  AmbulanceStatus,
  Prisma,
  PrismaClient,
  RequestStatus,
  Severity,
  UserRole,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import { haversineKm } from '../src/utils/geo';

const prisma = new PrismaClient();
const MINUTE = 60_000;
const ago = (minutes: number): Date => new Date(Date.now() - minutes * MINUTE);

const DISPATCHER_PASSWORD = 'GoldenHour@123';
const HOSPITAL_PASSWORD = 'Hospital@123';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

interface HospitalSeed {
  hospitalId: string;
  name: string;
  lat: number;
  lon: number;
  totalBeds: number;
  freeBeds: number;
  blood: Record<string, number>;
  medicines: Record<string, number>;
}

// free_beds already accounts for the open assignments seeded below.
const HOSPITALS: HospitalSeed[] = [
  {
    hospitalId: 'HOSP-01',
    name: 'KIMS Hospital',
    lat: 15.3663,
    lon: 75.1238,
    totalBeds: 220,
    freeBeds: 35,
    blood: { 'O+': 24, 'O-': 4, 'A+': 18, 'A-': 3, 'B+': 12, 'B-': 2, 'AB+': 5, 'AB-': 1 },
    medicines: {
      Adrenaline: 25,
      Atropine: 42,
      Insulin: 18,
      'Tetanus Toxoid': 30,
      Oxytocin: 12,
      Hydrocortisone: 9,
    },
  },
  {
    hospitalId: 'HOSP-02',
    name: 'SDM Medical College Hospital',
    lat: 15.3345,
    lon: 75.118,
    totalBeds: 180,
    freeBeds: 21,
    blood: { 'O+': 14, 'O-': 2, 'A+': 9, 'A-': 2, 'B+': 11, 'B-': 1, 'AB+': 2, 'AB-': 0 },
    medicines: {
      Adrenaline: 22,
      Atropine: 16,
      Insulin: 30,
      'Tetanus Toxoid': 12,
      Oxytocin: 18,
      Hydrocortisone: 14,
    },
  },
  {
    hospitalId: 'HOSP-03',
    name: 'Vivekananda General Hospital',
    lat: 15.3739,
    lon: 75.1039,
    totalBeds: 120,
    freeBeds: 8,
    blood: { 'O+': 6, 'O-': 1, 'A+': 8, 'A-': 1, 'B+': 4, 'B-': 0, 'AB+': 2, 'AB-': 0 },
    medicines: {
      Adrenaline: 9,
      Atropine: 14,
      Insulin: 6,
      'Tetanus Toxoid': 18,
      Oxytocin: 4,
      Hydrocortisone: 11,
    },
  },
  {
    hospitalId: 'HOSP-04',
    name: 'Lifecare Multispeciality',
    lat: 15.3608,
    lon: 75.128,
    totalBeds: 90,
    freeBeds: 0,
    blood: { 'O+': 10, 'O-': 2, 'A+': 6, 'A-': 2, 'B+': 5, 'B-': 1, 'AB+': 1, 'AB-': 1 },
    medicines: {
      Adrenaline: 18,
      Atropine: 20,
      Insulin: 14,
      'Tetanus Toxoid': 10,
      Oxytocin: 8,
      Hydrocortisone: 6,
    },
  },
  {
    hospitalId: 'HOSP-05',
    name: 'City Central Hospital',
    lat: 15.352,
    lon: 75.138,
    totalBeds: 140,
    freeBeds: 27,
    blood: { 'O+': 19, 'O-': 3, 'A+': 11, 'A-': 2, 'B+': 9, 'B-': 2, 'AB+': 4, 'AB-': 1 },
    medicines: {
      Adrenaline: 26,
      Atropine: 31,
      Insulin: 21,
      'Tetanus Toxoid': 24,
      Oxytocin: 15,
      Hydrocortisone: 13,
    },
  },
];

const AMBULANCES: {
  ambulanceId: string;
  regNo: string;
  lat: number;
  lon: number;
  status: AmbulanceStatus;
}[] = [
  { ambulanceId: 'AMB-01', regNo: 'KA-25-AB-4821', lat: 15.3652, lon: 75.1248, status: 'BUSY' },
  { ambulanceId: 'AMB-02', regNo: 'KA-25-AB-6193', lat: 15.3712, lon: 75.1074, status: 'BUSY' },
  { ambulanceId: 'AMB-03', regNo: 'KA-25-AC-3345', lat: 15.3548, lon: 75.1276, status: 'BUSY' },
  { ambulanceId: 'AMB-04', regNo: 'KA-25-AC-7710', lat: 15.3381, lon: 75.1163, status: 'AVAILABLE' },
  { ambulanceId: 'AMB-05', regNo: 'KA-25-AD-1182', lat: 15.3604, lon: 75.0881, status: 'AVAILABLE' },
  { ambulanceId: 'AMB-06', regNo: 'KA-25-AD-9048', lat: 15.3711, lon: 75.1322, status: 'BUSY' },
  { ambulanceId: 'AMB-07', regNo: 'KA-25-AE-5560', lat: 15.3862, lon: 75.0914, status: 'AVAILABLE' },
  { ambulanceId: 'AMB-08', regNo: 'KA-25-AE-2207', lat: 15.4001, lon: 75.1135, status: 'OFFLINE' },
  { ambulanceId: 'AMB-09', regNo: 'KA-25-AF-8834', lat: 15.3781, lon: 75.1172, status: 'AVAILABLE' },
  { ambulanceId: 'AMB-10', regNo: 'KA-25-AF-6619', lat: 15.3631, lon: 75.1211, status: 'AVAILABLE' },
];

interface RequestSeed {
  requestId: string;
  patientId: string;
  patientName: string;
  age: number;
  contact: string;
  severity: Severity;
  minutesAgo: number;
  lat: number;
  lon: number;
  bloodGroupNeeded: string | null;
  medicineNeeded: string | null;
  assignment?: {
    assignmentId: string;
    ambulanceId: string;
    hospitalId: string;
    readinessScore: number;
    partialFlag: boolean;
    assignedMinutesAgo: number;
    closedMinutesAgo: number | null;
  };
}

const REQUESTS: RequestSeed[] = [
  {
    requestId: 'REQ-2026-0001',
    patientId: 'PAT-0001',
    patientName: 'Ramesh Naik',
    age: 54,
    contact: '9845012345',
    severity: 'CRITICAL',
    minutesAgo: 14,
    lat: 15.3739,
    lon: 75.1039,
    bloodGroupNeeded: 'O+',
    medicineNeeded: null,
  },
  {
    requestId: 'REQ-2026-0002',
    patientId: 'PAT-0002',
    patientName: 'Shobha Kulkarni',
    age: 67,
    contact: '9886043210',
    severity: 'CRITICAL',
    minutesAgo: 26,
    lat: 15.3647,
    lon: 75.124,
    bloodGroupNeeded: null,
    medicineNeeded: 'Adrenaline',
    assignment: {
      assignmentId: 'ASG-1001',
      ambulanceId: 'AMB-03',
      hospitalId: 'HOSP-01',
      readinessScore: 100,
      partialFlag: false,
      assignedMinutesAgo: 22,
      closedMinutesAgo: null,
    },
  },
  {
    requestId: 'REQ-2026-0003',
    patientId: 'PAT-0003',
    patientName: 'Imran Sheikh',
    age: 32,
    contact: '9741239876',
    severity: 'HIGH',
    minutesAgo: 32,
    lat: 15.361,
    lon: 75.085,
    bloodGroupNeeded: 'B+',
    medicineNeeded: null,
  },
  {
    requestId: 'REQ-2026-0004',
    patientId: 'PAT-0004',
    patientName: 'Lakshmi Hegde',
    age: 71,
    contact: '9900123456',
    severity: 'HIGH',
    minutesAgo: 41,
    lat: 15.3539,
    lon: 75.129,
    bloodGroupNeeded: null,
    medicineNeeded: 'Insulin',
    assignment: {
      assignmentId: 'ASG-1002',
      ambulanceId: 'AMB-06',
      hospitalId: 'HOSP-03',
      readinessScore: 78,
      partialFlag: true,
      assignedMinutesAgo: 36,
      closedMinutesAgo: null,
    },
  },
  {
    requestId: 'REQ-2026-0005',
    patientId: 'PAT-0005',
    patientName: 'Basavaraj Patil',
    age: 45,
    contact: '9611234567',
    severity: 'MEDIUM',
    minutesAgo: 48,
    lat: 15.37,
    lon: 75.133,
    bloodGroupNeeded: null,
    medicineNeeded: null,
  },
  {
    requestId: 'REQ-2026-0006',
    patientId: 'PAT-0006',
    patientName: 'Anjali Desai',
    age: 28,
    contact: '9535012398',
    severity: 'CRITICAL',
    minutesAgo: 55,
    lat: 15.3345,
    lon: 75.118,
    bloodGroupNeeded: 'AB+',
    medicineNeeded: null,
    assignment: {
      assignmentId: 'ASG-1003',
      ambulanceId: 'AMB-01',
      hospitalId: 'HOSP-01',
      readinessScore: 100,
      partialFlag: false,
      assignedMinutesAgo: 50,
      closedMinutesAgo: null,
    },
  },
  {
    requestId: 'REQ-2026-0007',
    patientId: 'PAT-0007',
    patientName: 'Vinod Kamble',
    age: 39,
    contact: '9448123456',
    severity: 'HIGH',
    minutesAgo: 63,
    lat: 15.384,
    lon: 75.09,
    bloodGroupNeeded: null,
    medicineNeeded: 'Tetanus Toxoid',
  },
  {
    requestId: 'REQ-2026-0008',
    patientId: 'PAT-0008',
    patientName: 'Meera Joshi',
    age: 58,
    contact: '9880712345',
    severity: 'MEDIUM',
    minutesAgo: 77,
    lat: 15.402,
    lon: 75.112,
    bloodGroupNeeded: 'A+',
    medicineNeeded: null,
    assignment: {
      assignmentId: 'ASG-1004',
      ambulanceId: 'AMB-02',
      hospitalId: 'HOSP-01',
      readinessScore: 92,
      partialFlag: false,
      assignedMinutesAgo: 72,
      closedMinutesAgo: null,
    },
  },
  {
    requestId: 'REQ-2026-0009',
    patientId: 'PAT-0009',
    patientName: 'Suresh Badiger',
    age: 23,
    contact: '9742345678',
    severity: 'LOW',
    minutesAgo: 92,
    lat: 15.377,
    lon: 75.118,
    bloodGroupNeeded: null,
    medicineNeeded: null,
  },
  {
    requestId: 'REQ-2026-0010',
    patientId: 'PAT-0010',
    patientName: 'Fatima Khan',
    age: 61,
    contact: '9686123450',
    severity: 'LOW',
    minutesAgo: 104,
    lat: 15.3694,
    lon: 75.1318,
    bloodGroupNeeded: null,
    medicineNeeded: 'Hydrocortisone',
  },
  {
    requestId: 'REQ-2026-0011',
    patientId: 'PAT-0011',
    patientName: 'Ganesh Shettar',
    age: 48,
    contact: '9900345678',
    severity: 'HIGH',
    minutesAgo: 165,
    lat: 15.3712,
    lon: 75.1074,
    bloodGroupNeeded: null,
    medicineNeeded: 'Atropine',
    assignment: {
      assignmentId: 'ASG-1005',
      ambulanceId: 'AMB-04',
      hospitalId: 'HOSP-05',
      readinessScore: 86,
      partialFlag: false,
      assignedMinutesAgo: 160,
      closedMinutesAgo: 118,
    },
  },
  {
    requestId: 'REQ-2026-0012',
    patientId: 'PAT-0012',
    patientName: 'Nagaraj Hullur',
    age: 36,
    contact: '9845671234',
    severity: 'MEDIUM',
    minutesAgo: 205,
    lat: 15.3647,
    lon: 75.124,
    bloodGroupNeeded: 'B-',
    medicineNeeded: null,
    assignment: {
      assignmentId: 'ASG-1006',
      ambulanceId: 'AMB-09',
      hospitalId: 'HOSP-02',
      readinessScore: 80,
      partialFlag: true,
      assignedMinutesAgo: 200,
      closedMinutesAgo: 150,
    },
  },
];

const USERS: { userId: string; username: string; role: UserRole; hospitalId: string | null }[] = [
  { userId: 'USR-001', username: 'dispatch.ops', role: 'DISPATCHER', hospitalId: null },
  { userId: 'USR-002', username: 'dispatch.night', role: 'DISPATCHER', hospitalId: null },
  { userId: 'USR-003', username: 'kims.staff', role: 'HOSPITAL', hospitalId: 'HOSP-01' },
  { userId: 'USR-004', username: 'sdm.staff', role: 'HOSPITAL', hospitalId: 'HOSP-02' },
  { userId: 'USR-005', username: 'vgh.staff', role: 'HOSPITAL', hospitalId: 'HOSP-03' },
  { userId: 'USR-006', username: 'lifecare.staff', role: 'HOSPITAL', hospitalId: 'HOSP-04' },
  { userId: 'USR-007', username: 'city.staff', role: 'HOSPITAL', hospitalId: 'HOSP-05' },
];

function buildReason(request: RequestSeed, hospitalName: string, ambulanceRegNo: string, distanceKm: number): string {
  const hospital = HOSPITALS.find((item) => item.name === hospitalName);
  const blood = request.bloodGroupNeeded
    ? `${request.bloodGroupNeeded} blood in stock (${hospital?.blood[request.bloodGroupNeeded] ?? 0} units)`
    : 'no blood group required';
  const medicine = request.medicineNeeded
    ? `${request.medicineNeeded} in stock (${hospital?.medicines[request.medicineNeeded] ?? 0} units)`
    : 'no medicine required';
  return `${request.severity} (weight ${request.severity === 'CRITICAL' ? 4 : request.severity === 'HIGH' ? 3 : request.severity === 'MEDIUM' ? 2 : 1}) - nearest available ambulance ${ambulanceRegNo}, ${distanceKm} km away. ${hospitalName} scored with a free bed, ${blood}, ${medicine}.`;
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed demo data into a production database.');
  }

  console.log('[seed] clearing existing rows');
  await prisma.$transaction([
    prisma.assignment.deleteMany(),
    prisma.emergencyRequest.deleteMany(),
    prisma.patient.deleteMany(),
    prisma.ambulance.deleteMany(),
    prisma.medicineStock.deleteMany(),
    prisma.bloodStock.deleteMany(),
    prisma.user.deleteMany(),
    prisma.hospital.deleteMany(),
  ]);

  console.log('[seed] hospitals, blood stock and medicine stock');
  for (const hospital of HOSPITALS) {
    await prisma.hospital.create({
      data: {
        hospitalId: hospital.hospitalId,
        name: hospital.name,
        lat: hospital.lat,
        lon: hospital.lon,
        totalBeds: hospital.totalBeds,
        freeBeds: hospital.freeBeds,
        bloodStock: {
          create: BLOOD_GROUPS.map((group) => ({
            bloodGroup: group,
            units: hospital.blood[group] ?? 0,
          })),
        },
        medicineStock: {
          create: Object.entries(hospital.medicines).map(([medicine, units]) => ({
            medicine,
            units,
          })),
        },
      },
    });
  }

  console.log('[seed] ambulances');
  await prisma.ambulance.createMany({ data: AMBULANCES });

  console.log('[seed] users (passwords hashed with bcrypt)');
  const [dispatcherHash, hospitalHash] = await Promise.all([
    bcrypt.hash(DISPATCHER_PASSWORD, 10),
    bcrypt.hash(HOSPITAL_PASSWORD, 10),
  ]);
  await prisma.user.createMany({
    data: USERS.map((user) => ({
      userId: user.userId,
      username: user.username,
      passwordHash: user.role === 'DISPATCHER' ? dispatcherHash : hospitalHash,
      role: user.role,
      hospitalId: user.hospitalId,
    })),
  });

  console.log('[seed] patients and emergency requests');
  for (const [index, request] of REQUESTS.entries()) {
    const status: RequestStatus = request.assignment
      ? request.assignment.closedMinutesAgo !== null
        ? 'CLOSED'
        : 'ASSIGNED'
      : 'QUEUED';

    await prisma.patient.create({
      data: {
        patientId: request.patientId,
        name: request.patientName,
        age: request.age,
        contact: request.contact,
      },
    });

    const assignment = request.assignment;
    let assignmentData: Prisma.AssignmentCreateWithoutRequestInput | undefined;

    if (assignment) {
      const hospital = HOSPITALS.find((item) => item.hospitalId === assignment.hospitalId);
      const ambulance = AMBULANCES.find((item) => item.ambulanceId === assignment.ambulanceId);
      if (!hospital || !ambulance) throw new Error('Seed assignment references a missing row');

      const distanceKm = haversineKm(
        { lat: ambulance.lat, lon: ambulance.lon },
        { lat: request.lat, lon: request.lon },
      );

      assignmentData = {
        assignmentId: assignment.assignmentId,
        ambulance: { connect: { ambulanceId: ambulance.ambulanceId } },
        hospital: { connect: { hospitalId: hospital.hospitalId } },
        distanceKm: new Prisma.Decimal(distanceKm),
        readinessScore: assignment.readinessScore,
        partialFlag: assignment.partialFlag,
        reason: buildReason(request, hospital.name, ambulance.regNo, distanceKm),
        assignedAt: ago(assignment.assignedMinutesAgo),
        closedAt:
          assignment.closedMinutesAgo === null ? null : ago(assignment.closedMinutesAgo),
      };
    }

    await prisma.emergencyRequest.create({
      data: {
        requestId: request.requestId,
        patient: { connect: { patientId: request.patientId } },
        dispatcher: {
          connect: { userId: index % 2 === 0 ? 'USR-001' : 'USR-002' },
        },
        lat: request.lat,
        lon: request.lon,
        severity: request.severity,
        bloodGroupNeeded: request.bloodGroupNeeded,
        medicineNeeded: request.medicineNeeded,
        status,
        createdAt: ago(request.minutesAgo),
        ...(assignmentData ? { assignment: { create: assignmentData } } : {}),
      },
    });
  }

  const [hospitals, ambulances, patients, requests, assignments, users] =
    await Promise.all([
      prisma.hospital.count(),
      prisma.ambulance.count(),
      prisma.patient.count(),
      prisma.emergencyRequest.count(),
      prisma.assignment.count(),
      prisma.user.count(),
    ]);

  console.log('[seed] done');
  console.table({
    hospital: hospitals,
    ambulance: ambulances,
    patient: patients,
    emergency_request: requests,
    assignment: assignments,
    users: users,
    blood_stock: hospitals * BLOOD_GROUPS.length,
    medicine_stock: hospitals * 6,
  });
  console.log(`[seed] dispatcher login: dispatch.ops / ${DISPATCHER_PASSWORD}`);
  console.log(`[seed] hospital login:   kims.staff / ${HOSPITAL_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error('[seed] failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
