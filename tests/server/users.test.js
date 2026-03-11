import { vi, describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';

const { mockUser, mockPurchase } = vi.hoisted(() => ({
    mockUser: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        upsert: vi.fn(),
    },
    mockPurchase: {
        deleteMany: vi.fn(),
        createMany: vi.fn(),
    },
}));

vi.mock('@prisma/client', () => ({
    PrismaClient: function () {
        return { product: {}, user: mockUser, purchase: mockPurchase };
    },
}));

import app from '../../server/app.js';

// Shape que o Prisma retorna (com relações incluídas)
const PRISMA_USER = {
    id: 1,
    name: 'Ana Lima',
    age: 25,
    region: 'sao_paulo',
    purchases: [
        {
            id: 10,
            userId: 1,
            productId: 3,
            product: { id: 3, name: 'Sushi Combo 20 Pieces', category: 'meals', price: 59.9, cuisine: 'japanese' },
        },
    ],
};

// Shape que o frontend espera (formatUser transforma o acima)
const FORMATTED_USER = {
    id: 1,
    name: 'Ana Lima',
    age: 25,
    region: 'sao_paulo',
    purchases: [
        { id: 3, name: 'Sushi Combo 20 Pieces', category: 'meals', price: 59.9, cuisine: 'japanese' },
    ],
};

const USER_WITH_PURCHASES_INCLUDE = {
    purchases: { include: { product: true } },
};

describe('GET /api/users', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns 200 with formatted users', async () => {
        mockUser.findMany.mockResolvedValue([PRISMA_USER]);

        const res = await request(app).get('/api/users');

        expect(res.status).toBe(200);
        expect(res.body).toEqual([FORMATTED_USER]);
        expect(mockUser.findMany).toHaveBeenCalledWith({
            include: USER_WITH_PURCHASES_INCLUDE,
            orderBy: { id: 'asc' },
        });
    });

    it('returns an empty array when there are no users', async () => {
        mockUser.findMany.mockResolvedValue([]);

        const res = await request(app).get('/api/users');

        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });

    it('flattens purchases from nested product relation', async () => {
        mockUser.findMany.mockResolvedValue([PRISMA_USER]);

        const res = await request(app).get('/api/users');

        expect(res.body[0].purchases[0]).toEqual({
            id: 3,
            name: 'Sushi Combo 20 Pieces',
            category: 'meals',
            price: 59.9,
            cuisine: 'japanese',
        });
    });
});

describe('GET /api/users/:id', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns 200 with formatted user when found', async () => {
        mockUser.findUnique.mockResolvedValue(PRISMA_USER);

        const res = await request(app).get('/api/users/1');

        expect(res.status).toBe(200);
        expect(res.body).toEqual(FORMATTED_USER);
        expect(mockUser.findUnique).toHaveBeenCalledWith({
            where: { id: 1 },
            include: USER_WITH_PURCHASES_INCLUDE,
        });
    });

    it('returns 404 when user does not exist', async () => {
        mockUser.findUnique.mockResolvedValue(null);

        const res = await request(app).get('/api/users/999');

        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: 'User not found' });
    });
});

describe('POST /api/users', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns 201 with created user', async () => {
        const newUser = { id: 99, name: 'Josézin da Silva', age: 30, region: 'sao_paulo', purchases: [] };
        const prismaResult = { ...newUser, purchases: [] };
        mockUser.upsert.mockResolvedValue(prismaResult);

        const res = await request(app).post('/api/users').send(newUser);

        expect(res.status).toBe(201);
        expect(res.body).toEqual({ ...newUser, purchases: [] });
    });

    it('calls upsert with correct where/create/update params', async () => {
        const newUser = { id: 5, name: 'Test User', age: 20, region: 'curitiba', purchases: [] };
        mockUser.upsert.mockResolvedValue({ ...newUser, purchases: [] });

        await request(app).post('/api/users').send(newUser);

        expect(mockUser.upsert).toHaveBeenCalledWith({
            where: { id: 5 },
            update: { name: 'Test User', age: 20, region: 'curitiba' },
            create: {
                id: 5,
                name: 'Test User',
                age: 20,
                region: 'curitiba',
                purchases: { create: [] },
            },
            include: USER_WITH_PURCHASES_INCLUDE,
        });
    });
});

describe('PUT /api/users/:id', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns 200 with updated user after replacing purchases', async () => {
        const updatedPrismaUser = {
            ...PRISMA_USER,
            purchases: [
                {
                    id: 20,
                    userId: 1,
                    productId: 1,
                    product: { id: 1, name: 'Artisan X-Burger', category: 'snacks', price: 32.9, cuisine: 'american' },
                },
            ],
        };
        mockPurchase.deleteMany.mockResolvedValue({});
        mockPurchase.createMany.mockResolvedValue({});
        mockUser.findUnique.mockResolvedValue(updatedPrismaUser);

        const res = await request(app)
            .put('/api/users/1')
            .send({ purchases: [{ id: 1 }] });

        expect(res.status).toBe(200);
        expect(res.body.purchases).toEqual([
            { id: 1, name: 'Artisan X-Burger', category: 'snacks', price: 32.9, cuisine: 'american' },
        ]);
    });

    it('deletes existing purchases before creating new ones', async () => {
        mockPurchase.deleteMany.mockResolvedValue({});
        mockPurchase.createMany.mockResolvedValue({});
        mockUser.findUnique.mockResolvedValue({ ...PRISMA_USER, purchases: [] });

        await request(app).put('/api/users/1').send({ purchases: [{ id: 2 }] });

        expect(mockPurchase.deleteMany).toHaveBeenCalledWith({ where: { userId: 1 } });
        expect(mockPurchase.createMany).toHaveBeenCalledWith({
            data: [{ userId: 1, productId: 2 }],
            skipDuplicates: true,
        });
    });

    it('returns 404 when user does not exist', async () => {
        mockPurchase.deleteMany.mockResolvedValue({});
        mockPurchase.createMany.mockResolvedValue({});
        mockUser.findUnique.mockResolvedValue(null);

        const res = await request(app).put('/api/users/999').send({ purchases: [] });

        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: 'User not found' });
    });

    it('accepts empty purchases list (clear all purchases)', async () => {
        const prismaUserNoPurchases = { ...PRISMA_USER, purchases: [] };
        mockPurchase.deleteMany.mockResolvedValue({});
        mockPurchase.createMany.mockResolvedValue({});
        mockUser.findUnique.mockResolvedValue(prismaUserNoPurchases);

        const res = await request(app).put('/api/users/1').send({ purchases: [] });

        expect(res.status).toBe(200);
        expect(res.body.purchases).toEqual([]);
        expect(mockPurchase.createMany).toHaveBeenCalledWith({
            data: [],
            skipDuplicates: true,
        });
    });
});
