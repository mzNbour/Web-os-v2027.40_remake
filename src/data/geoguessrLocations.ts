export type GeoMapId =
  | 'world'
  | 'japan'
  | 'europe'
  | 'americas'
  | 'asia'
  | 'landmarks';

export type GeoMoveMode = 'moving' | 'nomove' | 'nmpz';

export interface GeoCoord {
  lat: number;
  lng: number;
  panoId?: string;
  sdUrl?: string;
  az?: number;
}

export interface GeoMapConfig {
  id: GeoMapId;
  nameJa: string;
  nameEn: string;
  descJa: string;
  descEn: string;
  scaleKm: number;
  defaultCenter: GeoCoord;
  defaultZoom: number;
  accentFrom: string;
  accentTo: string;
  coords: GeoCoord[];
}

export function haversineDistanceKm(a: GeoCoord, b: GeoCoord): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

export function calculateGeoScore(distanceKm: number, mapScaleKm: number): number {
  const perfectThresholdKm = Math.min(0.025, Math.max(0.01, mapScaleKm * 0.00002));
  if (distanceKm <= perfectThresholdKm) return 5000;
  const score = 5000 * Math.exp((-10 * distanceKm) / mapScaleKm);
  return Math.max(0, Math.min(5000, Math.round(score)));
}

export function getDuelMultiplier(roundNumber: number): number {
  if (roundNumber <= 3) return 1.0;
  if (roundNumber === 4) return 1.5;
  if (roundNumber === 5) return 2.0;
  if (roundNumber === 6) return 2.5;
  return 3.0;
}

export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  if (distanceKm < 100) {
    return `${distanceKm.toFixed(1)} km`;
  }
  return `${Math.round(distanceKm).toLocaleString()} km`;
}

