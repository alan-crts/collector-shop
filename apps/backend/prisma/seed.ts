import { PrismaClient, Role, ItemStatus, TransactionStatus, MessageType, OfferStatus, NotificationType } from '@prisma/client';
import { faker } from '@faker-js/faker';
const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting seeding...');

    // Load auth dynamically (works in dev with src and prod with dist)
    let auth: any;
    try {
        const authModule = await import('../src/lib/auth.js');
        auth = authModule.auth;
    } catch (e) {
        const authModule = await import('../dist/lib/auth.js');
        auth = authModule.auth;
    }

    // 1. Clean the database
    console.log('Cleaning database...');
    await prisma.notification.deleteMany();
    await prisma.message.deleteMany();
    await prisma.review.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.item.deleteMany();
    await prisma.category.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.user.deleteMany();

    // 2. Create Categories
    console.log('Creating categories...');
    const categoryNames = [
        'Trading Cards',
        'Video Games',
        'Figurines',
        'Comics',
        'Stamps',
        'Coins',
        'Vinyl Records',
        'Antique Toys'
    ];

    const categories = await Promise.all(
        categoryNames.map(name =>
            prisma.category.create({
                data: {
                    name,
                    slug: name.toLowerCase().replace(/\s+/g, '-'),
                },
            })
        )
    );

    // 3. Create Fixed Users with known passwords
    console.log('Creating fixed users...');
    const fixedUsersData = [
        { email: 'admin@collector.com', password: 'admin123', name: 'Admin User', role: Role.ADMIN },
        { email: 'seller@collector.com', password: 'seller123', name: 'Seller User', role: Role.SELLER },
        { email: 'buyer@collector.com', password: 'buyer123', name: 'Buyer User', role: Role.BUYER },
    ];

    const users: any[] = [];

    for (const data of fixedUsersData) {
        const { email, password, name, role } = data;
        const result = await auth.api.signUpEmail({
            body: {
                email,
                password,
                name,
                role,
            }
        });

        // better-auth might return the user or a token depending on context
        // We fetch the user from prisma to be sure we have the full object
        const user = await prisma.user.findUnique({ where: { email } });
        if (user) {
            users.push(user);
            // Optionally mark as verified
            await prisma.user.update({
                where: { id: user.id },
                data: { emailVerified: true }
            });
        }
    }

    // 4. Create more Random Users
    console.log('Creating random users...');
    for (let i = 0; i < 40; i++) {
        const email = faker.internet.email();
        await auth.api.signUpEmail({
            body: {
                email,
                password: 'password123',
                name: faker.person.fullName(),
            }
        });
        const user = await prisma.user.findUnique({ where: { email } });
        if (user) {
            users.push(user);
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    emailVerified: true,
                    role: faker.helpers.arrayElement([Role.BUYER, Role.BUYER, Role.SELLER]),
                    image: faker.image.avatar(),
                }
            });
        }
    }

    const sellers = users.filter(u => u.role === Role.SELLER || u.role === Role.ADMIN);
    const buyers = users.filter(u => u.role === Role.BUYER);

    // 5. Create Items
    console.log('Creating items...');
    const items = await Promise.all(
        Array.from({ length: 150 }).map(() => {
            const seller = faker.helpers.arrayElement(sellers);
            const category = faker.helpers.arrayElement(categories);
            const status = faker.helpers.arrayElement([ItemStatus.APPROVED, ItemStatus.APPROVED, ItemStatus.APPROVED, ItemStatus.PENDING, ItemStatus.SOLD]);

            return prisma.item.create({
                data: {
                    title: faker.commerce.productName(),
                    description: faker.commerce.productDescription(),
                    price: parseFloat(faker.commerce.price({ min: 10, max: 1000 })),
                    shippingCost: parseFloat(faker.commerce.price({ min: 5, max: 50 })),
                    status,
                    images: [faker.image.urlLoremFlickr({ category: 'collectible' }), faker.image.urlLoremFlickr({ category: 'vintage' })],
                    sellerId: seller.id,
                    categoryId: category.id,
                },
            });
        })
    );

    // 6. Create Transactions
    console.log('Creating transactions...');
    const soldItems = items.filter(item => item.status === ItemStatus.SOLD);
    const transactions = await Promise.all(
        soldItems.map(item => {
            const buyer = faker.helpers.arrayElement(buyers);
            return prisma.transaction.create({
                data: {
                    itemId: item.id,
                    buyerId: buyer.id,
                    sellerId: item.sellerId,
                    amount: item.price,
                    commission: item.price * 0.1,
                    status: TransactionStatus.COMPLETED,
                    createdAt: faker.date.past(),
                },
            });
        })
    );

    // 7. Create Reviews
    console.log('Creating reviews...');
    await Promise.all(
        transactions.map(tx => {
            return prisma.review.create({
                data: {
                    rating: faker.number.int({ min: 3, max: 5 }),
                    comment: faker.lorem.sentence(),
                    reviewerId: tx.buyerId,
                    revieweeId: tx.sellerId,
                    transactionId: tx.id,
                },
            });
        })
    );

    // 8. Create Messages
    console.log('Creating messages...');
    await Promise.all(
        Array.from({ length: 80 }).map(() => {
            const item = faker.helpers.arrayElement(items);
            const sender = faker.helpers.arrayElement(users);
            const receiver = users.find(u => u.id !== sender.id) || users[0];
            const type = faker.helpers.arrayElement([MessageType.TEXT, MessageType.OFFER]);
            const isOffer = type === MessageType.OFFER;

            return prisma.message.create({
                data: {
                    content: isOffer ? `I offer you $${(item.price * 0.9).toFixed(2)} for this.` : faker.lorem.sentence(),
                    type,
                    offerPrice: isOffer ? item.price * 0.9 : null,
                    offerStatus: isOffer ? faker.helpers.arrayElement([OfferStatus.PENDING, OfferStatus.ACCEPTED, OfferStatus.REJECTED]) : null,
                    senderId: sender.id,
                    receiverId: receiver.id,
                    itemId: item.id,
                    isRead: faker.datatype.boolean(),
                },
            });
        })
    );

    // 9. Create Notifications
    console.log('Creating notifications...');
    await Promise.all(
        Array.from({ length: 30 }).map(() => {
            const user = faker.helpers.arrayElement(users);
            return prisma.notification.create({
                data: {
                    userId: user.id,
                    type: faker.helpers.arrayElement(Object.values(NotificationType)),
                    content: faker.lorem.sentence(),
                    isRead: faker.datatype.boolean(),
                },
            });
        })
    );

    console.log('✅ Seeding completed successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

