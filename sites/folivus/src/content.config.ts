import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Guides: src/content/maamarim/<slug>.md
const maamarim = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/maamarim' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    published: z.coerce.date(),
    updated: z.coerce.date(),
    summary: z.array(z.string()).default([]),
    faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
    sources: z.array(z.object({ title: z.string(), url: z.string().url() })).default([]),
    areas: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { maamarim };