// All coordinates below are verified against Panoramax (api.panoramax.xyz) with 360° CORS-enabled imagery.
const JAPAN_COORDS: GeoCoord[] = [
  { lat: 35.66792, lng: 139.69162, panoId: "9cb667de-032e-4e11-be6e-47e78d66538c", sdUrl: "https://panoramax.osm.tw/api/pictures/9cb667de-032e-4e11-be6e-47e78d66538c/sd.jpg", az: 234 }, // Tokyo Shibuya
  { lat: 35.68434, lng: 139.77785, panoId: "78e8a214-b9e6-4b31-9e40-de0650b8cfbe", sdUrl: "https://panoramax.osm.tw/api/pictures/78e8a214-b9e6-4b31-9e40-de0650b8cfbe/sd.jpg", az: 274 }, // Tokyo Asakusa / Nihonbashi
  { lat: 35.68615, lng: 139.69381, panoId: "012d3c25-ff3a-424a-a216-12a2d014b494", sdUrl: "https://panoramax.osm.tw/api/pictures/012d3c25-ff3a-424a-a216-12a2d014b494/sd.jpg", az: 50 }, // Tokyo Shinjuku
  { lat: 35.67776, lng: 139.76495, panoId: "ff40ace8-c41b-4235-851c-4ff3516b453e", sdUrl: "https://panoramax.osm.tw/api/pictures/ff40ace8-c41b-4235-851c-4ff3516b453e/sd.jpg", az: 284 }, // Tokyo Ginza
  { lat: 35.67765, lng: 139.42128, panoId: "5095820a-12d7-4a91-bd7f-007cf614e43e", sdUrl: "https://panoramax.osm.tw/api/pictures/5095820a-12d7-4a91-bd7f-007cf614e43e/sd.jpg", az: 245 }, // Tachikawa
  { lat: 35.48132, lng: 139.45551, panoId: "4873014d-2da7-4f42-98f8-83e9a871c2f0", sdUrl: "https://panoramax.osm.tw/api/pictures/4873014d-2da7-4f42-98f8-83e9a871c2f0/sd.jpg", az: 112 }, // Machida
  { lat: 35.51133, lng: 139.71373, panoId: "67880dd8-ef62-4d01-a3b4-5ae9c351d176", sdUrl: "https://panoramax.osm.tw/api/pictures/67880dd8-ef62-4d01-a3b4-5ae9c351d176/sd.jpg", az: 238 }, // Kawasaki
  { lat: 35.44396, lng: 139.63796, panoId: "6619106a-1adf-453d-8e83-c1e483364d36", sdUrl: "https://panoramax.osm.tw/api/pictures/6619106a-1adf-453d-8e83-c1e483364d36/sd.jpg", az: 19 }, // Yokohama
  { lat: 35.30932, lng: 139.54498, panoId: "be510d84-c150-4572-8899-dab4bbfe2a64", sdUrl: "https://panoramax.osm.tw/api/pictures/be510d84-c150-4572-8899-dab4bbfe2a64/sd.jpg", az: 282 }, // Kamakura
  { lat: 35.31448, lng: 139.47495, panoId: "359c5253-5bcd-49ae-833d-82cb4401d61f", sdUrl: "https://panoramax.osm.tw/api/pictures/359c5253-5bcd-49ae-833d-82cb4401d61f/sd.jpg", az: 307 }, // Fujisawa
  { lat: 35.30800, lng: 139.48250, panoId: "d8482ef5-81a4-4a9c-b741-6b142653dbf4", sdUrl: "https://panoramax.osm.tw/api/pictures/d8482ef5-81a4-4a9c-b741-6b142653dbf4/sd.jpg", az: 292 }, // Enoshima
  { lat: 35.34245, lng: 139.20350, panoId: "3609ef0c-180f-412c-81d3-2c5a34368c4a", sdUrl: "https://panoramax.osm.tw/api/pictures/3609ef0c-180f-412c-81d3-2c5a34368c4a/sd.jpg", az: 37 }, // Odawara
  { lat: 35.63428, lng: 140.12308, panoId: "74cf8b6b-32fb-424a-a711-34517b3c3f44", sdUrl: "https://panoramax.osm.tw/api/pictures/74cf8b6b-32fb-424a-a711-34517b3c3f44/sd.jpg", az: 64 }, // Chiba
  { lat: 36.50381, lng: 140.57713, panoId: "0d7456c8-8e82-4e2e-9b2a-97f659c5253a", sdUrl: "https://panoramax.osm.tw/api/pictures/0d7456c8-8e82-4e2e-9b2a-97f659c5253a/sd.jpg", az: 312 }, // Mito / Hitachi
  { lat: 35.48960, lng: 138.79514, panoId: "a332b9bc-c74e-4c82-a7b7-9cf50900f1b6", sdUrl: "https://panoramax.osm.tw/api/pictures/a332b9bc-c74e-4c82-a7b7-9cf50900f1b6/sd.jpg", az: 130 }, // Fujiyoshida / Mt. Fuji
  { lat: 35.52539, lng: 138.74499, panoId: "8a6cd3f3-cf1a-43b3-afb2-b32fbbd536ba", sdUrl: "https://panoramax.osm.tw/api/pictures/8a6cd3f3-cf1a-43b3-afb2-b32fbbd536ba/sd.jpg", az: 54 }, // Kofu / Kawaguchiko
  { lat: 36.56174, lng: 136.65663, panoId: "c6efbd54-ea10-49df-b8b2-b86e521ba8b9", sdUrl: "https://panoramax.osm.tw/api/pictures/c6efbd54-ea10-49df-b8b2-b86e521ba8b9/sd.jpg", az: 55 }, // Kanazawa
  { lat: 36.70204, lng: 137.21137, panoId: "464efe59-2dcc-4869-a9e9-f81ead20b550", sdUrl: "https://panoramax.osm.tw/api/pictures/464efe59-2dcc-4869-a9e9-f81ead20b550/sd.jpg", az: 190 }, // Toyama
  { lat: 35.05164, lng: 136.89897, panoId: "9870b580-0d2d-40bf-bb07-5ca646e2387b", sdUrl: "https://panoramax.osm.tw/api/pictures/9870b580-0d2d-40bf-bb07-5ca646e2387b/sd.jpg", az: 95 }, // Nagoya
  { lat: 35.03544, lng: 136.72908, panoId: "cc3f6839-6dab-4f49-9e10-dc977cb189ee", sdUrl: "https://panoramax.osm.tw/api/pictures/cc3f6839-6dab-4f49-9e10-dc977cb189ee/sd.jpg", az: 148 }, // Yokkaichi
  { lat: 35.01747, lng: 135.76763, panoId: "e30d6e0e-d4ea-4941-bec6-c41d6a330eec", sdUrl: "https://panoramax.osm.tw/api/pictures/e30d6e0e-d4ea-4941-bec6-c41d6a330eec/sd.jpg", az: 268 }, // Kyoto
  { lat: 34.89236, lng: 135.80441, panoId: "67893eb3-c8d9-427e-b357-e03ebe4f54b0", sdUrl: "https://panoramax.osm.tw/api/pictures/67893eb3-c8d9-427e-b357-e03ebe4f54b0/sd.jpg", az: 324 }, // Uji
  { lat: 35.01701, lng: 135.86080, panoId: "f469f60b-4649-4e61-9e43-6eb8d5d17214", sdUrl: "https://panoramax.osm.tw/api/pictures/f469f60b-4649-4e61-9e43-6eb8d5d17214/sd.jpg", az: 7 }, // Otsu
  { lat: 34.68773, lng: 135.80521, panoId: "b90e1877-340a-4f5f-a376-4a47993b479a", sdUrl: "https://panoramax.osm.tw/api/pictures/b90e1877-340a-4f5f-a376-4a47993b479a/sd.jpg", az: 90 }, // Nara
  { lat: 34.71505, lng: 135.58819, panoId: "a1e51500-4f34-4457-ae66-16b58cb3ba35", sdUrl: "https://panoramax.osm.tw/api/pictures/a1e51500-4f34-4457-ae66-16b58cb3ba35/sd.jpg", az: 142 }, // Osaka
  { lat: 34.52465, lng: 135.50141, panoId: "06033bc4-40e8-43be-81dc-532598bb9f28", sdUrl: "https://panoramax.osm.tw/api/pictures/06033bc4-40e8-43be-81dc-532598bb9f28/sd.jpg", az: 245 }, // Sakai
  { lat: 34.44261, lng: 135.25127, panoId: "2fb542bc-4791-4e84-bb16-bdd10f85d603", sdUrl: "https://panoramax.osm.tw/api/pictures/2fb542bc-4791-4e84-bb16-bdd10f85d603/sd.jpg", az: 254 }, // Kobe / Osaka Bay
  { lat: 38.24223, lng: 140.95226, panoId: "ba7193ad-ab7b-4893-9cfa-b970322deba1", sdUrl: "https://panoramax.osm.tw/api/pictures/ba7193ad-ab7b-4893-9cfa-b970322deba1/sd.jpg", az: 194 }, // Sendai
];

