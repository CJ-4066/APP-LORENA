import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  await prisma.courseResource.deleteMany({});
  await prisma.courseLesson.deleteMany({});
  await prisma.courseModule.deleteMany({});
  await prisma.course.deleteMany({});
  console.log("Deleted old courses.");
}
run().finally(() => process.exit(0));
