import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Formats a user row (with purchases relation) into the shape the frontend expects
function formatUser(user) {
    return {
        id: user.id,
        name: user.name,
        age: user.age,
        region: user.region,
        purchases: user.purchases.map(p => ({
            id: p.product.id,
            name: p.product.name,
            category: p.product.category,
            price: p.product.price,
            cuisine: p.product.cuisine,
        })),
    };
}

const userWithPurchases = {
    purchases: { include: { product: true } },
};

router.get('/', async (req, res) => {
    const users = await prisma.user.findMany({
        include: userWithPurchases,
        orderBy: { id: 'asc' },
    });
    res.json(users.map(formatUser));
});

router.get('/:id', async (req, res) => {
    const user = await prisma.user.findUnique({
        where: { id: Number(req.params.id) },
        include: userWithPurchases,
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(formatUser(user));
});

router.post('/', async (req, res) => {
    const { id, name, age, region, purchases = [] } = req.body;
    const user = await prisma.user.upsert({
        where: { id },
        update: { name, age, region },
        create: {
            id,
            name,
            age,
            region,
            purchases: {
                create: purchases.map(p => ({ productId: p.id })),
            },
        },
        include: userWithPurchases,
    });
    res.status(201).json(formatUser(user));
});

router.put('/:id', async (req, res) => {
    const userId = Number(req.params.id);
    const { purchases = [] } = req.body;

    // Replace all purchases: delete existing, create new ones
    await prisma.purchase.deleteMany({ where: { userId } });
    await prisma.purchase.createMany({
        data: purchases.map(p => ({ userId, productId: p.id })),
        skipDuplicates: true,
    });

    const updated = await prisma.user.findUnique({
        where: { id: userId },
        include: userWithPurchases,
    });
    if (!updated) return res.status(404).json({ error: 'User not found' });
    res.json(formatUser(updated));
});

export default router;