const EUROPE_COORDS: GeoCoord[] = [
  { lat: 48.85699, lng: 2.35201, panoId: "69fe75b5-f795-49c0-b5c7-37e58df10e3f", sdUrl: "https://panoramax.openstreetmap.fr/derivates/69/fe/75/b5/f795-49c0-b5c7-37e58df10e3f/sd.jpg", az: 265 },   // Paris
  { lat: 45.76401, lng: 4.83577, panoId: "634598d8-a4c8-43ee-a1b3-5194ed12eea3", sdUrl: "https://panoramax-storage-public-fast.s3.gra.perf.cloud.ovh.net/derivates/63/45/98/d8/a4c8-43ee-a1b3-5194ed12eea3/sd.jpg", az: 45 },   // Lyon
  { lat: 43.29606, lng: 5.36983, panoId: "24908aa7-76a2-47a0-9150-c300fa350cc8", sdUrl: "https://panoramax.ign.fr/api/pictures/24908aa7-76a2-47a0-9150-c300fa350cc8/sd.jpg", az: 82 },   // Marseille
  { lat: 43.71024, lng: 7.26193, panoId: "cb7d65ad-dab5-4f5f-84f2-ac4db075f244", sdUrl: "https://panoramax.ign.fr/api/pictures/cb7d65ad-dab5-4f5f-84f2-ac4db075f244/sd.jpg", az: 74 },   // Nice
  { lat: 44.83742, lng: -0.57917, panoId: "383c89d6-8abe-4e74-b33e-26b3f7172c56", sdUrl: "https://panoramax.ign.fr/api/pictures/383c89d6-8abe-4e74-b33e-26b3f7172c56/sd.jpg", az: 85 },  // Bordeaux
  { lat: 43.60461, lng: 1.44371, panoId: "67bd2c6a-8530-42be-83c8-910ea19fcc6c", sdUrl: "https://panoramax.openstreetmap.fr/derivates/67/bd/2c/6a/8530-42be-83c8-910ea19fcc6c/sd.jpg", az: 352 },   // Toulouse
  { lat: 51.53450, lng: -0.17604, panoId: "746d6095-a1bc-4966-aa6d-5f17c62a7453", sdUrl: "https://panoramax-ulm.jjbaur.de/derivatives/74/6d/60/95/a1bc-4966-aa6d-5f17c62a7453/sd.jpg", az: 254 },  // London
  { lat: 55.90258, lng: -3.13419, panoId: "dda564e2-82f9-44f2-883f-1e049c4048f9", sdUrl: "https://panoramax.openstreetmap.fr/derivates/dd/a5/64/e2/82f9-44f2-883f-1e049c4048f9/sd.jpg", az: 11 },  // Edinburgh
  { lat: 53.34982, lng: -6.26016, panoId: "83779d4e-dbee-4c06-897b-417ab368d2f7", sdUrl: "https://panoramax.openstreetmap.fr/derivates/83/77/9d/4e/dbee-4c06-897b-417ab368d2f7/sd.jpg", az: 244 },  // Dublin
  { lat: 52.52114, lng: 13.41313, panoId: "ed009b56-97c5-4129-b912-876b271f2021", sdUrl: "https://panoramax.openstreetmap.fr/derivates/ed/00/9b/56/97c5-4129-b912-876b271f2021/sd.jpg", az: 108 },  // Berlin
  { lat: 48.13850, lng: 11.57928, panoId: "de710241-3abd-43d2-aefd-7fa1e84759a2", sdUrl: "https://panoramax.openstreetmap.fr/derivates/de/71/02/41/3abd-43d2-aefd-7fa1e84759a2/sd.jpg", az: 0 },  // Munich
  { lat: 53.55058, lng: 9.99588, panoId: "6885877f-5c19-42cc-9c46-93d2a48ba95a", sdUrl: "https://panoramax.openstreetmap.fr/derivates/68/85/87/7f/5c19-42cc-9c46-93d2a48ba95a/sd.jpg", az: 159 },   // Hamburg
  { lat: 41.89094, lng: 12.49190, panoId: "20aae997-0c7b-4877-87cb-a42e155f2fb8", sdUrl: "https://images.panoramax.basi.re/derivates/20/aa/e9/97/0c7b-4877-87cb-a42e155f2fb8/sd.jpg", az: 0 },  // Rome
  { lat: 45.50848, lng: 9.18973, panoId: "26078e8a-6349-49d1-90b9-23414e553324", sdUrl: "https://panoramax.openstreetmap.fr/derivates/26/07/8e/8a/6349-49d1-90b9-23414e553324/sd.jpg", az: 315 },   // Milan
  { lat: 40.41955, lng: -3.71125, panoId: "93325738-6d39-4d9d-b121-299290b8a4cc", sdUrl: "https://panoramax.openstreetmap.es/derivatives/93/32/57/38/6d39-4d9d-b121-299290b8a4cc/sd.jpg", az: 242 },  // Madrid
  { lat: 38.71785, lng: -9.14373, panoId: "7b817f17-3702-4513-9415-5219f7503ab8", sdUrl: "https://panoramax.openstreetmap.fr/derivates/7b/81/7f/17/3702-4513-9415-5219f7503ab8/sd.jpg", az: 163 },  // Lisbon
  { lat: 51.86256, lng: 4.53629, panoId: "8e8b197a-fb0d-47d6-83db-297c2a33dc94", sdUrl: "https://panoramax.openstreetmap.fr/derivates/8e/8b/19/7a/fb0d-47d6-83db-297c2a33dc94/sd.jpg", az: 178 },   // Amsterdam
  { lat: 50.85030, lng: 4.35170, panoId: "e6932471-7160-442d-a6cd-97e885e72317", sdUrl: "https://panoramax.openstreetmap.fr/derivates/e6/93/24/71/7160-442d-a6cd-97e885e72317/sd.jpg", az: 74 },   // Brussels
  { lat: 47.37710, lng: 8.54175, panoId: "2fd5c73d-450b-4f90-b7a7-b7052bf531e5", sdUrl: "https://images.panoramax.basi.re/derivates/2f/d5/c7/3d/450b-4f90-b7a7-b7052bf531e5/sd.jpg", az: 280 },   // Zurich
  { lat: 48.19567, lng: 16.37373, panoId: "4aaac766-c461-41f5-9c43-e75aedc34fe6", sdUrl: "https://panoramax.openstreetmap.fr/derivates/4a/aa/c7/66/c461-41f5-9c43-e75aedc34fe6/sd.jpg", az: 317 },  // Vienna
  { lat: 50.13222, lng: 14.49839, panoId: "3e2019aa-8676-453e-a3ec-431ec966bd33", sdUrl: "https://panoramax.openstreetmap.fr/derivates/3e/20/19/aa/8676-453e-a3ec-431ec966bd33/sd.jpg", az: 133 },  // Prague
  { lat: 45.79257, lng: 16.00403, panoId: "946ccc93-9cbe-4e4c-bf33-260a1a3cf9a5", sdUrl: "https://panoramax.osm-hr.org/derivatives/94/6c/cc/93/9cbe-4e4c-bf33-260a1a3cf9a5/sd.jpg", az: 262 },  // Zagreb
  { lat: 59.90845, lng: 10.75042, panoId: "2620c654-47ff-485d-ad1f-a70177193198", sdUrl: "https://images.panoramax.basi.re/derivates/26/20/c6/54/47ff-485d-ad1f-a70177193198/sd.jpg", az: 236 },  // Oslo
  { lat: 59.33384, lng: 18.07050, panoId: "acef2e95-5271-4ad6-a8c4-179f416f2760", sdUrl: "https://images.panoramax.basi.re/derivates/ac/ef/2e/95/5271-4ad6-a8c4-179f416f2760/sd.jpg", az: 127 },  // Stockholm
  { lat: 60.18477, lng: 24.82424, panoId: "374cd5c1-ff35-4ec1-96cc-e7437a998288", sdUrl: "https://panoramax.openstreetmap.fr/derivates/37/4c/d5/c1/ff35-4ec1-96cc-e7437a998288/sd.jpg", az: 231 },  // Helsinki
  { lat: 54.67706, lng: 25.26563, panoId: "c8fffca0-0c72-49d6-a0d0-c0b638fe7f9b", sdUrl: "https://panoramax.openstreetmap.fr/derivates/c8/ff/fc/a0/0c72-49d6-a0d0-c0b638fe7f9b/sd.jpg", az: 73 },  // Vilnius
  { lat: 41.01131, lng: 28.97491, panoId: "3ea284f4-c0bd-4065-88e4-b9d70d438d7a", sdUrl: "https://panoramax.openstreetmap.fr/derivates/3e/a2/84/f4/c0bd-4065-88e4-b9d70d438d7a/sd.jpg", az: 40 },  // Istanbul
  { lat: 63.92991, lng: -21.99420, panoId: "26e6516b-ba04-4e5c-967b-8a932e8e6d5e", sdUrl: "https://panoramax.ign.fr/api/pictures/26e6516b-ba04-4e5c-967b-8a932e8e6d5e/sd.jpg", az: 199 }, // Iceland (Reykjavik area)
];

