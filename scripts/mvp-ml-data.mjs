import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = path.join(ROOT, "temp", "ml-training");
const SCENARIO_FILE = path.join(DATA_DIR, "scenario.json");
const STATE_FILE = path.join(DATA_DIR, "state.json");
const TRAINING_FILE = path.join(DATA_DIR, "training", "krishisetu_training.csv");
const prisma = new PrismaClient();

const SELLER_TYPES = ["FARMER", "FPO", "TRADER", "COOPERATIVE"];
const BUYER_TYPES = ["PROCESSOR", "WHOLESALER", "RETAILER", "EXPORTER"];
const CROPS = ["WHEAT", "RICE", "MAIZE", "SOYBEAN", "COTTON", "PULSES", "OTHER"];
const SEASONS = ["KHARIF", "RABI", "ZAID"];
const LOCATIONS = [
  ["Indore", "Indore", "Depalpur", "453115", 22.850, 75.542],
  ["Indore", "Dhar", "Badnawar", "454660", 23.021, 75.232],
  ["Indore", "Khargone", "Sanawad", "451111", 22.173, 76.070],
  ["Ujjain", "Ujjain", "Nagda", "456335", 23.456, 75.418],
  ["Ujjain", "Dewas", "Sonkatch", "455118", 22.971, 76.347],
  ["Ujjain", "Shajapur", "Shujalpur", "465333", 23.406, 76.710],
  ["Bhopal", "Bhopal", "Berasia", "463106", 23.632, 77.434],
  ["Bhopal", "Sehore", "Ashta", "466116", 23.017, 76.722],
  ["Bhopal", "Raisen", "Begumganj", "464881", 23.601, 78.340],
  ["Narmadapuram", "Narmadapuram", "Itarsi", "461111", 22.614, 77.762],
];

const pad = (value, width = 3) => String(value).padStart(width, "0");
const iso = (date) => new Date(date).toISOString();
const hourFloor = (date) => new Date(Math.floor(new Date(date).getTime() / 3_600_000) * 3_600_000);
const addHours = (date, hours) => new Date(new Date(date).getTime() + hours * 3_600_000);
const addDays = (date, days) => addHours(date, days * 24);
const addYears = (date, years) => {
  const result = new Date(date);
  result.setUTCFullYear(result.getUTCFullYear() + years);
  return result;
};

function randomFactory(seed = 20260902) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4_294_967_296;
  };
}

const pick = (values, random) => values[Math.floor(random() * values.length)];
const between = (minimum, maximum, random, digits = 2) => Number((minimum + random() * (maximum - minimum)).toFixed(digits));
const eventDate = (start, end, random) => new Date(new Date(start).getTime() + random() * (new Date(end).getTime() - new Date(start).getTime()));
const locationObject = ([division, district, village, pinCode]) => ({ state: "Madhya Pradesh", division, district, village, pinCode });

function seasonDates(year, name) {
  if (name === "KHARIF") return [new Date(Date.UTC(year, 5, 15)), new Date(Date.UTC(year, 10, 30, 23, 59, 59))];
  if (name === "RABI") return [new Date(Date.UTC(year, 9, 15)), new Date(Date.UTC(year + 1, 2, 31, 23, 59, 59))];
  return [new Date(Date.UTC(year, 2, 1)), new Date(Date.UTC(year, 5, 15, 23, 59, 59))];
}

function seasonCrops(name) {
  if (name === "KHARIF") return ["SOYBEAN", "RICE", "MAIZE", "COTTON", "PULSES"];
  if (name === "RABI") return ["WHEAT", "PULSES", "MAIZE"];
  return ["MAIZE", "PULSES", "OTHER"];
}

