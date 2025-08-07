// prisma/seed.ts
import { PrismaClient, EntityType } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding start');
  const filePath = path.join(process.cwd(), 'prisma', 'entities.json');
  if (!fs.existsSync(filePath)) {
    console.warn('entities.json not found, skipping seed.');
    return;
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  if (!raw.trim()) {
    console.warn('entities.json is empty, skipping seed.');
    return;
  }
  let parsed: any;
  try { parsed = JSON.parse(raw); } catch (e) { console.error('Invalid JSON in entities.json'); throw e; }
  const entities = Object.values(parsed);
  console.log(`Found ${entities.length} entities`);

  for (const entity of entities as any[]) {
    try {
      switch (entity.type as string) {
        case 'Username':
          await prisma.username.upsert({
            where: { id: entity.id },
            update: {},
            create: {
              id: entity.id,
              name: entity.name,
              type: entity.type as EntityType,
              meta_type: entity.meta_type,
              created: new Date(entity.created),
              modified: new Date(entity.modified),
              curated: entity.curated === 1,
              hits: entity.hits ?? null,
              domain: entity.domain ?? null,
              createdAt: entity.created_at ? new Date(entity.created_at) : null,
              externalId: entity.external_id ?? null,
              displayName: entity.display_name ?? null,
              commonNames: entity.common_names ?? [],
              alias: entity.alias ?? [],
              deleted: entity.deleted ? new Date(entity.deleted) : null,
              owner: entity.owner ?? null,
            }
          });
          break;
        case 'Company':
          await prisma.company.upsert({
            where: { id: entity.id },
            update: {},
            create: {
              id: entity.id,
              name: entity.name,
              type: entity.type as EntityType,
              meta_type: entity.meta_type,
              created: new Date(entity.created),
              modified: new Date(entity.modified),
              curated: entity.curated === 1,
              hits: entity.hits ?? null,
              longname: entity.longname ?? null,
              peers: entity.peers ?? [],
              latitude: entity.pos?.latitude ?? null,
              longitude: entity.pos?.longitude ?? null,
              external_links: entity.external_links ?? {},
              lists: entity.lists ?? [],
              industries: entity.industries ?? [],
              alias: entity.alias ?? [],
              domicile: entity.domicile ?? null,
              category: entity.category ?? [],
            }
          });
          break;
        case 'City':
        case 'Region':
        case 'Facility':
        case 'Airport':
        case 'NaturalFeature':
          await prisma.location.upsert({
            where: { id: entity.id },
            update: {},
            create: {
              id: entity.id,
              name: entity.name,
              type: entity.type as EntityType,
              meta_type: entity.meta_type,
              created: entity.created ? new Date(entity.created) : null,
              modified: entity.modified ? new Date(entity.modified) : null,
              curated: typeof entity.curated !== 'undefined' ? entity.curated === 1 : null,
              hits: entity.hits ?? null,
              latitude: entity.pos?.latitude ?? null,
              longitude: entity.pos?.longitude ?? null,
              external_links: entity.external_links ?? {},
              containers: entity.containers ?? [],
              population: entity.population ?? null,
              features: entity.features ?? [],
              alias: entity.alias ?? [],
            }
          });
          break;
        case 'InternetDomainName':
          await prisma.internetDomainName.upsert({
            where: { id: entity.id },
            update: {},
            create: {
              id: entity.id,
              name: entity.name,
              type: entity.type as EntityType,
              meta_type: entity.meta_type,
              created: new Date(entity.created),
              modified: new Date(entity.modified),
              curated: entity.curated === 1,
              hits: entity.hits ?? null,
              level: entity.level ?? null,
            }
          });
          break;
        default:
          const { id, name, type, meta_type, created, modified, curated, hits, ...rest } = entity;
          await prisma.genericEntity.upsert({
            where: { id },
            update: {},
            create: {
              id,
              name,
              type: type as EntityType,
              meta_type,
              created: new Date(created),
              modified: new Date(modified),
              curated: curated === 1,
              hits: hits ?? null,
              attributes: rest,
            }
          });
      }
    } catch (err) {
      console.error(`Failed to upsert entity ${entity.id} (${entity.type}):`, err);
    }
  }
  console.log('✅ Seed complete');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