const AMERICAS_COORDS: GeoCoord[] = [
  { lat: 40.77602, lng: -73.97118, panoId: "ae88e407-0679-4da5-817f-ab4e5f427ed5", sdUrl: "https://panoramax.openstreetmap.fr/derivates/ae/88/e4/07/0679-4da5-817f-ab4e5f427ed5/sd.jpg", az: 208 }, // New York City
  { lat: 41.72764, lng: -87.81138, panoId: "54e97742-cc08-4363-9ba0-aacd7fb7c6f4", sdUrl: "https://panoramax.openstreetmap.fr/derivates/54/e9/77/42/cc08-4363-9ba0-aacd7fb7c6f4/sd.jpg", az: 142 }, // Chicago
  { lat: 42.37322, lng: -71.08601, panoId: "083b79fd-db57-411e-8d9f-474e460c899e", sdUrl: "https://panoramax.openstreetmap.fr/derivates/08/3b/79/fd/db57-411e-8d9f-474e460c899e/sd.jpg", az: 207 }, // Boston
  { lat: 30.26708, lng: -97.74319, panoId: "85c8dc83-68d6-4bfa-82a5-0e19ca6d0a72", sdUrl: "https://panoramax.openstreetmap.fr/derivates/85/c8/dc/83/68d6-4bfa-82a5-0e19ca6d0a72/sd.jpg", az: 103 }, // Austin
  { lat: 32.95128, lng: -117.06764, panoId: "ba82bf8a-f2ef-4213-9014-eb52320ee345", sdUrl: "https://panoramax.mapcomplete.org/derivatives/ba/82/bf/8a/f2ef-4213-9014-eb52320ee345/sd.jpg", az: 82 },// San Diego area
  { lat: 39.90903, lng: -105.14816, panoId: "2efb820a-c0ce-40db-9492-e745720a2633", sdUrl: "https://panoramax-ulm.jjbaur.de/derivatives/2e/fb/82/0a/c0ce-40db-9492-e745720a2633/sd.jpg", az: 273 },// Denver area
  { lat: 45.52342, lng: -73.62282, panoId: "cf789ab0-3e7d-4e8c-a558-42ef71383f5e", sdUrl: "https://panoramax.openstreetmap.fr/derivates/cf/78/9a/b0/3e7d-4e8c-a558-42ef71383f5e/sd.jpg", az: -77 }, // Montreal
  { lat: -34.62302, lng: -58.38225, panoId: "72043c78-cd89-45a9-ba6d-d6ad383f1aca", sdUrl: "https://panoramax.libre.net.ar/derivatives/72/04/3c/78/cd89-45a9-ba6d-d6ad383f1aca/sd.jpg", az: 91 },// Buenos Aires
  { lat: -31.42033, lng: -64.18882, panoId: "a22aec31-a4c5-4b2c-8f42-0b84b93eb1b8", sdUrl: "https://panoramax.libre.net.ar/derivatives/a2/2a/ec/31/a4c5-4b2c-8f42-0b84b93eb1b8/sd.jpg", az: 98 },// Cordoba
  { lat: -32.94426, lng: -60.65058, panoId: "9f46061f-7d50-4c00-abe8-e358c7c3c392", sdUrl: "https://panoramax.openstreetmap.fr/derivates/9f/46/06/1f/7d50-4c00-abe8-e358c7c3c392/sd.jpg", az: 97 },// Rosario
  { lat: -32.88838, lng: -68.84560, panoId: "caa0f6e5-dc16-4c46-9a83-76e3f00cf571", sdUrl: "https://panoramax.libre.net.ar/derivatives/ca/a0/f6/e5/dc16-4c46-9a83-76e3f00cf571/sd.jpg", az: 280 },// Mendoza
  { lat: -34.92403, lng: -57.95076, panoId: "d1d369f9-f4f9-4f6b-9bb0-ea55fabca09e", sdUrl: "https://panoramax.libre.net.ar/derivatives/d1/d3/69/f9/f4f9-4f6b-9bb0-ea55fabca09e/sd.jpg", az: 226 },// La Plata
  { lat: -37.98753, lng: -57.56846, panoId: "d49f08a2-0ec3-47c5-a57e-c0e7167fa22c", sdUrl: "https://panoramax.libre.net.ar/derivatives/d4/9f/08/a2/0ec3-47c5-a57e-c0e7167fa22c/sd.jpg", az: 215 },// Mar del Plata
  { lat: 16.23992, lng: -61.53234, panoId: "f4faab38-727d-4d17-a8c3-afea3e554fe3", sdUrl: "https://panoramax.ign.fr/api/pictures/f4faab38-727d-4d17-a8c3-afea3e554fe3/sd.jpg", az: 259 }, // Guadeloupe
  { lat: 14.61268, lng: -61.05320, panoId: "09956548-92e7-4800-a89c-3adf7906a8ad", sdUrl: "https://panoramax.ign.fr/api/pictures/09956548-92e7-4800-a89c-3adf7906a8ad/sd.jpg", az: 299 }, // Martinique
];

