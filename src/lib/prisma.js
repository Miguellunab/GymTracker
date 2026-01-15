import { PrismaClient } from '@prisma/client';

const globalForPrisma = global;

const DATABASE_URLS = {
    main: process.env.DATABASE_URL,
    test: process.env.DATABASE_URL_TEST,
    dev: process.env.DATABASE_URL_DEV
};

function createClient(mode) {
    const url = DATABASE_URLS[mode] || DATABASE_URLS.main;
    if (!url) {
        throw new Error('Missing DATABASE_URL');
    }
    return new PrismaClient({
        datasources: {
            db: { url }
        }
    });
}

export function getPrisma(mode = 'main') {
    const key = `prisma_${mode}`;
    if (!globalForPrisma[key]) {
        globalForPrisma[key] = createClient(mode);
    }
    return globalForPrisma[key];
}
