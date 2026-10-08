import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Guides: one markdown file per guide in src/content/guides/<slug>.md
const guides = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guides' }),
  schema: z.object({
    title: z.string(),                       // the H1
    seoTitle: z.string().optional(),         // <title> if different (max ~60 chars)
    description: z.string(),                 // meta description, 140-160 chars
    hub: z.enum(['hadlut-piraon', 'hotzaa-lapoal', 'hesder-hov', 'atzmaim', 'kalkala', 'achrei']),
    published: z.coerce.date(),
    updated: z.coerce.date(),
    summary: z.array(z.string()).min(2),     // "בקצרה": 3-5 short answer lines shown at the top (what AI answers quote)
    faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
    sources: z.array(z.object({ title: z.string(), url: z.string().url() })).min(1),
    related: z.array(z.string()).default([]),
    tool: z.string().optional(),             // slug of a calculator to promote inside the guide
    video: z.string().optional(),            // id of a video in src/data/videos.json
    kind: z.enum(['guide', 'article', 'checklist', 'explainer']).default('guide'), // מדריך / מאמר / צ'קליסט / הסבר
    order: z.number().default(50),           // position inside its hub (lower first)
    pillar: z.boolean().default(false),     // a main "super guide" of a hub (2,500+ words)
    draft: z.boolean().default(false),
  }),
});

const lessons = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/lessons' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    course: z.enum(['yotzim', 'kalkala', 'taktziv', 'hesder']).default('yotzim'),
    n: z.number(),
    minutes: z.number(),
    video: z.string().optional(),
    quiz: z.array(z.object({ q: z.string(), options: z.array(z.string()), correct: z.number(), why: z.string() })).default([]),
    guides: z.array(z.string()).default([]),
  }),
});

export const collections = { guides, lessons };
