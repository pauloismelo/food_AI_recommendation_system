import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService } from '../../src/service/UserService.js';

const USERS = [
    { id: 1, name: 'Ana Lima', age: 25, region: 'sao_paulo', purchases: [] },
    { id: 2, name: 'Bruno Ferreira', age: 19, region: 'rio_de_janeiro', purchases: [] },
];

function mockFetch(data) {
    global.fetch = vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue(data),
    });
}

describe('UserService', () => {
    let service;

    beforeEach(() => {
        service = new UserService();
        vi.clearAllMocks();
    });

    describe('getDefaultUsers()', () => {
        it('fetches from /api/users', async () => {
            mockFetch(USERS);

            await service.getDefaultUsers();

            expect(fetch).toHaveBeenCalledWith('/api/users');
        });

        it('returns the user list from the API', async () => {
            mockFetch(USERS);

            const result = await service.getDefaultUsers();

            expect(result).toEqual(USERS);
        });
    });

    describe('getUsers()', () => {
        it('fetches from /api/users', async () => {
            mockFetch(USERS);

            await service.getUsers();

            expect(fetch).toHaveBeenCalledWith('/api/users');
        });

        it('returns the user list from the API', async () => {
            mockFetch(USERS);

            const result = await service.getUsers();

            expect(result).toEqual(USERS);
        });
    });

    describe('getUserById()', () => {
        it('fetches from /api/users/:id', async () => {
            mockFetch(USERS[0]);

            await service.getUserById(1);

            expect(fetch).toHaveBeenCalledWith('/api/users/1');
        });

        it('returns the matching user', async () => {
            mockFetch(USERS[1]);

            const result = await service.getUserById(2);

            expect(result).toEqual(USERS[1]);
        });
    });

    describe('updateUser()', () => {
        it('sends PUT to /api/users/:id', async () => {
            const user = { id: 1, name: 'Ana Lima', age: 25, region: 'sao_paulo', purchases: [{ id: 3 }] };
            mockFetch(user);

            await service.updateUser(user);

            expect(fetch).toHaveBeenCalledWith('/api/users/1', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ purchases: user.purchases }),
            });
        });

        it('sends only the purchases field in the body', async () => {
            const user = { id: 2, name: 'Bruno', age: 19, region: 'rio_de_janeiro', purchases: [{ id: 1 }, { id: 7 }] };
            mockFetch(user);

            await service.updateUser(user);

            const [, options] = fetch.mock.calls[0];
            const body = JSON.parse(options.body);
            expect(Object.keys(body)).toEqual(['purchases']);
            expect(body.purchases).toEqual([{ id: 1 }, { id: 7 }]);
        });

        it('returns the updated user from the API', async () => {
            const user = { id: 1, purchases: [{ id: 3 }] };
            mockFetch(user);

            const result = await service.updateUser(user);

            expect(result).toEqual(user);
        });
    });

    describe('addUser()', () => {
        it('sends POST to /api/users', async () => {
            const newUser = { id: 99, name: 'Josézin da Silva', age: 30, region: 'sao_paulo', purchases: [] };
            mockFetch(newUser);

            await service.addUser(newUser);

            expect(fetch).toHaveBeenCalledWith('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUser),
            });
        });

        it('sends the full user object in the body', async () => {
            const newUser = { id: 99, name: 'Josézin da Silva', age: 30, region: 'sao_paulo', purchases: [] };
            mockFetch(newUser);

            await service.addUser(newUser);

            const [, options] = fetch.mock.calls[0];
            expect(JSON.parse(options.body)).toEqual(newUser);
        });
    });
});
