export const MP_STATE = "Madhya Pradesh";

export const MP_LOCATIONS = [
  {
    division: "Indore",
    districts: [
      { district: "Indore", villages: [{ village: "Depalpur", pinCode: "453115" }, { village: "Sanwer", pinCode: "453551" }, { village: "Mhow", pinCode: "453441" }] },
      { district: "Dhar", villages: [{ village: "Badnawar", pinCode: "454660" }, { village: "Manawar", pinCode: "454446" }, { village: "Dharampuri", pinCode: "454449" }] },
      { district: "Khargone", villages: [{ village: "Sanawad", pinCode: "451111" }, { village: "Maheshwar", pinCode: "451224" }, { village: "Kasrawad", pinCode: "451228" }] },
    ],
  },
  {
    division: "Ujjain",
    districts: [
      { district: "Ujjain", villages: [{ village: "Nagda", pinCode: "456335" }, { village: "Mahidpur", pinCode: "456443" }, { village: "Tarana", pinCode: "456665" }] },
      { district: "Dewas", villages: [{ village: "Sonkatch", pinCode: "455118" }, { village: "Bagli", pinCode: "455227" }, { village: "Kannod", pinCode: "455332" }] },
      { district: "Shajapur", villages: [{ village: "Shujalpur", pinCode: "465333" }, { village: "Akodia", pinCode: "465223" }, { village: "Kalapipal", pinCode: "465337" }] },
    ],
  },
  {
    division: "Bhopal",
    districts: [
      { district: "Bhopal", villages: [{ village: "Berasia", pinCode: "463106" }, { village: "Bairagarh", pinCode: "462030" }, { village: "Misrod", pinCode: "462026" }] },
      { district: "Sehore", villages: [{ village: "Ashta", pinCode: "466116" }, { village: "Ichhawar", pinCode: "466115" }, { village: "Budni", pinCode: "466445" }] },
      { district: "Raisen", villages: [{ village: "Begumganj", pinCode: "464881" }, { village: "Gairatganj", pinCode: "464884" }, { village: "Obedullaganj", pinCode: "464993" }] },
    ],
  },
  {
    division: "Narmadapuram",
    districts: [
      { district: "Narmadapuram", villages: [{ village: "Itarsi", pinCode: "461111" }, { village: "Pipariya", pinCode: "461775" }, { village: "Seoni Malwa", pinCode: "461223" }] },
      { district: "Betul", villages: [{ village: "Amla", pinCode: "460551" }, { village: "Multai", pinCode: "460661" }, { village: "Chicholi", pinCode: "460330" }] },
      { district: "Harda", villages: [{ village: "Harda", pinCode: "461331" }, { village: "Timarni", pinCode: "461228" }, { village: "Khirkiya", pinCode: "461441" }] },
    ],
  },
];

const same = (left, right) => String(left || "").trim().toLowerCase() === String(right || "").trim().toLowerCase();

export function districtsFor(division) {
  return MP_LOCATIONS.find((item) => same(item.division, division))?.districts || [];
}

export function villagesFor(division, district) {
  return districtsFor(division).find((item) => same(item.district, district))?.villages || [];
}

export function resolveMpLocation({ state, division, district, village } = {}) {
  if (!same(state, MP_STATE)) return null;
  const divisionEntry = MP_LOCATIONS.find((item) => same(item.division, division));
  const districtEntry = divisionEntry?.districts.find((item) => same(item.district, district));
  const villageEntry = districtEntry?.villages.find((item) => same(item.village, village));
  if (!divisionEntry || !districtEntry || !villageEntry) return null;
  return { state: MP_STATE, division: divisionEntry.division, district: districtEntry.district, village: villageEntry.village, pinCode: villageEntry.pinCode };
}