const ASIA_OCEANIA_COORDS: GeoCoord[] = [
  { lat: 25.03292, lng: 121.56548, panoId: "1e2296c7-470d-4a57-af05-70886286e4bb", sdUrl: "https://panoramax.osm.tw/api/pictures/1e2296c7-470d-4a57-af05-70886286e4bb/sd.jpg", az: 360 }, // Taipei
  { lat: 25.12763, lng: 121.73882, panoId: "2648b32f-fa62-4bfa-985a-68be5a1622c1", sdUrl: "https://panoramax.osm.tw/api/pictures/2648b32f-fa62-4bfa-985a-68be5a1622c1/sd.jpg", az: 213 }, // Keelung
  { lat: 24.81376, lng: 120.96750, panoId: "ea395564-3307-4c86-a3ca-a5a8f8e88f5b", sdUrl: "https://panoramax.osm.tw/api/pictures/ea395564-3307-4c86-a3ca-a5a8f8e88f5b/sd.jpg", az: 322 }, // Hsinchu
  { lat: 24.17466, lng: 120.67116, panoId: "1763ec95-17cd-4374-964f-f7190ddf70c2", sdUrl: "https://panoramax.osm.tw/api/pictures/1763ec95-17cd-4374-964f-f7190ddf70c2/sd.jpg", az: 152 }, // Taichung
  { lat: 23.49286, lng: 120.33758, panoId: "a4dc6cb2-f75c-44d4-ae5c-a45c220b1eba", sdUrl: "https://panoramax.osm.tw/api/pictures/a4dc6cb2-f75c-44d4-ae5c-a45c220b1eba/sd.jpg", az: 3 }, // Chiayi
  { lat: 22.99999, lng: 120.22728, panoId: "7a9d5073-7dde-4390-bfe3-a77582b5ca64", sdUrl: "https://panoramax.osm.tw/api/pictures/7a9d5073-7dde-4390-bfe3-a77582b5ca64/sd.jpg", az: 289 }, // Tainan
  { lat: 22.62706, lng: 120.30148, panoId: "44bc821c-148f-495a-b36d-bbad4e4c0e8d", sdUrl: "https://panoramax.osm.tw/api/pictures/44bc821c-148f-495a-b36d-bbad4e4c0e8d/sd.jpg", az: 186 }, // Kaohsiung
  { lat: 24.75161, lng: 121.75211, panoId: "0ccb1f96-69d6-409e-b790-5cde4e802d29", sdUrl: "https://panoramax.osm.tw/api/pictures/0ccb1f96-69d6-409e-b790-5cde4e802d29/sd.jpg", az: 157 }, // Yilan
  { lat: 22.37739, lng: 114.30044, panoId: "68e64dca-0484-4db1-84ce-6089e08ff12a", sdUrl: "https://panoramax.osm.tw/api/pictures/68e64dca-0484-4db1-84ce-6089e08ff12a/sd.jpg", az: -136 }, // Hong Kong
  { lat: 14.53271, lng: 121.18648, panoId: "24dc58b8-6eff-4913-afd6-dd00939afc75", sdUrl: "https://panoramax.openstreetmap.fr/derivates/24/dc/58/b8/6eff-4913-afd6-dd00939afc75/sd.jpg", az: 205 }, // Manila area
  { lat: 5.41157, lng: 100.34504, panoId: "2183a67b-0296-4554-be65-a5dbc84d7b43", sdUrl: "https://panoramax.openstreetmap.fr/derivates/21/83/a6/7b/0296-4554-be65-a5dbc84d7b43/sd.jpg", az: 148 },  // Penang
  { lat: 12.95923, lng: 77.71695, panoId: "81d93d34-9673-49bd-9866-2b3af51d6978", sdUrl: "https://panoramax.openstreetmap.fr/derivates/81/d9/3d/34/9673-49bd-9866-2b3af51d6978/sd.jpg", az: 8 },  // Bengaluru
  { lat: -33.89127, lng: 151.15831, panoId: "9dd659f3-17f4-4fd7-879b-10d34b857e9f", sdUrl: "https://images.panoramax.basi.re/derivates/9d/d6/59/f3/17f4-4fd7-879b-10d34b857e9f/sd.jpg", az: 327 },// Sydney
  { lat: -36.84682, lng: 174.76381, panoId: "63645e57-5630-4e09-96f8-517ddca6fa14", sdUrl: "https://panoramax.osm.tw/api/pictures/63645e57-5630-4e09-96f8-517ddca6fa14/sd.jpg", az: 289 },// Auckland
  { lat: -41.23626, lng: 174.97946, panoId: "b5a285f9-2efb-43b0-9edb-714ce153530a", sdUrl: "https://panoramax.openstreetmap.fr/derivates/b5/a2/85/f9/2efb-43b0-9edb-714ce153530a/sd.jpg", az: 121 },// Wellington
  { lat: -43.52853, lng: 172.63521, panoId: "cb61f7f5-d7f8-4420-89a3-34d245106d01", sdUrl: "https://panoramax.openstreetmap.fr/derivates/cb/61/f7/f5/d7f8-4420-89a3-34d245106d01/sd.jpg", az: 160 },// Christchurch
  { lat: -17.53990, lng: -149.56911, panoId: "2d7de6ae-529b-4964-8bc8-bf78c6942c3f", sdUrl: "https://panoramax.openstreetmap.fr/derivates/2d/7d/e6/ae/529b-4964-8bc8-bf78c6942c3f/sd.jpg", az: 228 },// Tahiti
  { lat: 35.66792, lng: 139.69162, panoId: "9cb667de-032e-4e11-be6e-47e78d66538c", sdUrl: "https://panoramax.osm.tw/api/pictures/9cb667de-032e-4e11-be6e-47e78d66538c/sd.jpg", az: 234 }, // Tokyo
  { lat: 35.01747, lng: 135.76763, panoId: "e30d6e0e-d4ea-4941-bec6-c41d6a330eec", sdUrl: "https://panoramax.osm.tw/api/pictures/e30d6e0e-d4ea-4941-bec6-c41d6a330eec/sd.jpg", az: 268 }, // Kyoto
];

