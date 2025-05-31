import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    publishedDate: z.date(),
    updatedDate: z.date().optional(),
    author: z.string().default('Platus Team'),
    authorTitle: z.string().optional(),
    authorImage: z.string().url().optional(),
    coverImage: z.string().url().optional(),
    imageAlt: z.string().optional(),
    categories: z.array(z.string()),
    tags: z.array(z.string()),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false)
  })
});

export const collections = {
  blog
};