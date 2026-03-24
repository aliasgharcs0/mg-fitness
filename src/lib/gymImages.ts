/** Gym/fitness images from Unsplash (Unsplash License). */

// Local (downloaded) images under `public/images/`
// This avoids relying on hotlinking to Unsplash.
const U = "";

export const gymImages = {
  /** Login hero: clean gym interior */
  loginHero: "/images/loginHero.jpg",
  /** Dashboard banner: gym floor / training space */
  dashboardBanner: "/images/dashboardBanner.jpg",
  /** Members: group training / teamwork */
  membersBanner: "/images/membersBanner.jpg",
  /** Sidebar: weights / motivation */
  sidebarAccent: "/images/sidebarAccent.jpg",
  /** Programs: workout / training */
  programs: "/images/programs.jpg",
  /** Diet: healthy food / nutrition */
  diet: "/images/diet.jpg",
  /** Diet Plans hero: performance nutrition + keto context */
  dietPlansHero: "/images/dietPlansHero.jpg",
  /** Diet plan category thumbnails */
  dietThumbBulking: "/images/dietThumbBulking.jpg",
  dietThumbKeto: "/images/dietThumbKeto.jpg",
  dietThumbProtein: "/images/dietThumbProtein.jpg",
  dietThumbSupplements: "/images/dietThumbSupplements.jpg",
  /** Generic gym interior hero */
  gymHeroMultan: "/images/gymHeroMultan.jpg",
  /** Medical: sports medicine / recovery */
  medical: "/images/medical.jpg",
  /** Payments: finance / billing */
  payments: "/images/payments.jpg",
  /** Dynamic app backgrounds by section */
  bgDashboard: "/images/dashboardBanner.jpg",
  bgMembers: "/images/membersBanner.jpg",
  bgPrograms: "/images/programs.jpg",
  bgDiet: "/images/dietPlansHero.jpg",
  bgMedical: "/images/medical.jpg",
  bgPayments: "/images/payments.jpg",
} as const;

