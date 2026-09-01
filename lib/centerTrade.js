import { prisma } from "./prisma";

export async function getCenterTradeActor(sessionId, adminCenterId = null) {
  if (!sessionId) return null;
  const user = await prisma.user.findUnique({
    where: { id: sessionId },
    select: { id: true, role: true, centerId: true },
  });
  if (user?.role === "CENTER" && user.centerId) return user;
  if (user?.role === "ADMIN" && adminCenterId) {
    const center = await prisma.center.findUnique({ where: { id: adminCenterId }, select: { id: true } });
    return center ? { ...user, centerId: center.id } : null;
  }
  return null;
}

export const centerTradeInclude = {
  listing: {
    include: {
      center: { select: { id: true, name: true, district: true, state: true, phone: true } },
    },
  },
  buyerCenter: { select: { id: true, name: true, district: true, state: true, phone: true } },
  sellerCenter: { select: { id: true, name: true, district: true, state: true, phone: true } },
};