const LANDMARK_COORDS: GeoCoord[] = [
  { lat: 48.85770, lng: 2.29505, panoId: "65cf20e0-6f2b-4b45-af73-e075de8b85aa", sdUrl: "https://panoramax.openstreetmap.fr/derivates/65/cf/20/e0/6f2b-4b45-af73-e075de8b85aa/sd.jpg", az: 53 },   // Eiffel Tower, Paris
  { lat: 41.89094, lng: 12.49190, panoId: "20aae997-0c7b-4877-87cb-a42e155f2fb8", sdUrl: "https://images.panoramax.basi.re/derivates/20/aa/e9/97/0c7b-4877-87cb-a42e155f2fb8/sd.jpg", az: 0 },  // Colosseum, Rome
  { lat: 40.77602, lng: -73.97118, panoId: "ae88e407-0679-4da5-817f-ab4e5f427ed5", sdUrl: "https://panoramax.openstreetmap.fr/derivates/ae/88/e4/07/0679-4da5-817f-ab4e5f427ed5/sd.jpg", az: 208 }, // Central Park / NYC
  { lat: 35.66792, lng: 139.69162, panoId: "9cb667de-032e-4e11-be6e-47e78d66538c", sdUrl: "https://panoramax.osm.tw/api/pictures/9cb667de-032e-4e11-be6e-47e78d66538c/sd.jpg", az: 234 }, // Shibuya, Tokyo
  { lat: -33.89127, lng: 151.15831, panoId: "9dd659f3-17f4-4fd7-879b-10d34b857e9f", sdUrl: "https://images.panoramax.basi.re/derivates/9d/d6/59/f3/17f4-4fd7-879b-10d34b857e9f/sd.jpg", az: 327 },// Sydney
  { lat: 51.53450, lng: -0.17604, panoId: "746d6095-a1bc-4966-aa6d-5f17c62a7453", sdUrl: "https://panoramax-ulm.jjbaur.de/derivatives/74/6d/60/95/a1bc-4966-aa6d-5f17c62a7453/sd.jpg", az: 254 },  // London
  { lat: 52.51851, lng: 13.37631, panoId: "67558008-224d-43d6-8b25-f083698fa5fa", sdUrl: "https://panoramax.openstreetmap.fr/derivates/67/55/80/08/224d-43d6-8b25-f083698fa5fa/sd.jpg", az: 351 },  // Brandenburg Gate, Berlin
  { lat: 25.03318, lng: 121.56452, panoId: "d2e37876-cbed-4716-b6c6-bd70db515fd2", sdUrl: "https://panoramax.osm.tw/api/pictures/d2e37876-cbed-4716-b6c6-bd70db515fd2/sd.jpg", az: 89 }, // Taipei 101
  { lat: 34.96796, lng: 135.77214, panoId: "5dd697e1-ee92-416b-bc81-0871896a371f", sdUrl: "https://panoramax.osm.tw/api/pictures/5dd697e1-ee92-416b-bc81-0871896a371f/sd.jpg", az: 24 }, // Fushimi Inari, Kyoto
  { lat: 50.13852, lng: 14.49285, panoId: "6d1a91e1-2740-461e-9464-2fefb15334f1", sdUrl: "https://panoramax.openstreetmap.fr/derivates/6d/1a/91/e1/2740-461e-9464-2fefb15334f1/sd.jpg", az: 143 },  // Prague
  { lat: 51.05569, lng: 3.72029, panoId: "518376bd-c55a-4cea-b36f-8977ba7a74a0", sdUrl: "https://panoramax.openstreetmap.fr/derivates/51/83/76/bd/c55a-4cea-b36f-8977ba7a74a0/sd.jpg", az: 154 },   // Amsterdam Center
  { lat: 38.71785, lng: -9.14373, panoId: "7b817f17-3702-4513-9415-5219f7503ab8", sdUrl: "https://panoramax.openstreetmap.fr/derivates/7b/81/7f/17/3702-4513-9415-5219f7503ab8/sd.jpg", az: 163 },  // Lisbon
  { lat: 60.18477, lng: 24.82424, panoId: "374cd5c1-ff35-4ec1-96cc-e7437a998288", sdUrl: "https://panoramax.openstreetmap.fr/derivates/37/4c/d5/c1/ff35-4ec1-96cc-e7437a998288/sd.jpg", az: 231 },  // Helsinki
  { lat: 59.32416, lng: 18.06628, panoId: "98d2a9f6-5ce0-45a0-bc9e-7eee60913a99", sdUrl: "https://images.panoramax.basi.re/derivates/98/d2/a9/f6/5ce0-45a0-bc9e-7eee60913a99/sd.jpg", az: 150 },  // Stockholm
  { lat: 48.19567, lng: 16.37373, panoId: "4aaac766-c461-41f5-9c43-e75aedc34fe6", sdUrl: "https://panoramax.openstreetmap.fr/derivates/4a/aa/c7/66/c461-41f5-9c43-e75aedc34fe6/sd.jpg", az: 317 },  // Vienna
  { lat: 35.48960, lng: 138.79514, panoId: "a332b9bc-c74e-4c82-a7b7-9cf50900f1b6", sdUrl: "https://panoramax.osm.tw/api/pictures/a332b9bc-c74e-4c82-a7b7-9cf50900f1b6/sd.jpg", az: 130 }, // Mt. Fuji area
  { lat: 41.01131, lng: 28.97491, panoId: "3ea284f4-c0bd-4065-88e4-b9d70d438d7a", sdUrl: "https://panoramax.openstreetmap.fr/derivates/3e/a2/84/f4/c0bd-4065-88e4-b9d70d438d7a/sd.jpg", az: 40 },  // Istanbul
];

