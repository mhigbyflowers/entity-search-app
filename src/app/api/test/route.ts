import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
    // Get all table names from the Prisma client
    const modelNames = Object.keys(prisma).filter(
        (key) => typeof ((prisma as unknown) as Record<string, unknown>)[key] === 'object' && 
                 ((prisma as unknown) as Record<string, unknown>)[key] !== null &&
                 typeof (((prisma as unknown) as Record<string, unknown>)[key] as Record<string, unknown>).findMany === 'function'
    );

    const results: Record<string, unknown[]> = {};

    // Fetch first 10 entries from each table
    for (const model of modelNames) {
        try {
            const modelClient = ((prisma as unknown) as Record<string, unknown>)[model] as { findMany: (args?: { take?: number }) => Promise<unknown[]> };
            results[model] = await modelClient.findMany({ take: 10 });
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            results[model] = [{ error: errorMessage }];
        }
    }

    return NextResponse.json(results);
}