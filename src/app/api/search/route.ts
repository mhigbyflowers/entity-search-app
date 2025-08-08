import { NextResponse } from "next/server";
import { PrismaClient, type Company, type InternetDomainName, type GenericEntity } from "@prisma/client";

const prisma = new PrismaClient();

type CSVRow = Record<string, unknown>;

function normalizeString(s: string | undefined | null): string {
  return (s ?? "").toString().trim().toLowerCase().replace(/\s+/g, " ");
}

function extractLikelyCompany(row: CSVRow): string | null {
  const keys = Object.keys(row);
  const candidates = ["company", "name", "company_name", "Company", "Name", "Company Name"];
  for (const k of candidates) {
    const key = keys.find((kk) => kk.toLowerCase() === k.toLowerCase());
    if (key && typeof row[key] !== "object") {
      const v = normalizeString(String(row[key] ?? ""));
      if (v) return v;
    }
  }
  for (const k of keys) {
    const v = row[k];
    if (v != null && typeof v !== "object") {
      const s = normalizeString(String(v));
      if (s && s.length <= 120) return s;
    }
  }
  return null;
}

function extractLikelyWebsite(row: CSVRow): string | null {
  const keys = Object.keys(row);
  const candidates = ["website", "url", "domain", "site", "Website", "Domain", "URL"];
  for (const k of candidates) {
    const key = keys.find((kk) => kk.toLowerCase() === k.toLowerCase());
    if (key && typeof row[key] !== "object") {
      const raw = String(row[key] ?? "");
      const host = toHostname(raw);
      if (host) return host;
    }
  }
  return null;
}

function toHostname(input: string): string | null {
  let s = input.trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s) && !/^\/\//.test(s)) s = "http://" + s;
  try {
    const url = new URL(s);
    let h = url.hostname.toLowerCase();
    if (h.startsWith("www.")) h = h.slice(4);
    return h || null;
  } catch {
    s = s.replace(/^[a-z]+:\/\//i, "").replace(/^www\./i, "").split(/[/?#]/)[0];
    return s || null;
  }
}

// Companies: name/longname + try alias-backed variants if schema includes them
async function findCompaniesByNameOrAlias(
  client: PrismaClient,
  q: string,
  take = 25
): Promise<Company[]> {
  const base = await client.company.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { longname: { contains: q, mode: "insensitive" } },
      ],
    },
    take,
  });

  // Relation-based aliases (optional)
  try {
    const relResUnknown = await (client as unknown as {
      company: { findMany(args: unknown): Promise<unknown> };
    }).company.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { longname: { contains: q, mode: "insensitive" } },
          { aliases: { some: { name: { contains: q, mode: "insensitive" } } } },
        ],
      },
      take,
      include: { aliases: true },
    } as unknown);
    const relRes = relResUnknown as unknown as Company[];
    if (Array.isArray(relRes) && relRes.length >= base.length) return relRes;
  } catch {
    // ignore if relation doesn't exist in schema
  }

  // Array-based alias fields (optional)
  try {
    const arrResUnknown = await (client as unknown as {
      company: { findMany(args: unknown): Promise<unknown> };
    }).company.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { longname: { contains: q, mode: "insensitive" } },
          { aliases: { has: q } },
          { altNames: { has: q } },
          { aka: { has: q } },
        ],
      },
      take,
    } as unknown);
    const arrRes = arrResUnknown as unknown as Company[];
    if (Array.isArray(arrRes) && arrRes.length > base.length) return arrRes;
  } catch {
    // ignore if fields not present
  }

  return base;
}

// GenericEntity: name + optional alias-backed variants
async function findGenericEntitiesByNameOrAlias(
  client: PrismaClient,
  q: string,
  take = 25
): Promise<GenericEntity[]> {
  const base = await client.genericEntity.findMany({
    where: {
      name: { contains: q, mode: "insensitive" },
    },
    take,
  });

  // Relation-based aliases (optional)
  try {
    const relResUnknown = await (client as unknown as {
      genericEntity: { findMany(args: unknown): Promise<unknown> };
    }).genericEntity.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { aliases: { some: { name: { contains: q, mode: "insensitive" } } } },
        ],
      },
      take,
      include: { aliases: true },
    } as unknown);
    const relRes = relResUnknown as unknown as GenericEntity[];
    if (Array.isArray(relRes) && relRes.length >= base.length) return relRes;
  } catch {
    // ignore
  }

  // Array-based alias fields (optional)
  try {
    const arrResUnknown = await (client as unknown as {
      genericEntity: { findMany(args: unknown): Promise<unknown> };
    }).genericEntity.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { aliases: { has: q } },
          { altNames: { has: q } },
          { aka: { has: q } },
          { akaNames: { has: q } },
        ],
      },
      take,
    } as unknown);
    const arrRes = arrResUnknown as unknown as GenericEntity[];
    if (Array.isArray(arrRes) && arrRes.length > base.length) return arrRes;
  } catch {
    // ignore
  }

  return base;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { fileName, rows } = body as { fileName?: string; rows?: CSVRow[] };

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "rows must be a non-empty array" }, { status: 400 });
    }

    const processed = await Promise.all(
      rows.map(async (row, index) => {
        const companyName = extractLikelyCompany(row);
        const websiteHost = extractLikelyWebsite(row);

        const [companyCandidates, genericCandidates, domainCandidates, exactDomain] = await Promise.all([
          companyName ? findCompaniesByNameOrAlias(prisma, companyName, 25) : Promise.resolve([] as Company[]),
          companyName ? findGenericEntitiesByNameOrAlias(prisma, companyName, 25) : Promise.resolve([] as GenericEntity[]),
          websiteHost
            ? prisma.internetDomainName.findMany({
                where: { name: { contains: websiteHost, mode: "insensitive" } },
                take: 10,
              })
            : Promise.resolve([] as InternetDomainName[]),
          websiteHost
            ? prisma.internetDomainName.findFirst({
                where: { name: websiteHost },
              })
            : Promise.resolve(null as InternetDomainName | null),
        ]);

        // Determine bestMatch:
        // 1) exact domain, 2) first Company, 3) first GenericEntity, 4) first InternetDomainName
        let bestMatch:
          | { entityType: "Company" | "GenericEntity" | "InternetDomainName"; entity: Company | GenericEntity | InternetDomainName }
          | null = null;

        if (exactDomain) {
          bestMatch = { entityType: "InternetDomainName", entity: exactDomain };
        } else if (companyCandidates.length > 0) {
          bestMatch = { entityType: "Company", entity: companyCandidates[0] };
        } else if (genericCandidates.length > 0) {
          bestMatch = { entityType: "GenericEntity", entity: genericCandidates[0] };
        } else if (domainCandidates.length > 0) {
          bestMatch = { entityType: "InternetDomainName", entity: domainCandidates[0] };
        }

        return {
          index,
          input: row,
          extracted: { companyName: companyName ?? null, website: websiteHost ?? null },
          candidates: {
            companies: companyCandidates,
            genericEntities: genericCandidates,
            domains: domainCandidates,
          },
          bestMatch,
        };
      })
    );

    const summary = {
      fileName: fileName ?? null,
      totalRows: rows.length,
      matched: processed.filter((r) => r.bestMatch).length,
      unmatched: processed.filter((r) => !r.bestMatch).length,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json({ summary, results: processed });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

