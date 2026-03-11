import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductService } from '../../src/service/ProductService.js';

const PRODUCTS = [
    { id: 1, name: 'Artisan X-Burger', category: 'snacks', price: 32.9, cuisine: 'american' },
    { id: 2, name: 'Margherita Pizza', category: 'pizzas', price: 45.9, cuisine: 'italian' },
    { id: 3, name: 'Sushi Combo 20 Pieces', category: 'meals', price: 59.9, cuisine: 'japanese' },
];

function mockFetch(data) {
    global.fetch = vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue(data),
    });
}

describe('ProductService', () => {
    let service;

    beforeEach(() => {
        service = new ProductService();
        vi.clearAllMocks();
    });

    describe('getProducts()', () => {
        it('fetches from /api/products', async () => {
            mockFetch(PRODUCTS);

            await service.getProducts();

            expect(fetch).toHaveBeenCalledWith('/api/products');
        });

        it('returns the parsed JSON array', async () => {
            mockFetch(PRODUCTS);

            const result = await service.getProducts();

            expect(result).toEqual(PRODUCTS);
        });
    });

    describe('getProductById()', () => {
        it('fetches from /api/products/:id', async () => {
            mockFetch(PRODUCTS[0]);

            await service.getProductById(1);

            expect(fetch).toHaveBeenCalledWith('/api/products/1');
        });

        it('returns the matching product', async () => {
            mockFetch(PRODUCTS[1]);

            const result = await service.getProductById(2);

            expect(result).toEqual(PRODUCTS[1]);
        });
    });

    describe('getProductsByIds()', () => {
        it('returns only products whose id is in the list', async () => {
            mockFetch(PRODUCTS);

            const result = await service.getProductsByIds([1, 3]);

            expect(result).toHaveLength(2);
            expect(result.map(p => p.id)).toEqual([1, 3]);
        });

        it('returns all products when all ids match', async () => {
            mockFetch(PRODUCTS);

            const result = await service.getProductsByIds([1, 2, 3]);

            expect(result).toHaveLength(3);
        });

        it('returns empty array when no ids match', async () => {
            mockFetch(PRODUCTS);

            const result = await service.getProductsByIds([99, 100]);

            expect(result).toEqual([]);
        });

        it('calls getProducts() (which hits /api/products) internally', async () => {
            mockFetch(PRODUCTS);

            await service.getProductsByIds([1]);

            expect(fetch).toHaveBeenCalledWith('/api/products');
        });
    });
});
