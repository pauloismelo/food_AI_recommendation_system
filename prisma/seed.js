import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const products = [
    { id: 1, name: 'Artisan X-Burger', category: 'snacks', price: 32.90, cuisine: 'american' },
    { id: 2, name: 'Margherita Pizza', category: 'pizzas', price: 45.90, cuisine: 'italian' },
    { id: 3, name: 'Sushi Combo 20 Pieces', category: 'meals', price: 59.90, cuisine: 'japanese' },
    { id: 4, name: 'Açaí Bowl 500ml with Granola', category: 'desserts', price: 22.90, cuisine: 'brazilian' },
    { id: 5, name: 'Traditional Feijoada', category: 'meals', price: 38.90, cuisine: 'brazilian' },
    { id: 6, name: 'Shrimp Pad Thai', category: 'meals', price: 42.90, cuisine: 'thai' },
    { id: 7, name: 'Chicken Coxinha (10 pcs)', category: 'snacks', price: 25.90, cuisine: 'brazilian' },
    { id: 8, name: 'Soft Drink 600ml', category: 'beverages', price: 8.90, cuisine: 'american' },
    { id: 9, name: 'Bolognese Lasagna', category: 'meals', price: 35.90, cuisine: 'italian' },
    { id: 10, name: 'Petit Gâteau', category: 'desserts', price: 28.90, cuisine: 'french' },
];

const users = [
    {
        id: 1, name: 'Ana Lima', age: 25, region: 'sao_paulo',
        purchases: [3, 6],
    },
    {
        id: 2, name: 'Bruno Ferreira', age: 19, region: 'rio_de_janeiro',
        purchases: [1, 8, 7],
    },
    {
        id: 3, name: 'Camila Souza', age: 32, region: 'curitiba',
        purchases: [2, 9],
    },
    {
        id: 4, name: 'Diego Almeida', age: 22, region: 'belo_horizonte',
        purchases: [5, 7, 4],
    },
    {
        id: 5, name: 'Eduarda Nunes', age: 28, region: 'sao_paulo',
        purchases: [2, 10, 3],
    },
    {
        id: 99, name: 'Josézin da Silva', age: 30, region: 'sao_paulo',
        purchases: [],
    },
];

async function main() {
    console.log('Seeding database...');

    await prisma.purchase.deleteMany();
    await prisma.user.deleteMany();
    await prisma.product.deleteMany();

    for (const product of products) {
        await prisma.product.create({ data: product });
    }
    console.log(`Created ${products.length} products`);

    for (const { purchases, ...userData } of users) {
        await prisma.user.create({
            data: {
                ...userData,
                purchases: {
                    create: purchases.map(productId => ({ productId })),
                },
            },
        });
    }
    console.log(`Created ${users.length} users with purchases`);

    console.log('Done!');
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
