import bcrypt from "bcryptjs";
import {
  db,
  pool,
  usersTable,
  coursesTable,
  subjectsTable,
} from "@workspace/db";

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
      price: "600.00",
      thumbnailUrl: null,
    },
  ];

  const insertedCourses = await db
    .insert(coursesTable)
    .values(courseSeed)
    .onConflictDoNothing({ target: coursesTable.slug })
    .returning();

  for (const course of insertedCourses) {
    await db.insert(subjectsTable).values([
      {
        courseId: course.id,
        title: "Foundations",
        description: "Introductory module establishing core concepts.",
        orderIndex: 1,
      },
      {
        courseId: course.id,
        title: "Core Practice",
        description: "Applied module with hands-on coursework.",
        orderIndex: 2,
      },
      {
        courseId: course.id,
        title: "Capstone",
        description: "Final project demonstrating mastery.",
        orderIndex: 3,
      },
    ]);
  }

  console.log("Seed complete.");
  console.log(`  superadmin / ${superadminPassword}`);
  console.log(`  admin / ${adminPassword}`);
  console.log(`  courses inserted: ${insertedCourses.length}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
