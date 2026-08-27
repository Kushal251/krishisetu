import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { verifyToken } from "./jwt";

export const cropOptions = ["Wheat", "Rice", "Maize", "Mustard", "Gram", "Soybean", "Cotton", "Bajra", "Jowar", "Potato", "Onion", "Tomato", "Sugarcane", "Other"];

export async function getVerifiedFarmer() {
  const userId = verifyToken((await cookies()).get("token")?.value);
  if (!userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, seller: { select: { id: true, sellerType: true, verificationStatus: true, village: true, district: true, state: true, farmer: { select: { id: true, landArea: true, landUnit: true } } } } },
  });
  if (user?.seller?.sellerType !== "FARMER" || user.seller.verificationStatus !== "VERIFIED" || !user.seller.farmer) return null;
  return user;
}

export async function getActiveSeason() {
  return prisma.season.findFirst({ where: { status: "ACTIVE" }, orderBy: { startDate: "desc" } });
}

export const inAcres = (area, unit) => Number(area) * (unit === "HECTARE" || unit === "Hectare" ? 2.47105 : 1);
export const canEditRegistration = (status) => status === "DRAFT" || status === "REJECTED";

export async function getOrCreateCurrentRegistration() {
  const farmerUser = await getVerifiedFarmer();
  if (!farmerUser) return { error: "Only verified farmer profiles can use seasonal crop registration.", status: 403 };
  const season = await getActiveSeason();
  if (!season) return { farmerUser, season: null, registration: null };
  const registration = await prisma.seasonRegistration.upsert({
    where: { farmerId_seasonId: { farmerId: farmerUser.seller.farmer.id, seasonId: season.id } },
    update: {},
    create: { farmerId: farmerUser.seller.farmer.id, seasonId: season.id },
    include: { season: true, crops: { orderBy: { createdAt: "asc" } } },
  });
  return { farmerUser, season, registration };
}
