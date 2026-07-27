import {
  BillingRule,
  InvoiceStatus,
  PaymentMethod,
  ProgramLevel,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function seedOrganizationWorkspace(organizationId: string) {
  const existingCategory = await prisma.category.findFirst({
    where: { organizationId },
  });

  if (existingCategory) {
    return;
  }

  const [period, robotics, coding, teacherFiqo, teacherNadia, lab1, lab2] =
    await prisma.$transaction([
      prisma.academicPeriod.create({
        data: {
          organizationId,
          name: "Semester 2 2026",
          startsAt: new Date("2026-07-01T00:00:00.000Z"),
          endsAt: new Date("2026-12-31T00:00:00.000Z"),
        },
      }),
      prisma.category.create({
        data: {
          organizationId,
          name: "Robotics",
          description: "Program robotik untuk anak dan remaja.",
        },
      }),
      prisma.category.create({
        data: {
          organizationId,
          name: "Coding",
          description: "Program pemrograman berbasis proyek.",
        },
      }),
      prisma.teacher.create({
        data: {
          organizationId,
          name: "Fiqo",
          phone: "0812-0000-0101",
          email: "fiqo@orbit.local",
        },
      }),
      prisma.teacher.create({
        data: {
          organizationId,
          name: "Nadia",
          phone: "0812-0000-0102",
          email: "nadia@orbit.local",
        },
      }),
      prisma.room.create({
        data: { organizationId, name: "Lab 1", capacity: 10 },
      }),
      prisma.room.create({
        data: { organizationId, name: "Lab 2", capacity: 12 },
      }),
    ]);

  const goldRobotics = await prisma.program.create({
    data: {
      organizationId,
      categoryId: robotics.id,
      name: "Gold Robotics",
      level: ProgramLevel.GOLD,
      sessionDuration: 90,
      totalSessions: 16,
      maxStudents: 10,
      description: "Program robotik level gold untuk project build intensif.",
      pricingPlans: {
        create: [
          {
            organizationId,
            name: "Monthly",
            price: 675000,
            billingRule: BillingRule.MONTHLY,
          },
          {
            organizationId,
            name: "Semester",
            price: 1400000,
            billingRule: BillingRule.SEMESTER,
          },
        ],
      },
    },
    include: { pricingPlans: true },
  });

  const codingIntermediate = await prisma.program.create({
    data: {
      organizationId,
      categoryId: coding.id,
      name: "Coding Intermediate",
      level: ProgramLevel.INTERMEDIATE,
      sessionDuration: 90,
      totalSessions: 16,
      maxStudents: 8,
      description: "Coding intermediate dengan project web interaktif.",
      pricingPlans: {
        create: [
          {
            organizationId,
            name: "Semester",
            price: 1150000,
            billingRule: BillingRule.SEMESTER,
          },
        ],
      },
    },
    include: { pricingPlans: true },
  });

  const [goldClass, codingClass] = await prisma.$transaction([
    prisma.class.create({
      data: {
        organizationId,
        academicPeriodId: period.id,
        programId: goldRobotics.id,
        teacherId: teacherFiqo.id,
        roomId: lab1.id,
        name: "Gold Robotics Sabtu",
        dayOfWeek: 6,
        startsAt: "13:00",
        endsAt: "14:30",
        maxStudents: 10,
      },
    }),
    prisma.class.create({
      data: {
        organizationId,
        academicPeriodId: period.id,
        programId: codingIntermediate.id,
        teacherId: teacherNadia.id,
        roomId: lab2.id,
        name: "Coding Intermediate Senin",
        dayOfWeek: 1,
        startsAt: "16:30",
        endsAt: "18:00",
        maxStudents: 8,
      },
    }),
  ]);

  const parent = await prisma.parent.create({
    data: {
      organizationId,
      name: "Indria Maulina",
      phone: "0812-0000-0201",
      email: "indria@example.com",
      students: {
        create: [
          {
            organizationId,
            name: "Rafif Maulana",
            notes: "Aktif Robotics dan Coding.",
          },
          {
            organizationId,
            name: "Adit Pratama",
            notes: "Paket semester Robotics.",
          },
          {
            organizationId,
            name: "Kevin Ardi",
            notes: "Baru mulai bulan ini.",
          },
        ],
      },
    },
    include: { students: true },
  });

  const [rafif, adit, kevin] = parent.students;
  const monthlyPlan = goldRobotics.pricingPlans.find(
    (plan) => plan.billingRule === BillingRule.MONTHLY,
  );
  const semesterPlan = goldRobotics.pricingPlans.find(
    (plan) => plan.billingRule === BillingRule.SEMESTER,
  );
  const codingPlan = codingIntermediate.pricingPlans[0];

  if (!monthlyPlan || !semesterPlan || !codingPlan) {
    throw new Error("Default pricing plans were not created.");
  }

  const [rafifGold, aditGold, kevinGold, rafifCoding] =
    await prisma.$transaction([
      prisma.enrollment.create({
        data: {
          organizationId,
          academicPeriodId: period.id,
          studentId: rafif.id,
          classId: goldClass.id,
        },
      }),
      prisma.enrollment.create({
        data: {
          organizationId,
          academicPeriodId: period.id,
          studentId: adit.id,
          classId: goldClass.id,
        },
      }),
      prisma.enrollment.create({
        data: {
          organizationId,
          academicPeriodId: period.id,
          studentId: kevin.id,
          classId: goldClass.id,
        },
      }),
      prisma.enrollment.create({
        data: {
          organizationId,
          academicPeriodId: period.id,
          studentId: rafif.id,
          classId: codingClass.id,
        },
      }),
    ]);

  await prisma.$transaction([
    prisma.invoice.create({
      data: {
        organizationId,
        academicPeriodId: period.id,
        studentId: rafif.id,
        enrollmentId: rafifGold.id,
        pricingPlanId: monthlyPlan.id,
        invoiceNumber: "INV-2026-0727-001",
        status: InvoiceStatus.PARTIAL,
        subtotal: monthlyPlan.price,
        total: monthlyPlan.price,
        issuedAt: new Date("2026-07-27T00:00:00.000Z"),
        dueAt: new Date("2026-08-03T00:00:00.000Z"),
        lines: {
          create: {
            description: "Gold Robotics - Monthly",
            quantity: 1,
            unitPrice: monthlyPlan.price,
            total: monthlyPlan.price,
          },
        },
        payments: {
          create: {
            organizationId,
            amount: 300000,
            method: PaymentMethod.TRANSFER,
            reference: "TRF-001",
          },
        },
      },
    }),
    prisma.invoice.create({
      data: {
        organizationId,
        academicPeriodId: period.id,
        studentId: adit.id,
        enrollmentId: aditGold.id,
        pricingPlanId: semesterPlan.id,
        invoiceNumber: "INV-2026-0727-002",
        status: InvoiceStatus.PAID,
        subtotal: semesterPlan.price,
        total: semesterPlan.price,
        issuedAt: new Date("2026-07-27T00:00:00.000Z"),
        dueAt: new Date("2026-08-03T00:00:00.000Z"),
        lines: {
          create: {
            description: "Gold Robotics - Semester",
            quantity: 1,
            unitPrice: semesterPlan.price,
            total: semesterPlan.price,
          },
        },
        payments: {
          create: {
            organizationId,
            amount: semesterPlan.price,
            method: PaymentMethod.QRIS,
            reference: "QRIS-002",
          },
        },
      },
    }),
    prisma.invoice.create({
      data: {
        organizationId,
        academicPeriodId: period.id,
        studentId: kevin.id,
        enrollmentId: kevinGold.id,
        pricingPlanId: monthlyPlan.id,
        invoiceNumber: "INV-2026-0727-003",
        status: InvoiceStatus.UNPAID,
        subtotal: monthlyPlan.price,
        total: monthlyPlan.price,
        issuedAt: new Date("2026-07-27T00:00:00.000Z"),
        dueAt: new Date("2026-08-03T00:00:00.000Z"),
        lines: {
          create: {
            description: "Gold Robotics - Monthly",
            quantity: 1,
            unitPrice: monthlyPlan.price,
            total: monthlyPlan.price,
          },
        },
      },
    }),
    prisma.invoice.create({
      data: {
        organizationId,
        academicPeriodId: period.id,
        studentId: rafif.id,
        enrollmentId: rafifCoding.id,
        pricingPlanId: codingPlan.id,
        invoiceNumber: "INV-2026-0727-004",
        status: InvoiceStatus.DRAFT,
        subtotal: codingPlan.price,
        total: codingPlan.price,
        lines: {
          create: {
            description: "Coding Intermediate - Semester",
            quantity: 1,
            unitPrice: codingPlan.price,
            total: codingPlan.price,
          },
        },
      },
    }),
  ]);
}
