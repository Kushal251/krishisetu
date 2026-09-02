"use client";

import { MP_LOCATIONS, MP_STATE, districtsFor, villagesFor } from "../../lib/mpLocations";

const baseClass = "mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-100 disabled:bg-gray-100";

export function MPLocationFields({ value, onChange, className = baseClass }) {
  const districts = districtsFor(value.division);
  const villages = villagesFor(value.division, value.district);

  function selectDivision(division) {
    onChange({ ...value, state: MP_STATE, division, district: "", village: "", pinCode: "" });
  }

  function selectDistrict(district) {
    onChange({ ...value, state: MP_STATE, district, village: "", pinCode: "" });
  }

  function selectVillage(village) {
    const selected = villages.find((item) => item.village === village);
    onChange({ ...value, state: MP_STATE, village, pinCode: selected?.pinCode || "" });
  }

  return <>
    <LocationField label="State"><input name="state" value={MP_STATE} readOnly className={className} /></LocationField>
    <LocationField label="Sambhag"><select name="division" required value={value.division} onChange={(event) => selectDivision(event.target.value)} className={className}><option value="">Select sambhag</option>{MP_LOCATIONS.map((item) => <option key={item.division} value={item.division}>{item.division}</option>)}</select></LocationField>
    <LocationField label="District"><select name="district" required disabled={!value.division} value={value.district} onChange={(event) => selectDistrict(event.target.value)} className={className}><option value="">Select district</option>{districts.map((item) => <option key={item.district} value={item.district}>{item.district}</option>)}</select></LocationField>
    <LocationField label="Village / locality"><select name="village" required disabled={!value.district} value={value.village} onChange={(event) => selectVillage(event.target.value)} className={className}><option value="">Select village</option>{villages.map((item) => <option key={item.village} value={item.village}>{item.village}</option>)}</select></LocationField>
    <LocationField label="PIN code"><input name="pinCode" value={value.pinCode} readOnly placeholder="Auto-filled after village selection" className={className} /></LocationField>
  </>;
}

function LocationField({ label, children }) { return <label className="text-sm font-bold">{label}{children}</label>; }