function makeScenario(anchorInput = new Date()) {
  const anchor = hourFloor(anchorInput);
  const random = randomFactory();
  const passwordHash = bcrypt.hashSync("Mvp@12345", 10);
  const centers = LOCATIONS.map((location, index) => ({
    id: `sim_center_${pad(index + 1)}`,
    code: `SIM-MP-${pad(index + 1, 2)}`,
    name: `${location[2]} KrishiSetu Simulation Center`,
    ...locationObject(location),
    address: `${location[2]} Mandi Road, ${location[1]}, Madhya Pradesh`,
    latitude: location[4], longitude: location[5], phone: `7800000${pad(index + 1, 3)}`,
    email: `sim-center-${index + 1}@krishisetu.test`, totalCapacity: 25000 + index * 1500,
    usedCapacity: 2500 + index * 180, status: "ACTIVE", createdAt: iso(addYears(anchor, -3)),
    operatorUserId: `sim_center_user_${pad(index + 1)}`,
  }));

  const sellers = [];
  SELLER_TYPES.forEach((sellerType, typeIndex) => {
    for (let number = 1; number <= 50; number += 1) {
      const serial = typeIndex * 50 + number;
      const location = LOCATIONS[(serial - 1) % LOCATIONS.length];
      sellers.push({
        id: `sim_seller_${sellerType.toLowerCase()}_${pad(number)}`,
        userId: `sim_seller_user_${sellerType.toLowerCase()}_${pad(number)}`,
        name: `MVP ${sellerType} ${pad(number)}`, phone: `7100${pad(serial, 6)}`,
        email: `sim-${sellerType.toLowerCase()}-${number}@krishisetu.test`, passwordHash, sellerType,
        ...locationObject(location), address: `${location[2]} Farm Road, ${location[1]}`,
        bankAccount: `SIMBANK${pad(serial, 10)}`, ifscCode: "SBIN0001234",
        landArea: sellerType === "FARMER" ? between(2, 25, random) : null,
        registrationNo: sellerType === "FPO" ? `SIMFPO${pad(number, 6)}` : null,
      });
    }
  });

  const buyers = [];
  BUYER_TYPES.forEach((buyerType, typeIndex) => {
    for (let number = 1; number <= 50; number += 1) {
      const serial = typeIndex * 50 + number;
      const location = LOCATIONS[(serial + 3) % LOCATIONS.length];
      buyers.push({
        id: `sim_buyer_${buyerType.toLowerCase()}_${pad(number)}`,
        userId: `sim_buyer_user_${buyerType.toLowerCase()}_${pad(number)}`,
        name: `MVP ${buyerType} Buyer ${pad(number)}`, phone: `7200${pad(serial, 6)}`,
        email: `sim-buyer-${buyerType.toLowerCase()}-${number}@krishisetu.test`, passwordHash, buyerType,
        businessName: `MVP ${buyerType} Business ${pad(number)}`, gstin: `23SIM${pad(serial, 8)}Z1`,
        panNumber: `SIMP${pad(serial, 5)}A`, ...locationObject(location),
        address: `${location[2]} Market Road, ${location[1]}`,
      });
    }
  });

  const startYear = anchor.getUTCFullYear() - 3;
  const endYear = anchor.getUTCFullYear() + 3;
  const seasons = [];
  for (let year = startYear; year <= endYear; year += 1) {
    SEASONS.forEach((name) => {
      const [startDate, endDate] = seasonDates(year, name);
      seasons.push({
        id: `sim_season_${name.toLowerCase()}_${year}`, name, year: String(year),
        startDate: iso(startDate), endDate: iso(endDate),
        status: endDate < anchor ? "CLOSED" : startDate <= anchor ? "ACTIVE" : "UPCOMING",
        createdAt: iso(addDays(startDate, -120)),
      });
    });
  }

  const listings = centers.flatMap((center, centerIndex) => CROPS.map((crop, cropIndex) => ({
    id: `sim_listing_${pad(centerIndex + 1)}_${crop.toLowerCase()}`, centerId: center.id, crop,
    grade: ["A", "B", "C"][cropIndex % 3], availableQty: 6000 + cropIndex * 400,
    reservedQty: 0, costPrice: 2600 + cropIndex * 210, pricePerQuintal: 2850 + cropIndex * 230 + centerIndex * 17,
    storageCharge: 35, handlingCharge: 25, gstRate: crop === "SOYBEAN" ? 5 : 0,
    availableUntil: iso(addYears(anchor, 3)), pickupStart: iso(addYears(anchor, -3)),
    pickupEnd: iso(addYears(anchor, 3)), createdAt: iso(addYears(anchor, -3)),
  })));

  const historicalEvents = [];
  const futureEvents = [];
  const addEvent = (event) => (new Date(event.scheduledAt) <= anchor ? historicalEvents : futureEvents).push(event);

  const farmers = sellers.filter((seller) => seller.sellerType === "FARMER");
  farmers.forEach((seller, farmerIndex) => seasons.forEach((season, seasonIndex) => {
    const crops = seasonCrops(season.name);
    const crop = crops[(farmerIndex + seasonIndex) % crops.length];
    const start = new Date(season.startDate);
    const end = new Date(season.endDate);
    const sowingDate = addDays(start, Math.floor(random() * 24));
    const harvestDate = addDays(end, -Math.floor(10 + random() * 35));
    const registrationId = `sim_registration_${seller.id}_${season.id}`;
    addEvent({
      id: `sim_event_declaration_${seller.id}_${season.id}`, type: "SEASON_DECLARATION",
      scheduledAt: iso(addDays(start, -45)), registration: {
        id: registrationId, farmerId: `sim_farmer_${seller.id}`, seasonId: season.id,
        status: "VERIFIED", submittedAt: iso(addDays(start, -45)), verifiedAt: iso(addDays(start, -43)),
        remarks: "Synthetic MVP seasonal declaration", createdAt: iso(addDays(start, -50)),
      }, declaration: {
        id: `sim_declaration_${seller.id}_${season.id}`, registrationId, cropName: crop,
        variety: crop === "SOYBEAN" ? "JS 95-60" : "MVP standard variety", area: between(1, seller.landArea, random),
        unit: "ACRE", sowingDate: iso(sowingDate), irrigation: pick(["RAINFED", "CANAL", "BOREWELL"], random),
        seedSource: "Certified seed", expectedHarvestDate: iso(harvestDate), createdAt: iso(addDays(start, -50)),
      },
    });
  }));

  for (let year = startYear; year <= endYear; year += 1) {
    const yearStart = new Date(Date.UTC(year, 0, 1));
    const yearEnd = new Date(Date.UTC(year, 11, 31, 23, 59));
    sellers.forEach((seller, sellerIndex) => {
      const center = centers[sellerIndex % centers.length];
      const crop = CROPS[(sellerIndex + year) % CROPS.length];
      const scheduledAt = eventDate(yearStart, yearEnd, random);
      const bookingId = `sim_booking_${seller.id}_${year}`;
      const quantity = between(seller.sellerType === "FARMER" ? 12 : 80, seller.sellerType === "FARMER" ? 180 : 650, random);
      const completed = scheduledAt <= anchor;
      addEvent({
        id: `sim_event_booking_${seller.id}_${year}`, type: "BOOKING", scheduledAt: iso(scheduledAt),
        booking: { id: bookingId, sellerId: seller.id, centerId: center.id, crop, quantity,
          slotStart: iso(scheduledAt), slotEnd: iso(addHours(scheduledAt, 2)), status: completed ? "COMPLETED" : "BOOKED", createdAt: iso(addDays(scheduledAt, -7)) },
        inspection: completed ? { id: `sim_inspection_${bookingId}`, bookingId, moisture: between(8, 15, random),
          brokenGrain: between(0.5, 5, random), foreignMatter: between(0.1, 2, random), aiScore: between(72, 98, random),
          grade: pick(["A", "B", "B", "C"], random), basePrice: 2800 + CROPS.indexOf(crop) * 225,
          gradePrice: 2700 + CROPS.indexOf(crop) * 230, storageCharge: 25, labourCharge: 20,
          sellerDecision: "ACCEPTED", sellerDecisionAt: iso(addHours(scheduledAt, 3)), centerDecision: "ACCEPTED",
          centerDecisionAt: iso(addHours(scheduledAt, 3)), finalizedAt: iso(addHours(scheduledAt, 4)), inspectorId: center.operatorUserId,
          createdAt: iso(addHours(scheduledAt, 2)) } : null,
      });
    });

    buyers.forEach((buyer, buyerIndex) => {
      const centerIndex = (buyerIndex + year) % centers.length;
      const crop = CROPS[(buyerIndex + year * 2) % CROPS.length];
      const listing = listings.find((item) => item.centerId === centers[centerIndex].id && item.crop === crop);
      const scheduledAt = eventDate(yearStart, yearEnd, random);
      const quantity = between(20, buyer.buyerType === "RETAILER" ? 120 : 500, random);
      const paid = scheduledAt <= anchor;
      addEvent({
        id: `sim_event_order_${buyer.id}_${year}`, type: "BUYER_ORDER", scheduledAt: iso(scheduledAt),
        order: { id: `sim_order_${buyer.id}_${year}`, buyerId: buyer.id, listingId: listing.id,
          requestedQty: quantity, finalQty: paid ? quantity : null, buyerProposedPrice: listing.pricePerQuintal - 35,
          buyerNegotiationNote: "Synthetic MVP demand event", physicalCheckApprovedAt: paid ? iso(addHours(scheduledAt, 5)) : null,
          deliveryAddress: buyer.address, status: paid ? "PAID" : "ORDERED", paymentConfirmedAt: paid ? iso(addHours(scheduledAt, 8)) : null,
          createdAt: iso(scheduledAt) },
      });
    });

    for (let index = 0; index < 40; index += 1) {
      const sellerCenter = centers[index % centers.length];
      const buyerCenter = centers[(index + 3 + year) % centers.length];
      if (sellerCenter.id === buyerCenter.id) continue;
      const crop = CROPS[(index + year) % CROPS.length];
      const listing = listings.find((item) => item.centerId === sellerCenter.id && item.crop === crop);
      const scheduledAt = eventDate(yearStart, yearEnd, random);
      const paid = scheduledAt <= anchor;
      addEvent({
        id: `sim_event_center_trade_${year}_${pad(index + 1)}`, type: "CENTER_TRADE", scheduledAt: iso(scheduledAt),
        trade: { id: `sim_center_trade_${year}_${pad(index + 1)}`, buyerCenterId: buyerCenter.id,
          sellerCenterId: sellerCenter.id, listingId: listing.id, requestedQty: between(50, 400, random),
          finalQty: paid ? between(50, 350, random) : null, proposedPrice: listing.pricePerQuintal - 25,
          negotiationNote: "Synthetic center balancing trade", status: paid ? "PAID" : "ORDERED",
          settledAt: paid ? iso(addHours(scheduledAt, 10)) : null, createdAt: iso(scheduledAt) },
      });
    }
  }

  historicalEvents.sort((left, right) => left.scheduledAt.localeCompare(right.scheduledAt));
  futureEvents.sort((left, right) => left.scheduledAt.localeCompare(right.scheduledAt));
  return {
    schemaVersion: 1, generatedAt: iso(new Date()), anchor: iso(anchor), rangeStart: iso(addYears(anchor, -3)),
    rangeEnd: iso(addYears(anchor, 3)), synthetic: true,
    warning: "Synthetic MVP scenario. Never present these records as observed real-world outcomes.",
    passwordForSimulationAccounts: "Mvp@12345", centers, sellers, buyers, seasons, listings,
    historicalEvents, futureEvents,
  };
}

