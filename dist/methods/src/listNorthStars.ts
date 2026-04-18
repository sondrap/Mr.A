import { auth } from '@mindstudio-ai/agent';
import { NorthStars } from './tables/north_stars';

// Agent tool: list the 4 North Stars.
export async function listNorthStars() {
  auth.requireRole('student', 'admin');
  const northStars = await NorthStars.sortBy((n) => n.name);
  return {
    northStars: northStars.map((n) => ({
      slug: n.slug,
      name: n.name,
      description: n.description,
    })),
  };
}
