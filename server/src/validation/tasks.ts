import { z } from "zod";

import { TaskPriority } from "@prisma/client";

const priorityValues = [TaskPriority.LOW, TaskPriority.MEDIUM, TaskPriority.HIGH] as const;

const descriptionSchema = z.string().trim().max(5000).nullable();

const dateOnlySchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Due date must use YYYY-MM-DD format")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Due date must be a valid calendar date")
  .transform((value) => new Date(`${value}T00:00:00.000Z`));

const dueDateSchema = z.preprocess(
  (value) => (value === "" ? null : value),
  dateOnlySchema.nullable()
);
const titleSchema = z.string().trim().min(1).max(200);
const tagValueSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Tags cannot be empty")
  .max(32, "Tags must be at most 32 characters")
  .regex(
    /^[a-z0-9 _-]+$/,
    "Tags may only contain letters, numbers, spaces, hyphens, and underscores"
  );
const tagsSchema = z.preprocess(
  normalizeTagsInput,
  z.array(tagValueSchema).max(10, "Tasks can have at most 10 tags")
);
const optionalTagQuerySchema = z.preprocess(
  (value) => (value === "" ? undefined : value),
  tagValueSchema.optional()
);
const booleanStringSchema = z.preprocess((value) => {
  if (value === "true" || value === "1" || value === "on") {
    return true;
  }

  if (value === "false" || value === "0" || value === "off" || value === "") {
    return false;
  }

  return value;
}, z.boolean());

function normalizeTaskBodyAliases(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }

  const body = value as Record<string, unknown>;

  if ("remove-image" in body && !("removeImage" in body)) {
    return {
      ...body,
      removeImage: body["remove-image"],
    };
  }

  return value;
}

function normalizeTagsInput(value: unknown): unknown {
  if (value === undefined) {
    return value;
  }

  const rawTags =
    typeof value === "string" ? value.split(",") : Array.isArray(value) ? value : null;

  if (!rawTags) {
    return value;
  }

  const normalizedTags = rawTags
    .map((tag) => (typeof tag === "string" ? tag.trim().toLowerCase() : tag))
    .filter((tag) => tag !== "");

  return Array.from(new Set(normalizedTags));
}

export const createTaskBodySchema = z.preprocess(
  normalizeTaskBodyAliases,
  z.object({
    description: descriptionSchema.optional().transform((value) => value || null),
    dueDate: dueDateSchema.optional().transform((value) => value ?? null),
    priority: z.enum(priorityValues).default(TaskPriority.MEDIUM),
    tags: tagsSchema.default([]),
    title: titleSchema,
  })
);

export const listTasksQuerySchema = z.object({
  status: z.enum(["all", "active", "completed"]).default("all"),
  tag: optionalTagQuerySchema,
});

export const taskParamsSchema = z.object({
  id: z.string().uuid(),
});

export const updateTaskBodySchema = z
  .preprocess(
    normalizeTaskBodyAliases,
    z.object({
      completed: booleanStringSchema.optional(),
      description: descriptionSchema.optional().transform((value) => {
        if (value === "") {
          return null;
        }

        return value;
      }),
      dueDate: dueDateSchema.optional(),
      priority: z.enum(priorityValues).optional(),
      removeImage: booleanStringSchema.optional(),
      tags: tagsSchema.optional(),
      title: titleSchema.optional(),
    })
  )
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: "At least one task field must be provided",
  });

export type CreateTaskBody = z.infer<typeof createTaskBodySchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
export type TaskParams = z.infer<typeof taskParamsSchema>;
export type UpdateTaskBody = z.infer<typeof updateTaskBodySchema>;
