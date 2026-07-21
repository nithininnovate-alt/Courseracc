import { Router, type IRouter } from "express";
import { eq, and, inArray } from "drizzle-orm";
import {
  db,
  enrollmentsTable,
  coursesTable,
  subjectsTable,
  studyMaterialsTable,
  lessonExplanationsTable,
} from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { SendChatMessageBody, ExplainLessonBody } from "@workspace/api-zod";
import { requireUser, isStaff, type AuthedRequest } from "../lib/auth";
import {
  getCourseIdForMaterial,
  getCourseAccess,
  getUnlockedYears,
  isYearUnlocked,
} from "../lib/access";
import { logger } from "../lib/logger";

const router: IRouter = Router();

/**
 * Build a system prompt grounded in the student's enrolled courses, subjects,
 * and study materials so the assistant can answer questions about their actual
 * learning content.
 */
async function buildStudentContext(userId: number): Promise<string> {
  const enrollments = await db
    .select({ courseId: enrollmentsTable.courseId })
    .from(enrollmentsTable)
    .where(eq(enrollmentsTable.userId, userId));

  const courseIds = enrollments.map((e) => e.courseId);
  if (courseIds.length === 0) {
    return "The student is not yet enrolled in any courses.";
  }

  const courses = await db
    .select()
    .from(coursesTable)
    .where(inArray(coursesTable.id, courseIds));

  const allSubjects = await db
    .select()
    .from(subjectsTable)
    .where(inArray(subjectsTable.courseId, courseIds));

  // Only expose subjects from curriculum years the student has unlocked —
  // the AI context must never leak locked-year material.
  const yearAccessByCourse = new Map(
    await Promise.all(
      courseIds.map(
        async (id) => [id, await getUnlockedYears(userId, id)] as const,
      ),
    ),
  );
  const subjects = allSubjects.filter((s) => {
    const ya = yearAccessByCourse.get(s.courseId);
    return ya ? ya.allYearsUnlocked || ya.unlockedYears.includes(s.year) : false;
  });

  const subjectIds = subjects.map((s) => s.id);
  const materials = subjectIds.length
    ? await db
        .select()
        .from(studyMaterialsTable)
        .where(inArray(studyMaterialsTable.subjectId, subjectIds))
    : [];

  const lines: string[] = [];
  for (const course of courses) {
    lines.push(`# Course: ${course.title}`);
    if (course.description) lines.push(course.description);
    const courseSubjects = subjects.filter((s) => s.courseId === course.id);
    for (const subject of courseSubjects) {
      lines.push(`\n## Subject: ${subject.title}`);
      if (subject.description) lines.push(subject.description);
      const subjMaterials = materials.filter((m) => m.subjectId === subject.id);
      for (const m of subjMaterials) {
        lines.push(`- Material: ${m.title} (${m.type})`);
        if (m.content) {
          // Cap each material's content so the context stays within budget.
          const snippet = m.content.slice(0, 1500);
          lines.push(snippet);
        }
      }
    }
    lines.push("");
  }

  // Keep the whole context within a sensible budget.
  return lines.join("\n").slice(0, 16000);
}