const EXTRA_WORLD_COORDS: GeoCoord[] = [
  { lat: -20.87875, lng: 55.44860, panoId: "4e2d7d50-a298-4bef-aeb4-44fcca58126b", sdUrl: "https://panoramax-storage-public-fast.s3.gra.perf.cloud.ovh.net/derivates/4e/2d/7d/50/a298-4bef-aeb4-44fcca58126b/sd.jpg", az: 341 }, // Reunion Island (Indian Ocean)
  { lat: -17.53990, lng: -149.56911, panoId: "2d7de6ae-529b-4964-8bc8-bf78c6942c3f", sdUrl: "https://panoramax.openstreetmap.fr/derivates/2d/7d/e6/ae/529b-4964-8bc8-bf78c6942c3f/sd.jpg", az: 228 },// Tahiti (South Pacific)
  { lat: 16.23992, lng: -61.53234, panoId: "f4faab38-727d-4d17-a8c3-afea3e554fe3", sdUrl: "https://panoramax.ign.fr/api/pictures/f4faab38-727d-4d17-a8c3-afea3e554fe3/sd.jpg", az: 259 }, // Guadeloupe (Caribbean)
  { lat: 59.42516, lng: 24.71734, panoId: "78c4a141-3108-4449-8ee8-e4ce7c77d7b2", sdUrl: "https://panoramax.openstreetmap.fr/derivates/78/c4/a1/41/3108-4449-8ee8-e4ce7c77d7b2/sd.jpg", az: 0 },  // Tallinn
];

