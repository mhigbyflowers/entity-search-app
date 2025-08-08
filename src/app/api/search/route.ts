import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query } = body;
    console.log('Search query:', query);

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query parameter is required and must be a string' },
        { status: 400 }
      );
    }

    // Search across multiple entity types
    const [usernames, companies, locations, domains] = await Promise.all([
      prisma.username.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { displayName: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 10,
      }),
      prisma.company.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { longname: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 10,
      }),
      prisma.location.findMany({
        where: {
          name: { contains: query, mode: 'insensitive' },
        },
        take: 10,
      }),
      prisma.internetDomainName.findMany({
        where: {
          name: { contains: query, mode: 'insensitive' },
        },
        take: 10,
      }),
    ]);

    return NextResponse.json({
      query,
      results: {
        usernames,
        companies,
        locations,
        domains,
      },
      total: usernames.length + companies.length + locations.length + domains.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

