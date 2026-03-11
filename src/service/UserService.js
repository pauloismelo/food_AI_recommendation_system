export class UserService {
    async getDefaultUsers() {
        const response = await fetch('/api/users');
        return await response.json();
    }

    async getUsers() {
        const response = await fetch('/api/users');
        return await response.json();
    }

    async getUserById(userId) {
        const response = await fetch(`/api/users/${userId}`);
        return await response.json();
    }

    async updateUser(user) {
        const response = await fetch(`/api/users/${user.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ purchases: user.purchases }),
        });
        return await response.json();
    }

    async addUser(user) {
        await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user),
        });
    }
}
