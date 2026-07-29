import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();
const prisma = new PrismaClient();

const PASSWORD = process.env.SEED_PASSWORD ?? "Password@123";

const users: { name: string; email: string; role: Role }[] = [
  { name: "Aditi Admin", email: "admin@erpdemo.com", role: "ADMIN" },
  { name: "Sanjay Sales", email: "sales@erpdemo.com", role: "SALES" },
  { name: "Wasim Warehouse", email: "warehouse@erpdemo.com", role: "WAREHOUSE" },
  { name: "Anita Accounts", email: "accounts@erpdemo.com", role: "ACCOUNTS" },
];

const products = [
  { name: "Sunflower Oil 1L Pouch", sku: "OIL-SUN-1L", category: "Edible Oil", unitPrice: 148.5, currentStock: 500, minStockAlert: 100, location: "Rack A1" },
  { name: "Basmati Rice 5kg", sku: "RICE-BAS-5KG", category: "Staples", unitPrice: 640.0, currentStock: 220, minStockAlert: 50, location: "Rack B2" },
  { name: "Detergent Powder 1kg", sku: "DET-PWD-1KG", category: "Home Care", unitPrice: 112.0, currentStock: 40, minStockAlert: 60, location: "Rack C1" },
  { name: "Toothpaste 150g", sku: "ORAL-TP-150", category: "Personal Care", unitPrice: 95.0, currentStock: 310, minStockAlert: 80, location: "Rack C3" },
  { name: "Tea Leaves 500g", sku: "BEV-TEA-500", category: "Beverages", unitPrice: 265.0, currentStock: 8, minStockAlert: 40, location: "Rack D1" },
];

const customers = [
  { name: "Ramesh Gupta", mobile: "9876543210", email: "ramesh@guptastores.com", businessName: "Gupta General Stores", type: "RETAIL" as const, status: "ACTIVE" as const, address: "Benachity Market, Durgapur, WB", gstNumber: "19ABCDE1234F1Z5" },
  { name: "Sunita Traders", mobile: "9812345678", email: "orders@sunitatraders.in", businessName: "Sunita Traders Pvt Ltd", type: "WHOLESALE" as const, status: "ACTIVE" as const, address: "Burrabazar, Kolkata, WB" },
  { name: "Kailash Distributors", mobile: "9900112233", businessName: "Kailash Distribution Co", type: "DISTRIBUTOR" as const, status: "LEAD" as const, address: "Sector 5, Bidhannagar, WB" },
  { name: "Meena Kirana", mobile: "9765432100", businessName: "Meena Kirana Shop", type: "RETAIL" as const, status: "INACTIVE" as const, address: "City Centre, Durgapur, WB" },
];

async function main() {
  console.log("Seeding database...");

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const createdUsers = [];
  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, passwordHash },
      create: { ...u, passwordHash },
    });
    createdUsers.push(user);
    console.log(`  user: ${user.email} (${user.role})`);
  }

  const admin = createdUsers.find((u) => u.role === "ADMIN")!;
  const salesUser = createdUsers.find((u) => u.role === "SALES")!;

  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: p,
    });
    const hasMovement = await prisma.stockMovement.count({ where: { productId: product.id } });
    if (hasMovement === 0 && product.currentStock > 0) {
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          quantity: product.currentStock,
          type: "IN",
          reason: "Opening stock",
          createdById: admin.id,
        },
      });
    }
    console.log(`  product: ${product.sku}`);
  }

  for (const c of customers) {
    const existing = await prisma.customer.findFirst({ where: { mobile: c.mobile } });
    if (!existing) {
      const customer = await prisma.customer.create({
        data: { ...c, createdById: salesUser.id },
      });
      await prisma.followUp.create({
        data: {
          customerId: customer.id,
          note: "Initial call made. Shared the current price list.",
          createdById: salesUser.id,
        },
      });
      console.log(`  customer: ${customer.name}`);
    }
  }

  console.log(`\nDone. All demo accounts use the password: ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