export const GEOGUESSR_MAPS: Record<GeoMapId, GeoMapConfig> = {
  world: {
    id: 'world',
    nameJa: 'World (世界一周)',
    nameEn: 'World',
    descJa: '世界中の都市・田舎道・海岸線がランダムに出題される定番マップ',
    descEn: 'Explore roads, towns, and landscapes across all continents.',
    scaleKm: 2000,
    defaultCenter: { lat: 20, lng: 10 },
    defaultZoom: 2,
    accentFrom: '#10b981',
    accentTo: '#0284c7',
    coords: [
      ...JAPAN_COORDS.slice(0, 10),
      ...EUROPE_COORDS.slice(0, 16),
      ...AMERICAS_COORDS.slice(0, 12),
      ...ASIA_OCEANIA_COORDS.slice(0, 12),
      ...EXTRA_WORLD_COORDS,
    ],
  },
  japan: {
    id: 'japan',
    nameJa: 'Japan (日本全土)',
    nameEn: 'Japan',
    descJa: '東北・関東・中部・関西まで日本各地の街並みや街道を探索',
    descEn: 'Explore Japanese cities, towns, mountain passes, and coastlines.',
    scaleKm: 350,
    defaultCenter: { lat: 36.2048, lng: 138.2529 },
    defaultZoom: 5,
    accentFrom: '#f43f5e',
    accentTo: '#fb7185',
    coords: JAPAN_COORDS,
  },
  europe: {
    id: 'europe',
    nameJa: 'Europe (ヨーロッパ)',
    nameEn: 'Europe',
    descJa: '標識・言語・建築様式が多彩な欧州全域マップ',
    descEn: 'Diverse road signs, architecture, and coastal routes across Europe.',
    scaleKm: 650,
    defaultCenter: { lat: 50.1109, lng: 10.5 },
    defaultZoom: 4,
    accentFrom: '#3b82f6',
    accentTo: '#6366f1',
    coords: EUROPE_COORDS,
  },
  americas: {
    id: 'americas',
    nameJa: 'Americas (南北アメリカ)',
    nameEn: 'Americas',
    descJa: '北米・カリブ・南米の大陸横断チャレンジ',
    descEn: 'Highways, cities, and coastal routes from North to South America.',
    scaleKm: 1300,
    defaultCenter: { lat: 12, lng: -75 },
    defaultZoom: 2,
    accentFrom: '#f59e0b',
    accentTo: '#ea580c',
    coords: AMERICAS_COORDS,
  },
  asia: {
    id: 'asia',
    nameJa: 'Asia & Oceania (アジア・オセアニア)',
    nameEn: 'Asia & Oceania',
    descJa: '東アジア・東南アジア・豪州・NZ・南太平洋を巡るマップ',
    descEn: 'Explore East & Southeast Asia alongside Australia and New Zealand.',
    scaleKm: 1100,
    defaultCenter: { lat: 8, lng: 118 },
    defaultZoom: 3,
    accentFrom: '#14b8a6',
    accentTo: '#0ea5e9',
    coords: ASIA_OCEANIA_COORDS,
  },
  landmarks: {
    id: 'landmarks',
    nameJa: 'Famous Landmarks (世界の絶景・名所)',
    nameEn: 'Famous Landmarks',
    descJa: '世界中の有名スポット・観光名所周辺から出題',
    descEn: 'Iconic plazas, monuments, and skylines around the world.',
    scaleKm: 2000,
    defaultCenter: { lat: 24, lng: 12 },
    defaultZoom: 2,
    accentFrom: '#a855f7',
    accentTo: '#ec4899',
    coords: LANDMARK_COORDS,
  },
};

export function pickRandomMapLocations(
  mapId: GeoMapId,
  count: number
): Array<GeoCoord & { heading: number }> {
  const cfg = GEOGUESSR_MAPS[mapId] || GEOGUESSR_MAPS.world;
  const pool = [...cfg.coords];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const selected: Array<GeoCoord & { heading: number }> = [];
  for (let i = 0; i < count; i++) {
    const base = pool[i % pool.length];
    selected.push({
      lat: base.lat,
      lng: base.lng,
      ...(base.panoId ? { panoId: base.panoId } : {}),
      ...(base.sdUrl ? { sdUrl: base.sdUrl } : {}),
      ...(typeof base.az === "number" ? { az: base.az } : {}),
      heading: Math.floor(Math.random() * 360),
    });
  }
  return selected;
}
