import { db } from '@mindstudio-ai/agent';

// A project is a campaign or partner the student is working on.
// Holds workflow runs, artifacts, and chat threads for that context.
interface Project {
  userId: string;
  name: string;
  partnerName?: string;
  niche?: string;
  status: 'active' | 'archived';
  lastActivityAt?: number;         // Updated on any child mutation
}

export const Projects = db.defineTable<Project>('projects', {
  defaults: {
    status: 'active',
  },
});