router.post(
  "/ai/chat",
  requireUser,
  async (req: AuthedRequest, res) => {
    const parsed = SendChatMessageBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }

    const context = await buildStudentContext(req.currentUser!.id);
    const studentName =
      [req.currentUser!.firstName, req.currentUser!.lastName]
        .filter(Boolean)
        .join(" ") || "the student";

    const systemPrompt = [
      `You are the Central Global University AI Study Assistant, a friendly and encouraging tutor helping ${studentName} learn.`,
      `Answer questions about the student's enrolled courses, subjects, lessons, study materials, and assignments using the course context below.`,
      `When the answer is found in the course materials, ground your explanation in them. When a question goes beyond the provided materials, you may use general knowledge but make clear it is supplementary.`,
      `Be concise, explain step by step, and use simple language. If the student has no relevant materials, encourage them and offer general study help.`,
      ``,
      `=== STUDENT COURSE CONTEXT ===`,
      context,
      `=== END CONTEXT ===`,
    ].join("\n");

    const chatMessages = [
      { role: "system" as const, content: systemPrompt },
      ...parsed.data.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    try {
      const stream = await openai.chat.completions.create({
        model: "gpt-5.4",
        max_completion_tokens: 8192,
        messages: chatMessages,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    } catch (err) {
      logger.error({ err }, "AI chat stream failed");
      res.write(
        `data: ${JSON.stringify({
          error: "The assistant is unavailable right now. Please try again.",
        })}\n\n`,
      );
    } finally {
      res.end();
    }
  },
);

const MODE_INSTRUCTIONS: Record<string, string> = {
  explain:
    "Explain this lesson clearly and thoroughly, breaking it into digestible steps so the student understands the core ideas.",
  simpler:
    "Re-explain this lesson in the simplest possible terms, as if to a complete beginner. Use plain language and short sentences.",
  example:
    "Explain this lesson by walking through one or two concrete, worked examples that illustrate the key ideas in practice.",
  summary:
    "Summarize the key points of this lesson as a concise, well-organized bullet list a student can revise from.",
  quiz: "Quiz the student on this lesson with 3-5 short questions covering the key ideas. Provide the answers afterwards so they can self-check.",
};

router.post("/ai/explain", requireUser, async (req: AuthedRequest, res) => {
  const parsed = ExplainLessonBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const { materialId } = parsed.data;
  const mode = parsed.data.mode ?? "explain";

  // Load the material and verify the student can access its course.
  const [material] = await db
    .select()
    .from(studyMaterialsTable)
    .where(eq(studyMaterialsTable.id, materialId))
    .limit(1);
  if (!material) {
    res.status(404).json({ error: "Lesson not found" });
    return;
  }

  const courseId = await getCourseIdForMaterial(materialId);
  if (courseId === null) {
    res.status(404).json({ error: "Lesson not found" });
    return;
  }

  const [subject] = await db
    .select()
    .from(subjectsTable)
    .where(eq(subjectsTable.id, material.subjectId))
    .limit(1);

  // Mirror the materials endpoint: staff always have access; students need
  // course access (free or paid) and the subject's year must be unlocked.
  // Enrollment is not required — course access alone gates lesson content.
  if (!isStaff(req.currentUser!)) {
    const access = await getCourseAccess(req.currentUser!.id, courseId);
    if (!access?.hasAccess) {
      res
        .status(403)
        .json({ error: "You do not have access to this lesson." });
      return;
    }
    if (
      subject &&
      !(await isYearUnlocked(req.currentUser!.id, courseId, subject.year))
    ) {
      res
        .status(403)
        .json({ error: "This lesson is in a year you haven't unlocked yet." });
      return;
    }
  }
  const [course] = await db
    .select()
    .from(coursesTable)
    .where(eq(coursesTable.id, courseId))
    .limit(1);

  const studentName =
    [req.currentUser!.firstName, req.currentUser!.lastName]
      .filter(Boolean)
      .join(" ") || "the student";

  const lessonLines: string[] = [
    `Course: ${course?.title ?? "Unknown course"}`,
  ];
  if (course?.description) lessonLines.push(`Course overview: ${course.description}`);
  if (subject?.title) lessonLines.push(`Subject: ${subject.title}`);
  if (subject?.description) lessonLines.push(`Subject overview: ${subject.description}`);
  lessonLines.push(`Lesson title: ${material.title}`);
  lessonLines.push(`Lesson format: ${material.type}`);
  if (material.content) {
    lessonLines.push(`Lesson content:\n${material.content.slice(0, 12000)}`);
  } else if (material.type === "video") {
    lessonLines.push(
      "Lesson content: This is a video lesson; its transcript is not available, so rely on the title and subject/course context.",
    );
  } else if (material.type === "pdf") {
    lessonLines.push(
      "Lesson content: This is a PDF document; its text is not available here, so rely on the title and subject/course context.",
    );
  } else if (material.type === "link") {
    lessonLines.push(
      "Lesson content: This is an external link resource; rely on the title and subject/course context.",
    );
  }

  const systemPrompt = [
    `You are the Central Global University AI Study Assistant, a friendly and encouraging tutor helping ${studentName} understand a specific lesson they are currently viewing.`,
    MODE_INSTRUCTIONS[mode] ?? MODE_INSTRUCTIONS.explain,
    `Ground your explanation strictly in this lesson and its subject/course context. If the lesson content is not fully available (e.g. a video or PDF), explain the topic based on the lesson title and subject context, and say so briefly.`,
    `Be concise, use simple language, and format with short paragraphs or bullet points where helpful.`,
    ``,
    `=== LESSON CONTEXT ===`,
    lessonLines.join("\n"),
    `=== END CONTEXT ===`,
  ].join("\n");

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullText = "";

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Please ${mode === "quiz" ? "quiz me on" : "help me with"} this lesson: "${material.title}".`,
        },
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullText += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    // Persist the completed explanation per user + material so it can be
    // revisited without re-calling the AI. Overwrites any prior explanation.
    if (fullText.trim()) {
      try {
        await db
          .insert(lessonExplanationsTable)
          .values({
            userId: req.currentUser!.id,
            materialId,
            courseId,
            mode,
            content: fullText,
          })
          .onConflictDoUpdate({
            target: [
              lessonExplanationsTable.userId,
              lessonExplanationsTable.materialId,
            ],
            set: {
              courseId,
              mode,
              content: fullText,
              updatedAt: new Date(),
            },
          });
      } catch (saveErr) {
        logger.error({ err: saveErr }, "Failed to persist AI explanation");
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  } catch (err) {
    logger.error({ err }, "AI lesson explanation stream failed");
    res.write(
      `data: ${JSON.stringify({
        error: "The assistant is unavailable right now. Please try again.",
      })}\n\n`,
    );
  } finally {
    res.end();
  }
});

router.get(
  "/ai/explanations/:materialId",
  requireUser,
  async (req: AuthedRequest, res) => {
    const materialId = Number(req.params.materialId);
    if (!Number.isInteger(materialId)) {
      res.status(400).json({ error: "Invalid material id" });
      return;
    }

    const [explanation] = await db
      .select()
      .from(lessonExplanationsTable)
      .where(
        and(
          eq(lessonExplanationsTable.userId, req.currentUser!.id),
          eq(lessonExplanationsTable.materialId, materialId),
        ),
      )
      .limit(1);

    res.json({ explanation: explanation ?? undefined });
  },
);

export default router;
