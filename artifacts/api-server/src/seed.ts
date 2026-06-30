import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import {
  db,
  pool,
  usersTable,
  coursesTable,
  subjectsTable,
  studyMaterialsTable,
  materialProgressTable,
} from "@workspace/db";

const SAMPLE_VIDEO =
  "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
const SAMPLE_PDF =
  "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";

async function main() {
  const superadminPassword =
    process.env.SEED_SUPERADMIN_PASSWORD ?? "superadmin123";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "admin123";

  await db
    .insert(usersTable)
    .values([
      {
        username: "superadmin",
        passwordHash: await bcrypt.hash(superadminPassword, 10),
        email: "superadmin@centralglobal.edu",
        firstName: "System",
        lastName: "Owner",
        role: "superadmin",
      },
      {
        username: "admin",
        passwordHash: await bcrypt.hash(adminPassword, 10),
        email: "admin@centralglobal.edu",
        firstName: "Registrar",
        lastName: "Office",
        role: "admin",
      },
    ])
    .onConflictDoNothing({ target: usersTable.username });

  const courseSeed = [
    {
      title: "BSc Computer Science",
      slug: "bsc-computer-science",
      description:
        "A comprehensive undergraduate program covering algorithms, systems, AI and software engineering.",
      level: "undergraduate",
      durationWeeks: 144,
      price: "4800.00",
      thumbnailUrl: null,
    },
    {
      title: "MBA in Global Management",
      slug: "mba-global-management",
      description:
        "A postgraduate business program focused on leadership, strategy and international markets.",
      level: "postgraduate",
      durationWeeks: 96,
      price: "9600.00",
      thumbnailUrl: null,
    },
    {
      title: "Diploma in Data Analytics",
      slug: "diploma-data-analytics",
      description:
        "A practical diploma covering statistics, SQL, visualization and business intelligence.",
      level: "diploma",
      durationWeeks: 48,
      price: "2400.00",
      thumbnailUrl: null,
    },
    {
      title: "Certificate in Digital Marketing",
      slug: "certificate-digital-marketing",
      description:
        "A short certificate program on SEO, content, paid media and analytics.",
      level: "certificate",
      durationWeeks: 12,
      price: "0.00",
      thumbnailUrl: null,
    },
  ];

  await db
    .insert(coursesTable)
    .values(courseSeed)
    .onConflictDoNothing({ target: coursesTable.slug });

  // Ensure prices stay in sync (e.g. free certificate course) on re-seed.
  for (const c of courseSeed) {
    await db
      .update(coursesTable)
      .set({ price: c.price })
      .where(eq(coursesTable.slug, c.slug));
  }

  const allCourses = await db.select().from(coursesTable);

  // Reset curriculum so subjects/materials match the current plan.
  await db.delete(materialProgressTable);
  await db.delete(studyMaterialsTable);
  await db.delete(subjectsTable);

  const subjectPlan = [
    {
      year: 1,
      semester: 1,
      title: "Foundations",
      description: "Introductory module establishing core concepts.",
    },
    {
      year: 1,
      semester: 2,
      title: "Core Principles",
      description: "Building blocks and essential theory for the program.",
    },
    {
      year: 2,
      semester: 1,
      title: "Advanced Practice",
      description: "Applied module with hands-on coursework.",
    },
    {
      year: 2,
      semester: 2,
      title: "Capstone",
      description: "Final project demonstrating mastery.",
    },
  ];

  let materialCount = 0;
  for (const course of allCourses) {
    for (let i = 0; i < subjectPlan.length; i++) {
      const plan = subjectPlan[i];
      const [subject] = await db
        .insert(subjectsTable)
        .values({
          courseId: course.id,
          title: plan.title,
          description: plan.description,
          year: plan.year,
          semester: plan.semester,
          orderIndex: i + 1,
        })
        .returning();

      await db.insert(studyMaterialsTable).values([
        {
          subjectId: subject.id,
          title: `${plan.title} — Video Lecture`,
          type: "video",
          url: SAMPLE_VIDEO,
          durationMinutes: 10,
          orderIndex: 1,
        },
        {
          subjectId: subject.id,
          title: `${plan.title} — Lecture Notes (PDF)`,
          type: "pdf",
          url: SAMPLE_PDF,
          orderIndex: 2,
        },
        {
          subjectId: subject.id,
          title: `${plan.title} — Reading Summary`,
          type: "text",
          content:
            "Review the key concepts covered in this module and complete the practice questions before moving on.",
          orderIndex: 3,
        },
      ]);
      materialCount += 3;
    }
  }

  console.log("Seed complete.");
  console.log(`  superadmin / ${superadminPassword}`);
  console.log(`  admin / ${adminPassword}`);
  console.log(`  courses: ${allCourses.length}`);
  console.log(`  materials inserted: ${materialCount}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
