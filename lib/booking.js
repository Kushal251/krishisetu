import { prisma } from "./prisma";

export async function markMissedBookings() {
  await prisma.booking.updateMany({
    where: {
      status: "BOOKED",
      slotEnd: { lt: new Date() },
    },
    data: { status: "NO_SHOW" },
  });
}

export function settlementTotals(booking) {
  const inspection = booking.inspection;
  if (!inspection) return null;
  const quantity = Number(booking.quantity);
  const grossAmount = quantity * Number(inspection.gradePrice);
  const charges = Number(inspection.storageCharge) + Number(inspection.labourCharge) + Number(inspection.otherCharge);
  const bonus = Number(inspection.bonus);
  return { grossAmount, charges, bonus, finalAmount: grossAmount - charges + bonus };
}
