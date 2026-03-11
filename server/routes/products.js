import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
    const products = await prisma.product.findMany({ orderBy: { id: 'asc' } });
    res.json(products);
});

router.get('/:id', async (req, res) => {
    const product = await prisma.product.findUnique({
        where: { id: Number(req.params.id) },
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
});

export default router;
