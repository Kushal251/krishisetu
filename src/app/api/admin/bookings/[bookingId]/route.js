import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../../../../lib/prisma";
import { verifyToken } from "../../../../../../lib/jwt";

const number = (value) => Number(value);
const nonNegative = (value) => Number.isFinite(number(value)) && number(value) >= 0;

export async function PATCH(request, { params }) {
  try {
    const session = verifyToken((await cookies()).get("token")?.value);
    const admin = session?.id && await prisma.user.findUnique({ where: { id: session.id }, select: { id: true, role: true } });
    if (admin?.role !== "ADMIN") return NextResponse.json({ message: "Admin access required." }, { status: 403 });

    const { bookingId } = await params;
    const body = await request.json();
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { seller: { select: { sellerType: true, userId: true } }, center: { select: { cropPrices: { where: { crop: "SOYBEAN" }, select: { price: true } } } }, inspection: true },
    });
    if (!booking) return NextResponse.json({ message: "Booking not found." }, { status: 404 });
    if (["COMPLETED", "CANCELLED", "NO_SHOW"].includes(booking.status)) return NextResponse.json({ message: "This booking can no longer be changed." }, { status: 400 });

    if (body.action === "MARK_ARRIVED") {
      if (booking.status !== "BOOKED") return NextResponse.json({ message: "Only booked sellers can be marked arrived." }, { status: 400 });
      const updated = await prisma.booking.update({ where: { id: bookingId }, data: { status: "ARRIVED" } });
      await prisma.notification.create({ data: { userId: booking.seller.userId, title: "Arrival recorded", message: "Your arrival has been recorded. Quality testing will begin shortly." } });
      return NextResponse.json({ booking: updated });
    }

    if (body.action === "START_TESTING") {
      if (!["ARRIVED", "GRADED"].includes(booking.status)) return NextResponse.json({ message: "Mark seller arrived before starting testing." }, { status: 400 });
      const updated = await prisma.booking.update({ where: { id: bookingId }, data: { status: "INSPECTION" } });
      await prisma.notification.create({ data: { userId: booking.seller.userId, title: "Quality testing started", message: "Your soybean sample is now under quality testing." } });
      return NextResponse.json({ booking: updated });
    }

    if (body.action !== "PUBLISH_GRADE") return NextResponse.json({ message: "Choose a valid booking action." }, { status: 400 });
    if (booking.status !== "INSPECTION") return NextResponse.json({ message: "Start testing before publishing a grade." }, { status: 400 });
    const requiredNumbers = [body.moisture, body.brokenGrain, body.foreignMatter, body.basePrice, body.gradePrice, body.storageCharge, body.labourCharge, body.otherCharge, body.bonus];
    if (!["A", "B", "C"].includes(body.grade) || requiredNumbers.some((value) => !nonNegative(value)) || number(body.basePrice) <= 0 || number(body.gradePrice) <= 0)
      return NextResponse.json({ message: "Enter a grade, positive prices, and valid testing/charge values." }, { status: 400 });
    if (booking.seller.sellerType !== "FARMER" && number(body.bonus) > 0)
      return NextResponse.json({ message: "Only farmer sellers can receive a bonus." }, { status: 400 });

    const inspectionData = {
      moisture: number(body.moisture), brokenGrain: number(body.brokenGrain), foreignMatter: number(body.foreignMatter), aiScore: body.aiScore === "" || body.aiScore == null ? null : number(body.aiScore), grade: body.grade,
      basePrice: number(body.basePrice), gradePrice: number(body.gradePrice), storageCharge: number(body.storageCharge), labourCharge: number(body.labourCharge), otherCharge: number(body.otherCharge), bonus: number(body.bonus),
      bonusReason: typeof body.bonusReason === "string" ? body.bonusReason.trim().slice(0, 500) || null : null,
      suggestion: typeof body.suggestion === "string" ? body.suggestion.trim().slice(0, 1000) || null : null,
      sellerDecision: "PENDING", sellerDecisionAt: null, finalizedAt: null, inspectorId: admin.id,
    };
    await prisma.$transaction([
      prisma.qualityInspection.upsert({ where: { bookingId }, create: { bookingId, ...inspectionData }, update: inspectionData }),
      prisma.booking.update({ where: { id: bookingId }, data: { status: "GRADED" } }),
      prisma.notification.create({ data: { userId: booking.seller.userId, title: "Grade and offer ready", message: "Your soybean test result and settlement offer are ready to review." } }),
    ]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin booking update failed", error);
    return NextResponse.json({ message: "Could not update booking." }, { status: 500 });
  }
}