async function readJson(file) { return JSON.parse(await readFile(file, "utf8")); }
async function writeJson(file, value) { await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8"); }
async function ensureScenario(force = false) {
  if (!force) {
    try { return await readJson(SCENARIO_FILE); } catch { /* generate below */ }
  }
  const scenario = makeScenario();
  await writeJson(SCENARIO_FILE, scenario);
  await writeJson(STATE_FILE, { schemaVersion: 1, simulatedAt: scenario.anchor, nextEventIndex: 0, lastTrainingAt: null, lastTickAt: null });
  return scenario;
}

async function createMany(model, data, batchSize = 500) {
  let inserted = 0;
  for (let index = 0; index < data.length; index += batchSize) {
    const result = await model.createMany({ data: data.slice(index, index + batchSize), skipDuplicates: true });
    inserted += result.count;
  }
  return inserted;
}

async function seedEntities(scenario) {
  await createMany(prisma.center, scenario.centers.map(({ operatorUserId, ...center }) => ({ ...center, createdAt: new Date(center.createdAt) })));
  const sellerUsers = scenario.sellers.map((seller) => ({ id: seller.userId, name: seller.name, phone: seller.phone, email: seller.email,
    password: seller.passwordHash, role: "SELLER", phoneVerified: true, emailVerified: true, createdAt: new Date(scenario.rangeStart) }));
  const buyerUsers = scenario.buyers.map((buyer) => ({ id: buyer.userId, name: buyer.name, phone: buyer.phone, email: buyer.email,
    password: buyer.passwordHash, role: "BUYER", phoneVerified: true, emailVerified: true, createdAt: new Date(scenario.rangeStart) }));
  await createMany(prisma.user, [...sellerUsers, ...buyerUsers]);
  await createMany(prisma.seller, scenario.sellers.map((seller) => ({ id: seller.id, userId: seller.userId, sellerType: seller.sellerType,
    state: seller.state, division: seller.division, district: seller.district, village: seller.village, pinCode: seller.pinCode,
    address: seller.address, bankAccount: seller.bankAccount, ifscCode: seller.ifscCode, verificationStatus: "VERIFIED" })));
  await createMany(prisma.buyer, scenario.buyers.map((buyer) => ({ id: buyer.id, userId: buyer.userId, buyerType: buyer.buyerType,
    businessName: buyer.businessName, gstin: buyer.gstin, panNumber: buyer.panNumber, address: buyer.address,
    state: buyer.state, division: buyer.division, district: buyer.district, village: buyer.village, pinCode: buyer.pinCode,
    verificationStatus: "VERIFIED" })));
  await createMany(prisma.farmerProfile, scenario.sellers.filter((seller) => seller.sellerType === "FARMER").map((seller) => ({
    id: `sim_farmer_${seller.id}`, sellerId: seller.id, landArea: seller.landArea, landUnit: "ACRE",
    khasraNumber: `SIM-KHASRA-${seller.id.slice(-3)}`, pmKisanId: `SIM-PM-${seller.id.slice(-3)}` })));
  await createMany(prisma.fPOProfile, scenario.sellers.filter((seller) => seller.sellerType === "FPO").map((seller) => ({
    id: `sim_fpo_${seller.id}`, sellerId: seller.id, organizationName: seller.name, registrationNo: seller.registrationNo, memberCount: 75 })));
  await createMany(prisma.user, scenario.centers.map((center, index) => ({ id: center.operatorUserId,
    name: `MVP Center Operator ${index + 1}`, phone: `7300000${pad(index + 1, 3)}`, email: `sim-operator-${index + 1}@krishisetu.test`,
    password: scenario.sellers[0].passwordHash, role: "CENTER", centerId: center.id, phoneVerified: true, emailVerified: true,
    createdAt: new Date(scenario.rangeStart) })));
  const seasonIdMap = new Map();
  for (const season of scenario.seasons) {
    const stored = await prisma.season.upsert({
      where: { name_year: { name: season.name, year: season.year } },
      create: { ...season, startDate: new Date(season.startDate), endDate: new Date(season.endDate), createdAt: new Date(season.createdAt) },
      update: {}, select: { id: true },
    });
    seasonIdMap.set(season.id, stored.id);
  }
  await createMany(prisma.centerListing, scenario.listings.map((listing) => ({ ...listing, availableUntil: new Date(listing.availableUntil),
    pickupStart: new Date(listing.pickupStart), pickupEnd: new Date(listing.pickupEnd), createdAt: new Date(listing.createdAt) })));
  await createMany(prisma.cropPrice, scenario.listings.filter((listing) => listing.crop === "SOYBEAN").map((listing) => ({
    id: `sim_crop_price_${listing.centerId}`, centerId: listing.centerId, crop: "SOYBEAN", price: listing.pricePerQuintal, unit: "quintal" })));
  return seasonIdMap;
}

async function insertEvents(events, seasonIdMap = new Map()) {
  const declarations = events.filter((event) => event.type === "SEASON_DECLARATION");
  const bookings = events.filter((event) => event.type === "BOOKING");
  const orders = events.filter((event) => event.type === "BUYER_ORDER");
  const trades = events.filter((event) => event.type === "CENTER_TRADE");
  await createMany(prisma.seasonRegistration, declarations.map(({ registration }) => ({ ...registration,
    seasonId: seasonIdMap.get(registration.seasonId) || registration.seasonId,
    submittedAt: new Date(registration.submittedAt), verifiedAt: new Date(registration.verifiedAt), createdAt: new Date(registration.createdAt) })));
  await createMany(prisma.cropDeclaration, declarations.map(({ declaration }) => ({ ...declaration,
    sowingDate: new Date(declaration.sowingDate), expectedHarvestDate: new Date(declaration.expectedHarvestDate), createdAt: new Date(declaration.createdAt) })));
  await createMany(prisma.booking, bookings.map(({ booking }) => ({ ...booking, slotStart: new Date(booking.slotStart),
    slotEnd: new Date(booking.slotEnd), createdAt: new Date(booking.createdAt) })));
  await createMany(prisma.qualityInspection, bookings.filter((event) => event.inspection).map(({ inspection }) => ({ ...inspection,
    sellerDecisionAt: new Date(inspection.sellerDecisionAt), centerDecisionAt: new Date(inspection.centerDecisionAt),
    finalizedAt: new Date(inspection.finalizedAt), createdAt: new Date(inspection.createdAt) })));
  await createMany(prisma.buyerOrder, orders.map(({ order }) => ({ ...order,
    physicalCheckApprovedAt: order.physicalCheckApprovedAt ? new Date(order.physicalCheckApprovedAt) : null,
    paymentConfirmedAt: order.paymentConfirmedAt ? new Date(order.paymentConfirmedAt) : null, createdAt: new Date(order.createdAt) })));
  await createMany(prisma.centerTradeOrder, trades.map(({ trade }) => ({ ...trade,
    settledAt: trade.settledAt ? new Date(trade.settledAt) : null, createdAt: new Date(trade.createdAt) })));
  return { declarations: declarations.length, bookings: bookings.length, buyerOrders: orders.length, centerTrades: trades.length };
}

async function seedHistory() {
  const scenario = await ensureScenario();
  const seasonIdMap = await seedEntities(scenario);
  const counts = await insertEvents(scenario.historicalEvents, seasonIdMap);
  return { anchor: scenario.anchor, entities: { sellers: scenario.sellers.length, buyers: scenario.buyers.length,
    centers: scenario.centers.length, seasons: scenario.seasons.length }, historical: counts, futureQueued: scenario.futureEvents.length };
}

async function tick(hours = 1) {
  const scenario = await ensureScenario();
  const seasonIdMap = await seedEntities(scenario);
  let state;
  try { state = await readJson(STATE_FILE); } catch { state = { simulatedAt: scenario.anchor, nextEventIndex: 0 }; }
  const simulatedAt = addHours(state.simulatedAt, hours);
  let endIndex = state.nextEventIndex || 0;
  while (endIndex < scenario.futureEvents.length && new Date(scenario.futureEvents[endIndex].scheduledAt) <= simulatedAt) endIndex += 1;
  const dueEvents = scenario.futureEvents.slice(state.nextEventIndex || 0, endIndex);
  const inserted = await insertEvents(dueEvents, seasonIdMap);
  const hourKey = iso(hourFloor(simulatedAt)).replaceAll(/[-:.TZ]/g, "");
  const soybeanListings = scenario.listings.filter((listing) => listing.crop === "SOYBEAN");
  const priceRows = soybeanListings.map((listing, index) => ({ id: `sim_price_hour_${hourKey}_${pad(index + 1)}`,
    centerId: listing.centerId, crop: "SOYBEAN", price: Number((listing.pricePerQuintal * (1 + 0.025 * Math.sin(simulatedAt.getTime() / 604_800_000 + index))).toFixed(2)),
    unit: "quintal", source: "SYNTHETIC_HOURLY_SIMULATION", recordedAt: simulatedAt }));
  await createMany(prisma.cropPriceHistory, priceRows);
  for (const row of priceRows) {
    await prisma.cropPrice.upsert({ where: { centerId_crop: { centerId: row.centerId, crop: row.crop } },
      create: { centerId: row.centerId, crop: row.crop, price: row.price }, update: { price: row.price } });
  }
  const nextState = { ...state, simulatedAt: iso(simulatedAt), nextEventIndex: endIndex, lastTickAt: iso(new Date()) };
  await writeJson(STATE_FILE, nextState);
  return { simulatedAt: nextState.simulatedAt, released: inserted, hourlyPrices: priceRows.length,
    remainingFutureEvents: scenario.futureEvents.length - endIndex };
}

const monthKey = (date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1, 2)}`;
const seasonNameForMonth = (month) => month >= 6 && month <= 10 ? "Kharif" : month >= 11 || month <= 3 ? "Rabi" : "Zaid";
const weatherFor = (district, month) => {
  const monsoon = month >= 6 && month <= 9;
  const districtOffset = district.split("").reduce((sum, character) => sum + character.charCodeAt(0), 0) % 7;
  return { Weather: monsoon ? "Rainy" : month <= 2 || month >= 11 ? "Cool and dry" : "Hot and dry",
    rainfall_mm: monsoon ? 175 + districtOffset * 9 : 12 + districtOffset * 3,
    temperature_c: monsoon ? 27 + districtOffset * 0.2 : month <= 2 || month >= 11 ? 20 + districtOffset * 0.3 : 34 + districtOffset * 0.25 };
};

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

async function exportTraining(asOfInput) {
  const asOf = asOfInput ? new Date(asOfInput) : new Date();
  const from = addYears(asOf, -3);
  const [centers, bookings, orders, trades, prices, declarations, listings] = await Promise.all([
    prisma.center.findMany({ where: { status: "ACTIVE" }, select: { id: true, district: true } }),
    prisma.booking.findMany({ where: { crop: "SOYBEAN", createdAt: { gte: from, lte: asOf } }, select: { centerId: true, sellerId: true, quantity: true, createdAt: true } }),
    prisma.buyerOrder.findMany({ where: { createdAt: { gte: from, lte: asOf }, listing: { crop: "SOYBEAN" } },
      select: { buyerId: true, requestedQty: true, finalQty: true, createdAt: true, listing: { select: { centerId: true } } } }),
    prisma.centerTradeOrder.findMany({ where: { createdAt: { gte: from, lte: asOf }, listing: { crop: "SOYBEAN" } },
      select: { buyerCenterId: true, sellerCenterId: true, requestedQty: true, finalQty: true, createdAt: true } }),
    prisma.cropPriceHistory.findMany({ where: { crop: "SOYBEAN", recordedAt: { gte: from, lte: asOf } },
      select: { centerId: true, price: true, recordedAt: true, source: true } }),
    prisma.cropDeclaration.findMany({ where: { cropName: { equals: "SOYBEAN", mode: "insensitive" }, expectedHarvestDate: { gte: from, lte: asOf } },
      select: { area: true, unit: true, expectedHarvestDate: true, registration: { select: { farmer: { select: { seller: { select: { id: true, district: true } } } } } } } }),
    prisma.centerListing.findMany({ where: { crop: "SOYBEAN" }, select: { centerId: true, availableQty: true, pricePerQuintal: true } }),
  ]);
  if (!centers.length) throw new Error("No active centers found. Run seed-history first.");
  const centerByDistrict = new Map(centers.map((center) => [center.district, center.id]));
  const fallbackCenter = centers[0].id;
  const rowsByKey = new Map();
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
  while (cursor <= asOf) {
    centers.forEach((center) => rowsByKey.set(`${center.id}|${monthKey(cursor)}`, { centerId: center.id, district: center.district,
      event_date: iso(cursor).slice(0, 10), month: cursor.getUTCMonth() + 1, supply: 0, incoming: 0, demand: 0,
      priceSum: 0, priceCount: 0, stock: 0, realEvents: 0, totalEvents: 0 }));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  const rowFor = (centerId, date) => rowsByKey.get(`${centerId}|${monthKey(date)}`);
  bookings.forEach((booking) => { const row = rowFor(booking.centerId, booking.createdAt); if (!row) return;
    row.supply += Number(booking.quantity); row.totalEvents += 1; if (!booking.sellerId.startsWith("sim_")) row.realEvents += 1; });
  orders.forEach((order) => { const row = rowFor(order.listing.centerId, order.createdAt); if (!row) return;
    row.demand += Number(order.finalQty || order.requestedQty); row.totalEvents += 1; if (!order.buyerId.startsWith("sim_")) row.realEvents += 1; });
  trades.forEach((trade) => { const quantity = Number(trade.finalQty || trade.requestedQty); const buyerRow = rowFor(trade.buyerCenterId, trade.createdAt);
    const sellerRow = rowFor(trade.sellerCenterId, trade.createdAt); if (buyerRow) { buyerRow.incoming += quantity; buyerRow.totalEvents += 1; if (!trade.buyerCenterId.startsWith("sim_")) buyerRow.realEvents += 1; }
    if (sellerRow) { sellerRow.demand += quantity; sellerRow.totalEvents += 1; if (!trade.sellerCenterId.startsWith("sim_")) sellerRow.realEvents += 1; } });
  declarations.forEach((declaration) => { const seller = declaration.registration.farmer.seller; const centerId = centerByDistrict.get(seller.district) || fallbackCenter;
    const row = rowFor(centerId, declaration.expectedHarvestDate); if (!row) return; const acres = declaration.unit === "HECTARE" ? declaration.area * 2.471 : declaration.area;
    row.incoming += acres * 8.5; row.totalEvents += 1; if (!seller.id.startsWith("sim_")) row.realEvents += 1; });
  prices.forEach((price) => { const row = rowFor(price.centerId, price.recordedAt); if (!row) return; row.priceSum += Number(price.price); row.priceCount += 1;
    row.totalEvents += 1; if (!price.source.startsWith("SYNTHETIC")) row.realEvents += 1; });
  const listingByCenter = new Map(listings.map((listing) => [listing.centerId, listing]));
  const grouped = new Map(); centers.forEach((center) => grouped.set(center.id, []));
  [...rowsByKey.values()].forEach((row) => grouped.get(row.centerId).push(row));
  const outputRows = [];
  grouped.forEach((centerRows, centerId) => {
    centerRows.sort((left, right) => left.event_date.localeCompare(right.event_date));
    let previousDemand = centerRows[0]?.demand || 80; let previousPrice = Number(listingByCenter.get(centerId)?.pricePerQuintal || 4200);
    centerRows.forEach((row, index) => {
      const listing = listingByCenter.get(centerId); const fallbackPrice = Number(listing?.pricePerQuintal || 4200) * (1 + 0.02 * Math.sin(index / 3));
      const price = row.priceCount ? row.priceSum / row.priceCount : fallbackPrice; const weather = weatherFor(row.district, row.month);
      const demand = row.demand || Math.max(5, previousDemand * (0.82 + 0.08 * Math.sin(index)));
      const supply = row.supply || Math.max(5, row.incoming * 0.75); const realRatio = row.totalEvents ? row.realEvents / row.totalEvents : 0;
      outputRows.push({ event_date: row.event_date, data_origin: realRatio > 0 ? "BLENDED_KRISHISETU" : "SYNTHETIC_MVP",
        real_ratio: realRatio.toFixed(4), crop_name: "Soybean", district: row.district, month: row.month,
        Season: seasonNameForMonth(row.month), Weather: weather.Weather, quality_grade: "B",
        supply_kg: (supply * 100).toFixed(2), quantity_kg: (row.incoming * 100).toFixed(2),
        "Previous Demand": (previousDemand * 100).toFixed(2), "Previous Price": (previousPrice / 100).toFixed(2),
        Stock: (Number(listing?.availableQty || 0) * 100).toFixed(2), rainfall_mm: weather.rainfall_mm.toFixed(2),
        temperature_c: weather.temperature_c.toFixed(2), demand_kg: (demand * 100).toFixed(2), mandi_price_per_kg: (price / 100).toFixed(2) });
      previousDemand = demand; previousPrice = price;
    });
  });
  const headers = Object.keys(outputRows[0]);
  const csv = [headers.join(","), ...outputRows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))].join("\n");
  await mkdir(path.dirname(TRAINING_FILE), { recursive: true });
  await writeFile(TRAINING_FILE, `${csv}\n`, "utf8");
  return { output: TRAINING_FILE, asOf: iso(asOf), rows: outputRows.length,
    blendedRows: outputRows.filter((row) => row.data_origin === "BLENDED_KRISHISETU").length };
}

async function counts() {
  const [sellers, buyers, centers, seasons, registrations, bookings, orders, trades] = await Promise.all([
    prisma.seller.count({ where: { id: { startsWith: "sim_" } } }), prisma.buyer.count({ where: { id: { startsWith: "sim_" } } }),
    prisma.center.count({ where: { id: { startsWith: "sim_" } } }), prisma.season.count({ where: { id: { startsWith: "sim_" } } }),
    prisma.seasonRegistration.count({ where: { id: { startsWith: "sim_" } } }), prisma.booking.count({ where: { id: { startsWith: "sim_" } } }),
    prisma.buyerOrder.count({ where: { id: { startsWith: "sim_" } } }), prisma.centerTradeOrder.count({ where: { id: { startsWith: "sim_" } } }),
  ]);
  return { sellers, buyers, centers, seasons, registrations, bookings, buyerOrders: orders, centerTrades: trades };
}

async function main() {
  const [command = "help", ...args] = process.argv.slice(2);
  let result;
  if (command === "generate") { const scenario = await ensureScenario(args.includes("--force")); result = { scenario: SCENARIO_FILE,
    anchor: scenario.anchor, sellers: scenario.sellers.length, buyers: scenario.buyers.length, centers: scenario.centers.length,
    seasons: scenario.seasons.length, historicalEvents: scenario.historicalEvents.length, futureEvents: scenario.futureEvents.length }; }
  else if (command === "seed-history") result = await seedHistory();
  else if (command === "tick") { const index = args.indexOf("--hours"); result = await tick(index >= 0 ? Number(args[index + 1]) : 1); }
  else if (command === "export-training") { const index = args.indexOf("--as-of"); result = await exportTraining(index >= 0 ? args[index + 1] : undefined); }
  else if (command === "counts") result = await counts();
  else throw new Error("Usage: node scripts/mvp-ml-data.mjs <generate|seed-history|tick|export-training|counts> [--force] [--hours N] [--as-of ISO]");
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
