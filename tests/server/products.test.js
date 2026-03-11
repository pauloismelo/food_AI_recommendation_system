import { vi, describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';

// vi.hoisted garante que as referências aos mocks estão disponíveis
// antes mesmo dos imports de módulo serem processados
const { mockProduct } = vi.hoisted(() => ({
    mockProduct: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
    },
}));

vi.mock('@prisma/client', () => ({
    PrismaClient: function () {
        return { product: mockProduct, user: {}, purchase: {} };
    },
}));

import app from '../../server/app.js';

const PRODUCTS = [
    { id: 1, name: 'Artisan X-Burger', category: 'snacks', price: 32.9, cuisine: 'american' },
    { id: 2, name: 'Margherita Pizza', category: 'pizzas', price: 45.9, cuisine: 'italian' },
    { id: 3, name: 'Sushi Combo 20 Pieces', category: 'meals', price: 59.9, cuisine: 'japanese' },
];

describe('GET /api/products', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns 200 with all products', async () => {
        mockProduct.findMany.mockResolvedValue(PRODUCTS);

        const res = await request(app).get('/api/products');

        expect(res.status).toBe(200);
        expect(res.body).toEqual(PRODUCTS);
        expect(mockProduct.findMany).toHaveBeenCalledWith({ orderBy: { id: 'asc' } });
    });

    it('returns an empty array when there are no products', async () => {
        mockProduct.findMany.mockResolvedValue([]);

        const res = await request(app).get('/api/products');

        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });
});

describe('GET /api/products/:id', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns 200 with the product when found', async () => {
        mockProduct.findUnique.mockResolvedValue(PRODUCTS[0]);

        const res = await request(app).get('/api/products/1');

        expect(res.status).toBe(200);
        expect(res.body).toEqual(PRODUCTS[0]);
        expect(mockProduct.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('returns 404 when product does not exist', async () => {
        mockProduct.findUnique.mockResolvedValue(null);

        const res = await request(app).get('/api/products/999');

        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: 'Product not found' });
    });

    it('queries by numeric id even when param is a string', async () => {
        mockProduct.findUnique.mockResolvedValue(PRODUCTS[1]);

        await request(app).get('/api/products/2');

        expect(mockProduct.findUnique).toHaveBeenCalledWith({ where: { id: 2 } });
    });
});
