export const NAVIGATION = {
  generalTravel: 'general:travel',
  /** scene -> React. payload: (target district, spawn name). React navigates to that district's page. */
  leaveDistrict: 'district:leave',
} as const;