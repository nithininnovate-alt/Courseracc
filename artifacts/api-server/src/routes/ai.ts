import { Router, type IRouter } from "express";
import { eq, inArray } from "drizzle-orm";
import {
  db,
  enrollmentsTable,
  coursesTable,
  subjectsTable,
  studyMaterialsTable,
} from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { SendChatMessageBody } from "@workspace/api-zod";
import { requireUser, type AuthedRequest } from "../lib/auth";
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

  const subjects = await db
    .select()
    .from(subjectsTable)
    .where(inArray(subjectsTable.courseId, courseIds));

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

export default router;
