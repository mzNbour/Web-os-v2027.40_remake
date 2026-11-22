var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_http = __toESM(require("http"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var import_ws = require("ws");
var import_dotenv = __toESM(require("dotenv"), 1);

// src/data/geoguessrLocations.ts
function haversineDistanceKm(a, b) {
  const R = 6371;
  const toRad = (deg) => deg * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}
function calculateGeoScore(distanceKm, mapScaleKm) {
  const perfectThresholdKm = Math.min(0.025, Math.max(0.01, mapScaleKm * 2e-5));
  if (distanceKm <= perfectThresholdKm) return 5e3;
  const score = 5e3 * Math.exp(-10 * distanceKm / mapScaleKm);
  return Math.max(0, Math.min(5e3, Math.round(score)));
}
function getDuelMultiplier(roundNumber) {
  if (roundNumber <= 3) return 1;
  if (roundNumber === 4) return 1.5;
  if (roundNumber === 5) return 2;
  if (roundNumber === 6) return 2.5;
  return 3;
}
var JAPAN_COORDS = [
  { lat: 35.66792, lng: 139.69162, panoId: "9cb667de-032e-4e11-be6e-47e78d66538c", sdUrl: "https://panoramax.osm.tw/api/pictures/9cb667de-032e-4e11-be6e-47e78d66538c/sd.jpg", az: 234 },
  // Tokyo Shibuya
  { lat: 35.68434, lng: 139.77785, panoId: "78e8a214-b9e6-4b31-9e40-de0650b8cfbe", sdUrl: "https://panoramax.osm.tw/api/pictures/78e8a214-b9e6-4b31-9e40-de0650b8cfbe/sd.jpg", az: 274 },
  // Tokyo Asakusa / Nihonbashi
  { lat: 35.68615, lng: 139.69381, panoId: "012d3c25-ff3a-424a-a216-12a2d014b494", sdUrl: "https://panoramax.osm.tw/api/pictures/012d3c25-ff3a-424a-a216-12a2d014b494/sd.jpg", az: 50 },
  // Tokyo Shinjuku
  { lat: 35.67776, lng: 139.76495, panoId: "ff40ace8-c41b-4235-851c-4ff3516b453e", sdUrl: "https://panoramax.osm.tw/api/pictures/ff40ace8-c41b-4235-851c-4ff3516b453e/sd.jpg", az: 284 },
  // Tokyo Ginza
  { lat: 35.67765, lng: 139.42128, panoId: "5095820a-12d7-4a91-bd7f-007cf614e43e", sdUrl: "https://panoramax.osm.tw/api/pictures/5095820a-12d7-4a91-bd7f-007cf614e43e/sd.jpg", az: 245 },
  // Tachikawa
  { lat: 35.48132, lng: 139.45551, panoId: "4873014d-2da7-4f42-98f8-83e9a871c2f0", sdUrl: "https://panoramax.osm.tw/api/pictures/4873014d-2da7-4f42-98f8-83e9a871c2f0/sd.jpg", az: 112 },
  // Machida
  { lat: 35.51133, lng: 139.71373, panoId: "67880dd8-ef62-4d01-a3b4-5ae9c351d176", sdUrl: "https://panoramax.osm.tw/api/pictures/67880dd8-ef62-4d01-a3b4-5ae9c351d176/sd.jpg", az: 238 },
  // Kawasaki
  { lat: 35.44396, lng: 139.63796, panoId: "6619106a-1adf-453d-8e83-c1e483364d36", sdUrl: "https://panoramax.osm.tw/api/pictures/6619106a-1adf-453d-8e83-c1e483364d36/sd.jpg", az: 19 },
  // Yokohama
  { lat: 35.30932, lng: 139.54498, panoId: "be510d84-c150-4572-8899-dab4bbfe2a64", sdUrl: "https://panoramax.osm.tw/api/pictures/be510d84-c150-4572-8899-dab4bbfe2a64/sd.jpg", az: 282 },
  // Kamakura
  { lat: 35.31448, lng: 139.47495, panoId: "359c5253-5bcd-49ae-833d-82cb4401d61f", sdUrl: "https://panoramax.osm.tw/api/pictures/359c5253-5bcd-49ae-833d-82cb4401d61f/sd.jpg", az: 307 },
  // Fujisawa
  { lat: 35.308, lng: 139.4825, panoId: "d8482ef5-81a4-4a9c-b741-6b142653dbf4", sdUrl: "https://panoramax.osm.tw/api/pictures/d8482ef5-81a4-4a9c-b741-6b142653dbf4/sd.jpg", az: 292 },
  // Enoshima
  { lat: 35.34245, lng: 139.2035, panoId: "3609ef0c-180f-412c-81d3-2c5a34368c4a", sdUrl: "https://panoramax.osm.tw/api/pictures/3609ef0c-180f-412c-81d3-2c5a34368c4a/sd.jpg", az: 37 },
  // Odawara
  { lat: 35.63428, lng: 140.12308, panoId: "74cf8b6b-32fb-424a-a711-34517b3c3f44", sdUrl: "https://panoramax.osm.tw/api/pictures/74cf8b6b-32fb-424a-a711-34517b3c3f44/sd.jpg", az: 64 },
  // Chiba
  { lat: 36.50381, lng: 140.57713, panoId: "0d7456c8-8e82-4e2e-9b2a-97f659c5253a", sdUrl: "https://panoramax.osm.tw/api/pictures/0d7456c8-8e82-4e2e-9b2a-97f659c5253a/sd.jpg", az: 312 },
  // Mito / Hitachi
  { lat: 35.4896, lng: 138.79514, panoId: "a332b9bc-c74e-4c82-a7b7-9cf50900f1b6", sdUrl: "https://panoramax.osm.tw/api/pictures/a332b9bc-c74e-4c82-a7b7-9cf50900f1b6/sd.jpg", az: 130 },
  // Fujiyoshida / Mt. Fuji
  { lat: 35.52539, lng: 138.74499, panoId: "8a6cd3f3-cf1a-43b3-afb2-b32fbbd536ba", sdUrl: "https://panoramax.osm.tw/api/pictures/8a6cd3f3-cf1a-43b3-afb2-b32fbbd536ba/sd.jpg", az: 54 },
  // Kofu / Kawaguchiko
  { lat: 36.56174, lng: 136.65663, panoId: "c6efbd54-ea10-49df-b8b2-b86e521ba8b9", sdUrl: "https://panoramax.osm.tw/api/pictures/c6efbd54-ea10-49df-b8b2-b86e521ba8b9/sd.jpg", az: 55 },
  // Kanazawa
  { lat: 36.70204, lng: 137.21137, panoId: "464efe59-2dcc-4869-a9e9-f81ead20b550", sdUrl: "https://panoramax.osm.tw/api/pictures/464efe59-2dcc-4869-a9e9-f81ead20b550/sd.jpg", az: 190 },
  // Toyama
  { lat: 35.05164, lng: 136.89897, panoId: "9870b580-0d2d-40bf-bb07-5ca646e2387b", sdUrl: "https://panoramax.osm.tw/api/pictures/9870b580-0d2d-40bf-bb07-5ca646e2387b/sd.jpg", az: 95 },
  // Nagoya
  { lat: 35.03544, lng: 136.72908, panoId: "cc3f6839-6dab-4f49-9e10-dc977cb189ee", sdUrl: "https://panoramax.osm.tw/api/pictures/cc3f6839-6dab-4f49-9e10-dc977cb189ee/sd.jpg", az: 148 },
  // Yokkaichi
  { lat: 35.01747, lng: 135.76763, panoId: "e30d6e0e-d4ea-4941-bec6-c41d6a330eec", sdUrl: "https://panoramax.osm.tw/api/pictures/e30d6e0e-d4ea-4941-bec6-c41d6a330eec/sd.jpg", az: 268 },
  // Kyoto
  { lat: 34.89236, lng: 135.80441, panoId: "67893eb3-c8d9-427e-b357-e03ebe4f54b0", sdUrl: "https://panoramax.osm.tw/api/pictures/67893eb3-c8d9-427e-b357-e03ebe4f54b0/sd.jpg", az: 324 },
  // Uji
  { lat: 35.01701, lng: 135.8608, panoId: "f469f60b-4649-4e61-9e43-6eb8d5d17214", sdUrl: "https://panoramax.osm.tw/api/pictures/f469f60b-4649-4e61-9e43-6eb8d5d17214/sd.jpg", az: 7 },
  // Otsu
  { lat: 34.68773, lng: 135.80521, panoId: "b90e1877-340a-4f5f-a376-4a47993b479a", sdUrl: "https://panoramax.osm.tw/api/pictures/b90e1877-340a-4f5f-a376-4a47993b479a/sd.jpg", az: 90 },
  // Nara
  { lat: 34.71505, lng: 135.58819, panoId: "a1e51500-4f34-4457-ae66-16b58cb3ba35", sdUrl: "https://panoramax.osm.tw/api/pictures/a1e51500-4f34-4457-ae66-16b58cb3ba35/sd.jpg", az: 142 },
  // Osaka
  { lat: 34.52465, lng: 135.50141, panoId: "06033bc4-40e8-43be-81dc-532598bb9f28", sdUrl: "https://panoramax.osm.tw/api/pictures/06033bc4-40e8-43be-81dc-532598bb9f28/sd.jpg", az: 245 },
  // Sakai
  { lat: 34.44261, lng: 135.25127, panoId: "2fb542bc-4791-4e84-bb16-bdd10f85d603", sdUrl: "https://panoramax.osm.tw/api/pictures/2fb542bc-4791-4e84-bb16-bdd10f85d603/sd.jpg", az: 254 },
  // Kobe / Osaka Bay
  { lat: 38.24223, lng: 140.95226, panoId: "ba7193ad-ab7b-4893-9cfa-b970322deba1", sdUrl: "https://panoramax.osm.tw/api/pictures/ba7193ad-ab7b-4893-9cfa-b970322deba1/sd.jpg", az: 194 }
  // Sendai
];
var EUROPE_COORDS = [
  { lat: 48.85699, lng: 2.35201, panoId: "69fe75b5-f795-49c0-b5c7-37e58df10e3f", sdUrl: "https://panoramax.openstreetmap.fr/derivates/69/fe/75/b5/f795-49c0-b5c7-37e58df10e3f/sd.jpg", az: 265 },
  // Paris
  { lat: 45.76401, lng: 4.83577, panoId: "634598d8-a4c8-43ee-a1b3-5194ed12eea3", sdUrl: "https://panoramax-storage-public-fast.s3.gra.perf.cloud.ovh.net/derivates/63/45/98/d8/a4c8-43ee-a1b3-5194ed12eea3/sd.jpg", az: 45 },
  // Lyon
  { lat: 43.29606, lng: 5.36983, panoId: "24908aa7-76a2-47a0-9150-c300fa350cc8", sdUrl: "https://panoramax.ign.fr/api/pictures/24908aa7-76a2-47a0-9150-c300fa350cc8/sd.jpg", az: 82 },
  // Marseille
  { lat: 43.71024, lng: 7.26193, panoId: "cb7d65ad-dab5-4f5f-84f2-ac4db075f244", sdUrl: "https://panoramax.ign.fr/api/pictures/cb7d65ad-dab5-4f5f-84f2-ac4db075f244/sd.jpg", az: 74 },
  // Nice
  { lat: 44.83742, lng: -0.57917, panoId: "383c89d6-8abe-4e74-b33e-26b3f7172c56", sdUrl: "https://panoramax.ign.fr/api/pictures/383c89d6-8abe-4e74-b33e-26b3f7172c56/sd.jpg", az: 85 },
  // Bordeaux
  { lat: 43.60461, lng: 1.44371, panoId: "67bd2c6a-8530-42be-83c8-910ea19fcc6c", sdUrl: "https://panoramax.openstreetmap.fr/derivates/67/bd/2c/6a/8530-42be-83c8-910ea19fcc6c/sd.jpg", az: 352 },
  // Toulouse
  { lat: 51.5345, lng: -0.17604, panoId: "746d6095-a1bc-4966-aa6d-5f17c62a7453", sdUrl: "https://panoramax-ulm.jjbaur.de/derivatives/74/6d/60/95/a1bc-4966-aa6d-5f17c62a7453/sd.jpg", az: 254 },
  // London
  { lat: 55.90258, lng: -3.13419, panoId: "dda564e2-82f9-44f2-883f-1e049c4048f9", sdUrl: "https://panoramax.openstreetmap.fr/derivates/dd/a5/64/e2/82f9-44f2-883f-1e049c4048f9/sd.jpg", az: 11 },
  // Edinburgh
  { lat: 53.34982, lng: -6.26016, panoId: "83779d4e-dbee-4c06-897b-417ab368d2f7", sdUrl: "https://panoramax.openstreetmap.fr/derivates/83/77/9d/4e/dbee-4c06-897b-417ab368d2f7/sd.jpg", az: 244 },
  // Dublin
  { lat: 52.52114, lng: 13.41313, panoId: "ed009b56-97c5-4129-b912-876b271f2021", sdUrl: "https://panoramax.openstreetmap.fr/derivates/ed/00/9b/56/97c5-4129-b912-876b271f2021/sd.jpg", az: 108 },
  // Berlin
  { lat: 48.1385, lng: 11.57928, panoId: "de710241-3abd-43d2-aefd-7fa1e84759a2", sdUrl: "https://panoramax.openstreetmap.fr/derivates/de/71/02/41/3abd-43d2-aefd-7fa1e84759a2/sd.jpg", az: 0 },
  // Munich
  { lat: 53.55058, lng: 9.99588, panoId: "6885877f-5c19-42cc-9c46-93d2a48ba95a", sdUrl: "https://panoramax.openstreetmap.fr/derivates/68/85/87/7f/5c19-42cc-9c46-93d2a48ba95a/sd.jpg", az: 159 },
  // Hamburg
  { lat: 41.89094, lng: 12.4919, panoId: "20aae997-0c7b-4877-87cb-a42e155f2fb8", sdUrl: "https://images.panoramax.basi.re/derivates/20/aa/e9/97/0c7b-4877-87cb-a42e155f2fb8/sd.jpg", az: 0 },
  // Rome
  { lat: 45.50848, lng: 9.18973, panoId: "26078e8a-6349-49d1-90b9-23414e553324", sdUrl: "https://panoramax.openstreetmap.fr/derivates/26/07/8e/8a/6349-49d1-90b9-23414e553324/sd.jpg", az: 315 },
  // Milan
  { lat: 40.41955, lng: -3.71125, panoId: "93325738-6d39-4d9d-b121-299290b8a4cc", sdUrl: "https://panoramax.openstreetmap.es/derivatives/93/32/57/38/6d39-4d9d-b121-299290b8a4cc/sd.jpg", az: 242 },
  // Madrid
  { lat: 38.71785, lng: -9.14373, panoId: "7b817f17-3702-4513-9415-5219f7503ab8", sdUrl: "https://panoramax.openstreetmap.fr/derivates/7b/81/7f/17/3702-4513-9415-5219f7503ab8/sd.jpg", az: 163 },
  // Lisbon
  { lat: 51.86256, lng: 4.53629, panoId: "8e8b197a-fb0d-47d6-83db-297c2a33dc94", sdUrl: "https://panoramax.openstreetmap.fr/derivates/8e/8b/19/7a/fb0d-47d6-83db-297c2a33dc94/sd.jpg", az: 178 },
  // Amsterdam
  { lat: 50.8503, lng: 4.3517, panoId: "e6932471-7160-442d-a6cd-97e885e72317", sdUrl: "https://panoramax.openstreetmap.fr/derivates/e6/93/24/71/7160-442d-a6cd-97e885e72317/sd.jpg", az: 74 },
  // Brussels
  { lat: 47.3771, lng: 8.54175, panoId: "2fd5c73d-450b-4f90-b7a7-b7052bf531e5", sdUrl: "https://images.panoramax.basi.re/derivates/2f/d5/c7/3d/450b-4f90-b7a7-b7052bf531e5/sd.jpg", az: 280 },
  // Zurich
  { lat: 48.19567, lng: 16.37373, panoId: "4aaac766-c461-41f5-9c43-e75aedc34fe6", sdUrl: "https://panoramax.openstreetmap.fr/derivates/4a/aa/c7/66/c461-41f5-9c43-e75aedc34fe6/sd.jpg", az: 317 },
  // Vienna
  { lat: 50.13222, lng: 14.49839, panoId: "3e2019aa-8676-453e-a3ec-431ec966bd33", sdUrl: "https://panoramax.openstreetmap.fr/derivates/3e/20/19/aa/8676-453e-a3ec-431ec966bd33/sd.jpg", az: 133 },
  // Prague
  { lat: 45.79257, lng: 16.00403, panoId: "946ccc93-9cbe-4e4c-bf33-260a1a3cf9a5", sdUrl: "https://panoramax.osm-hr.org/derivatives/94/6c/cc/93/9cbe-4e4c-bf33-260a1a3cf9a5/sd.jpg", az: 262 },
  // Zagreb
  { lat: 59.90845, lng: 10.75042, panoId: "2620c654-47ff-485d-ad1f-a70177193198", sdUrl: "https://images.panoramax.basi.re/derivates/26/20/c6/54/47ff-485d-ad1f-a70177193198/sd.jpg", az: 236 },
  // Oslo
  { lat: 59.33384, lng: 18.0705, panoId: "acef2e95-5271-4ad6-a8c4-179f416f2760", sdUrl: "https://images.panoramax.basi.re/derivates/ac/ef/2e/95/5271-4ad6-a8c4-179f416f2760/sd.jpg", az: 127 },
  // Stockholm
  { lat: 60.18477, lng: 24.82424, panoId: "374cd5c1-ff35-4ec1-96cc-e7437a998288", sdUrl: "https://panoramax.openstreetmap.fr/derivates/37/4c/d5/c1/ff35-4ec1-96cc-e7437a998288/sd.jpg", az: 231 },
  // Helsinki
  { lat: 54.67706, lng: 25.26563, panoId: "c8fffca0-0c72-49d6-a0d0-c0b638fe7f9b", sdUrl: "https://panoramax.openstreetmap.fr/derivates/c8/ff/fc/a0/0c72-49d6-a0d0-c0b638fe7f9b/sd.jpg", az: 73 },
  // Vilnius
  { lat: 41.01131, lng: 28.97491, panoId: "3ea284f4-c0bd-4065-88e4-b9d70d438d7a", sdUrl: "https://panoramax.openstreetmap.fr/derivates/3e/a2/84/f4/c0bd-4065-88e4-b9d70d438d7a/sd.jpg", az: 40 },
  // Istanbul
  { lat: 63.92991, lng: -21.9942, panoId: "26e6516b-ba04-4e5c-967b-8a932e8e6d5e", sdUrl: "https://panoramax.ign.fr/api/pictures/26e6516b-ba04-4e5c-967b-8a932e8e6d5e/sd.jpg", az: 199 }
  // Iceland (Reykjavik area)
];
var AMERICAS_COORDS = [
  { lat: 40.77602, lng: -73.97118, panoId: "ae88e407-0679-4da5-817f-ab4e5f427ed5", sdUrl: "https://panoramax.openstreetmap.fr/derivates/ae/88/e4/07/0679-4da5-817f-ab4e5f427ed5/sd.jpg", az: 208 },
  // New York City
  { lat: 41.72764, lng: -87.81138, panoId: "54e97742-cc08-4363-9ba0-aacd7fb7c6f4", sdUrl: "https://panoramax.openstreetmap.fr/derivates/54/e9/77/42/cc08-4363-9ba0-aacd7fb7c6f4/sd.jpg", az: 142 },
  // Chicago
  { lat: 42.37322, lng: -71.08601, panoId: "083b79fd-db57-411e-8d9f-474e460c899e", sdUrl: "https://panoramax.openstreetmap.fr/derivates/08/3b/79/fd/db57-411e-8d9f-474e460c899e/sd.jpg", az: 207 },
  // Boston
  { lat: 30.26708, lng: -97.74319, panoId: "85c8dc83-68d6-4bfa-82a5-0e19ca6d0a72", sdUrl: "https://panoramax.openstreetmap.fr/derivates/85/c8/dc/83/68d6-4bfa-82a5-0e19ca6d0a72/sd.jpg", az: 103 },
  // Austin
  { lat: 32.95128, lng: -117.06764, panoId: "ba82bf8a-f2ef-4213-9014-eb52320ee345", sdUrl: "https://panoramax.mapcomplete.org/derivatives/ba/82/bf/8a/f2ef-4213-9014-eb52320ee345/sd.jpg", az: 82 },
  // San Diego area
  { lat: 39.90903, lng: -105.14816, panoId: "2efb820a-c0ce-40db-9492-e745720a2633", sdUrl: "https://panoramax-ulm.jjbaur.de/derivatives/2e/fb/82/0a/c0ce-40db-9492-e745720a2633/sd.jpg", az: 273 },
  // Denver area
  { lat: 45.52342, lng: -73.62282, panoId: "cf789ab0-3e7d-4e8c-a558-42ef71383f5e", sdUrl: "https://panoramax.openstreetmap.fr/derivates/cf/78/9a/b0/3e7d-4e8c-a558-42ef71383f5e/sd.jpg", az: -77 },
  // Montreal
  { lat: -34.62302, lng: -58.38225, panoId: "72043c78-cd89-45a9-ba6d-d6ad383f1aca", sdUrl: "https://panoramax.libre.net.ar/derivatives/72/04/3c/78/cd89-45a9-ba6d-d6ad383f1aca/sd.jpg", az: 91 },
  // Buenos Aires
  { lat: -31.42033, lng: -64.18882, panoId: "a22aec31-a4c5-4b2c-8f42-0b84b93eb1b8", sdUrl: "https://panoramax.libre.net.ar/derivatives/a2/2a/ec/31/a4c5-4b2c-8f42-0b84b93eb1b8/sd.jpg", az: 98 },
  // Cordoba
  { lat: -32.94426, lng: -60.65058, panoId: "9f46061f-7d50-4c00-abe8-e358c7c3c392", sdUrl: "https://panoramax.openstreetmap.fr/derivates/9f/46/06/1f/7d50-4c00-abe8-e358c7c3c392/sd.jpg", az: 97 },
  // Rosario
  { lat: -32.88838, lng: -68.8456, panoId: "caa0f6e5-dc16-4c46-9a83-76e3f00cf571", sdUrl: "https://panoramax.libre.net.ar/derivatives/ca/a0/f6/e5/dc16-4c46-9a83-76e3f00cf571/sd.jpg", az: 280 },
  // Mendoza
  { lat: -34.92403, lng: -57.95076, panoId: "d1d369f9-f4f9-4f6b-9bb0-ea55fabca09e", sdUrl: "https://panoramax.libre.net.ar/derivatives/d1/d3/69/f9/f4f9-4f6b-9bb0-ea55fabca09e/sd.jpg", az: 226 },
  // La Plata
  { lat: -37.98753, lng: -57.56846, panoId: "d49f08a2-0ec3-47c5-a57e-c0e7167fa22c", sdUrl: "https://panoramax.libre.net.ar/derivatives/d4/9f/08/a2/0ec3-47c5-a57e-c0e7167fa22c/sd.jpg", az: 215 },
  // Mar del Plata
  { lat: 16.23992, lng: -61.53234, panoId: "f4faab38-727d-4d17-a8c3-afea3e554fe3", sdUrl: "https://panoramax.ign.fr/api/pictures/f4faab38-727d-4d17-a8c3-afea3e554fe3/sd.jpg", az: 259 },
  // Guadeloupe
  { lat: 14.61268, lng: -61.0532, panoId: "09956548-92e7-4800-a89c-3adf7906a8ad", sdUrl: "https://panoramax.ign.fr/api/pictures/09956548-92e7-4800-a89c-3adf7906a8ad/sd.jpg", az: 299 }
  // Martinique
];
var ASIA_OCEANIA_COORDS = [
  { lat: 25.03292, lng: 121.56548, panoId: "1e2296c7-470d-4a57-af05-70886286e4bb", sdUrl: "https://panoramax.osm.tw/api/pictures/1e2296c7-470d-4a57-af05-70886286e4bb/sd.jpg", az: 360 },
  // Taipei
  { lat: 25.12763, lng: 121.73882, panoId: "2648b32f-fa62-4bfa-985a-68be5a1622c1", sdUrl: "https://panoramax.osm.tw/api/pictures/2648b32f-fa62-4bfa-985a-68be5a1622c1/sd.jpg", az: 213 },
  // Keelung
  { lat: 24.81376, lng: 120.9675, panoId: "ea395564-3307-4c86-a3ca-a5a8f8e88f5b", sdUrl: "https://panoramax.osm.tw/api/pictures/ea395564-3307-4c86-a3ca-a5a8f8e88f5b/sd.jpg", az: 322 },
  // Hsinchu
  { lat: 24.17466, lng: 120.67116, panoId: "1763ec95-17cd-4374-964f-f7190ddf70c2", sdUrl: "https://panoramax.osm.tw/api/pictures/1763ec95-17cd-4374-964f-f7190ddf70c2/sd.jpg", az: 152 },
  // Taichung
  { lat: 23.49286, lng: 120.33758, panoId: "a4dc6cb2-f75c-44d4-ae5c-a45c220b1eba", sdUrl: "https://panoramax.osm.tw/api/pictures/a4dc6cb2-f75c-44d4-ae5c-a45c220b1eba/sd.jpg", az: 3 },
  // Chiayi
  { lat: 22.99999, lng: 120.22728, panoId: "7a9d5073-7dde-4390-bfe3-a77582b5ca64", sdUrl: "https://panoramax.osm.tw/api/pictures/7a9d5073-7dde-4390-bfe3-a77582b5ca64/sd.jpg", az: 289 },
  // Tainan
  { lat: 22.62706, lng: 120.30148, panoId: "44bc821c-148f-495a-b36d-bbad4e4c0e8d", sdUrl: "https://panoramax.osm.tw/api/pictures/44bc821c-148f-495a-b36d-bbad4e4c0e8d/sd.jpg", az: 186 },
  // Kaohsiung
  { lat: 24.75161, lng: 121.75211, panoId: "0ccb1f96-69d6-409e-b790-5cde4e802d29", sdUrl: "https://panoramax.osm.tw/api/pictures/0ccb1f96-69d6-409e-b790-5cde4e802d29/sd.jpg", az: 157 },
  // Yilan
  { lat: 22.37739, lng: 114.30044, panoId: "68e64dca-0484-4db1-84ce-6089e08ff12a", sdUrl: "https://panoramax.osm.tw/api/pictures/68e64dca-0484-4db1-84ce-6089e08ff12a/sd.jpg", az: -136 },
  // Hong Kong
  { lat: 14.53271, lng: 121.18648, panoId: "24dc58b8-6eff-4913-afd6-dd00939afc75", sdUrl: "https://panoramax.openstreetmap.fr/derivates/24/dc/58/b8/6eff-4913-afd6-dd00939afc75/sd.jpg", az: 205 },
  // Manila area
  { lat: 5.41157, lng: 100.34504, panoId: "2183a67b-0296-4554-be65-a5dbc84d7b43", sdUrl: "https://panoramax.openstreetmap.fr/derivates/21/83/a6/7b/0296-4554-be65-a5dbc84d7b43/sd.jpg", az: 148 },
  // Penang
  { lat: 12.95923, lng: 77.71695, panoId: "81d93d34-9673-49bd-9866-2b3af51d6978", sdUrl: "https://panoramax.openstreetmap.fr/derivates/81/d9/3d/34/9673-49bd-9866-2b3af51d6978/sd.jpg", az: 8 },
  // Bengaluru
  { lat: -33.89127, lng: 151.15831, panoId: "9dd659f3-17f4-4fd7-879b-10d34b857e9f", sdUrl: "https://images.panoramax.basi.re/derivates/9d/d6/59/f3/17f4-4fd7-879b-10d34b857e9f/sd.jpg", az: 327 },
  // Sydney
  { lat: -36.84682, lng: 174.76381, panoId: "63645e57-5630-4e09-96f8-517ddca6fa14", sdUrl: "https://panoramax.osm.tw/api/pictures/63645e57-5630-4e09-96f8-517ddca6fa14/sd.jpg", az: 289 },
  // Auckland
  { lat: -41.23626, lng: 174.97946, panoId: "b5a285f9-2efb-43b0-9edb-714ce153530a", sdUrl: "https://panoramax.openstreetmap.fr/derivates/b5/a2/85/f9/2efb-43b0-9edb-714ce153530a/sd.jpg", az: 121 },
  // Wellington
  { lat: -43.52853, lng: 172.63521, panoId: "cb61f7f5-d7f8-4420-89a3-34d245106d01", sdUrl: "https://panoramax.openstreetmap.fr/derivates/cb/61/f7/f5/d7f8-4420-89a3-34d245106d01/sd.jpg", az: 160 },
  // Christchurch
  { lat: -17.5399, lng: -149.56911, panoId: "2d7de6ae-529b-4964-8bc8-bf78c6942c3f", sdUrl: "https://panoramax.openstreetmap.fr/derivates/2d/7d/e6/ae/529b-4964-8bc8-bf78c6942c3f/sd.jpg", az: 228 },
  // Tahiti
  { lat: 35.66792, lng: 139.69162, panoId: "9cb667de-032e-4e11-be6e-47e78d66538c", sdUrl: "https://panoramax.osm.tw/api/pictures/9cb667de-032e-4e11-be6e-47e78d66538c/sd.jpg", az: 234 },
  // Tokyo
  { lat: 35.01747, lng: 135.76763, panoId: "e30d6e0e-d4ea-4941-bec6-c41d6a330eec", sdUrl: "https://panoramax.osm.tw/api/pictures/e30d6e0e-d4ea-4941-bec6-c41d6a330eec/sd.jpg", az: 268 }
  // Kyoto
];
var LANDMARK_COORDS = [
  { lat: 48.8577, lng: 2.29505, panoId: "65cf20e0-6f2b-4b45-af73-e075de8b85aa", sdUrl: "https://panoramax.openstreetmap.fr/derivates/65/cf/20/e0/6f2b-4b45-af73-e075de8b85aa/sd.jpg", az: 53 },
  // Eiffel Tower, Paris
  { lat: 41.89094, lng: 12.4919, panoId: "20aae997-0c7b-4877-87cb-a42e155f2fb8", sdUrl: "https://images.panoramax.basi.re/derivates/20/aa/e9/97/0c7b-4877-87cb-a42e155f2fb8/sd.jpg", az: 0 },
  // Colosseum, Rome
  { lat: 40.77602, lng: -73.97118, panoId: "ae88e407-0679-4da5-817f-ab4e5f427ed5", sdUrl: "https://panoramax.openstreetmap.fr/derivates/ae/88/e4/07/0679-4da5-817f-ab4e5f427ed5/sd.jpg", az: 208 },
  // Central Park / NYC
  { lat: 35.66792, lng: 139.69162, panoId: "9cb667de-032e-4e11-be6e-47e78d66538c", sdUrl: "https://panoramax.osm.tw/api/pictures/9cb667de-032e-4e11-be6e-47e78d66538c/sd.jpg", az: 234 },
  // Shibuya, Tokyo
  { lat: -33.89127, lng: 151.15831, panoId: "9dd659f3-17f4-4fd7-879b-10d34b857e9f", sdUrl: "https://images.panoramax.basi.re/derivates/9d/d6/59/f3/17f4-4fd7-879b-10d34b857e9f/sd.jpg", az: 327 },
  // Sydney
  { lat: 51.5345, lng: -0.17604, panoId: "746d6095-a1bc-4966-aa6d-5f17c62a7453", sdUrl: "https://panoramax-ulm.jjbaur.de/derivatives/74/6d/60/95/a1bc-4966-aa6d-5f17c62a7453/sd.jpg", az: 254 },
  // London
  { lat: 52.51851, lng: 13.37631, panoId: "67558008-224d-43d6-8b25-f083698fa5fa", sdUrl: "https://panoramax.openstreetmap.fr/derivates/67/55/80/08/224d-43d6-8b25-f083698fa5fa/sd.jpg", az: 351 },
  // Brandenburg Gate, Berlin
  { lat: 25.03318, lng: 121.56452, panoId: "d2e37876-cbed-4716-b6c6-bd70db515fd2", sdUrl: "https://panoramax.osm.tw/api/pictures/d2e37876-cbed-4716-b6c6-bd70db515fd2/sd.jpg", az: 89 },
  // Taipei 101
  { lat: 34.96796, lng: 135.77214, panoId: "5dd697e1-ee92-416b-bc81-0871896a371f", sdUrl: "https://panoramax.osm.tw/api/pictures/5dd697e1-ee92-416b-bc81-0871896a371f/sd.jpg", az: 24 },
  // Fushimi Inari, Kyoto
  { lat: 50.13852, lng: 14.49285, panoId: "6d1a91e1-2740-461e-9464-2fefb15334f1", sdUrl: "https://panoramax.openstreetmap.fr/derivates/6d/1a/91/e1/2740-461e-9464-2fefb15334f1/sd.jpg", az: 143 },
  // Prague
  { lat: 51.05569, lng: 3.72029, panoId: "518376bd-c55a-4cea-b36f-8977ba7a74a0", sdUrl: "https://panoramax.openstreetmap.fr/derivates/51/83/76/bd/c55a-4cea-b36f-8977ba7a74a0/sd.jpg", az: 154 },
  // Amsterdam Center
  { lat: 38.71785, lng: -9.14373, panoId: "7b817f17-3702-4513-9415-5219f7503ab8", sdUrl: "https://panoramax.openstreetmap.fr/derivates/7b/81/7f/17/3702-4513-9415-5219f7503ab8/sd.jpg", az: 163 },
  // Lisbon
  { lat: 60.18477, lng: 24.82424, panoId: "374cd5c1-ff35-4ec1-96cc-e7437a998288", sdUrl: "https://panoramax.openstreetmap.fr/derivates/37/4c/d5/c1/ff35-4ec1-96cc-e7437a998288/sd.jpg", az: 231 },
  // Helsinki
  { lat: 59.32416, lng: 18.06628, panoId: "98d2a9f6-5ce0-45a0-bc9e-7eee60913a99", sdUrl: "https://images.panoramax.basi.re/derivates/98/d2/a9/f6/5ce0-45a0-bc9e-7eee60913a99/sd.jpg", az: 150 },
  // Stockholm
  { lat: 48.19567, lng: 16.37373, panoId: "4aaac766-c461-41f5-9c43-e75aedc34fe6", sdUrl: "https://panoramax.openstreetmap.fr/derivates/4a/aa/c7/66/c461-41f5-9c43-e75aedc34fe6/sd.jpg", az: 317 },
  // Vienna
  { lat: 35.4896, lng: 138.79514, panoId: "a332b9bc-c74e-4c82-a7b7-9cf50900f1b6", sdUrl: "https://panoramax.osm.tw/api/pictures/a332b9bc-c74e-4c82-a7b7-9cf50900f1b6/sd.jpg", az: 130 },
  // Mt. Fuji area
  { lat: 41.01131, lng: 28.97491, panoId: "3ea284f4-c0bd-4065-88e4-b9d70d438d7a", sdUrl: "https://panoramax.openstreetmap.fr/derivates/3e/a2/84/f4/c0bd-4065-88e4-b9d70d438d7a/sd.jpg", az: 40 }
  // Istanbul
];
var EXTRA_WORLD_COORDS = [
  { lat: -20.87875, lng: 55.4486, panoId: "4e2d7d50-a298-4bef-aeb4-44fcca58126b", sdUrl: "https://panoramax-storage-public-fast.s3.gra.perf.cloud.ovh.net/derivates/4e/2d/7d/50/a298-4bef-aeb4-44fcca58126b/sd.jpg", az: 341 },
  // Reunion Island (Indian Ocean)
  { lat: -17.5399, lng: -149.56911, panoId: "2d7de6ae-529b-4964-8bc8-bf78c6942c3f", sdUrl: "https://panoramax.openstreetmap.fr/derivates/2d/7d/e6/ae/529b-4964-8bc8-bf78c6942c3f/sd.jpg", az: 228 },
  // Tahiti (South Pacific)
  { lat: 16.23992, lng: -61.53234, panoId: "f4faab38-727d-4d17-a8c3-afea3e554fe3", sdUrl: "https://panoramax.ign.fr/api/pictures/f4faab38-727d-4d17-a8c3-afea3e554fe3/sd.jpg", az: 259 },
  // Guadeloupe (Caribbean)
  { lat: 59.42516, lng: 24.71734, panoId: "78c4a141-3108-4449-8ee8-e4ce7c77d7b2", sdUrl: "https://panoramax.openstreetmap.fr/derivates/78/c4/a1/41/3108-4449-8ee8-e4ce7c77d7b2/sd.jpg", az: 0 }
  // Tallinn
];
var GEOGUESSR_MAPS = {
  world: {
    id: "world",
    nameJa: "World (\u4E16\u754C\u4E00\u5468)",
    nameEn: "World",
    descJa: "\u4E16\u754C\u4E2D\u306E\u90FD\u5E02\u30FB\u7530\u820E\u9053\u30FB\u6D77\u5CB8\u7DDA\u304C\u30E9\u30F3\u30C0\u30E0\u306B\u51FA\u984C\u3055\u308C\u308B\u5B9A\u756A\u30DE\u30C3\u30D7",
    descEn: "Explore roads, towns, and landscapes across all continents.",
    scaleKm: 2e3,
    defaultCenter: { lat: 20, lng: 10 },
    defaultZoom: 2,
    accentFrom: "#10b981",
    accentTo: "#0284c7",
    coords: [
      ...JAPAN_COORDS.slice(0, 10),
      ...EUROPE_COORDS.slice(0, 16),
      ...AMERICAS_COORDS.slice(0, 12),
      ...ASIA_OCEANIA_COORDS.slice(0, 12),
      ...EXTRA_WORLD_COORDS
    ]
  },
  japan: {
    id: "japan",
    nameJa: "Japan (\u65E5\u672C\u5168\u571F)",
    nameEn: "Japan",
    descJa: "\u6771\u5317\u30FB\u95A2\u6771\u30FB\u4E2D\u90E8\u30FB\u95A2\u897F\u307E\u3067\u65E5\u672C\u5404\u5730\u306E\u8857\u4E26\u307F\u3084\u8857\u9053\u3092\u63A2\u7D22",
    descEn: "Explore Japanese cities, towns, mountain passes, and coastlines.",
    scaleKm: 350,
    defaultCenter: { lat: 36.2048, lng: 138.2529 },
    defaultZoom: 5,
    accentFrom: "#f43f5e",
    accentTo: "#fb7185",
    coords: JAPAN_COORDS
  },
  europe: {
    id: "europe",
    nameJa: "Europe (\u30E8\u30FC\u30ED\u30C3\u30D1)",
    nameEn: "Europe",
    descJa: "\u6A19\u8B58\u30FB\u8A00\u8A9E\u30FB\u5EFA\u7BC9\u69D8\u5F0F\u304C\u591A\u5F69\u306A\u6B27\u5DDE\u5168\u57DF\u30DE\u30C3\u30D7",
    descEn: "Diverse road signs, architecture, and coastal routes across Europe.",
    scaleKm: 650,
    defaultCenter: { lat: 50.1109, lng: 10.5 },
    defaultZoom: 4,
    accentFrom: "#3b82f6",
    accentTo: "#6366f1",
    coords: EUROPE_COORDS
  },
  americas: {
    id: "americas",
    nameJa: "Americas (\u5357\u5317\u30A2\u30E1\u30EA\u30AB)",
    nameEn: "Americas",
    descJa: "\u5317\u7C73\u30FB\u30AB\u30EA\u30D6\u30FB\u5357\u7C73\u306E\u5927\u9678\u6A2A\u65AD\u30C1\u30E3\u30EC\u30F3\u30B8",
    descEn: "Highways, cities, and coastal routes from North to South America.",
    scaleKm: 1300,
    defaultCenter: { lat: 12, lng: -75 },
    defaultZoom: 2,
    accentFrom: "#f59e0b",
    accentTo: "#ea580c",
    coords: AMERICAS_COORDS
  },
  asia: {
    id: "asia",
    nameJa: "Asia & Oceania (\u30A2\u30B8\u30A2\u30FB\u30AA\u30BB\u30A2\u30CB\u30A2)",
    nameEn: "Asia & Oceania",
    descJa: "\u6771\u30A2\u30B8\u30A2\u30FB\u6771\u5357\u30A2\u30B8\u30A2\u30FB\u8C6A\u5DDE\u30FBNZ\u30FB\u5357\u592A\u5E73\u6D0B\u3092\u5DE1\u308B\u30DE\u30C3\u30D7",
    descEn: "Explore East & Southeast Asia alongside Australia and New Zealand.",
    scaleKm: 1100,
    defaultCenter: { lat: 8, lng: 118 },
    defaultZoom: 3,
    accentFrom: "#14b8a6",
    accentTo: "#0ea5e9",
    coords: ASIA_OCEANIA_COORDS
  },
  landmarks: {
    id: "landmarks",
    nameJa: "Famous Landmarks (\u4E16\u754C\u306E\u7D76\u666F\u30FB\u540D\u6240)",
    nameEn: "Famous Landmarks",
    descJa: "\u4E16\u754C\u4E2D\u306E\u6709\u540D\u30B9\u30DD\u30C3\u30C8\u30FB\u89B3\u5149\u540D\u6240\u5468\u8FBA\u304B\u3089\u51FA\u984C",
    descEn: "Iconic plazas, monuments, and skylines around the world.",
    scaleKm: 2e3,
    defaultCenter: { lat: 24, lng: 12 },
    defaultZoom: 2,
    accentFrom: "#a855f7",
    accentTo: "#ec4899",
    coords: LANDMARK_COORDS
  }
};
function pickRandomMapLocations(mapId, count) {
  const cfg = GEOGUESSR_MAPS[mapId] || GEOGUESSR_MAPS.world;
  const pool = [...cfg.coords];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const selected = [];
  for (let i = 0; i < count; i++) {
    const base = pool[i % pool.length];
    selected.push({
      lat: base.lat,
      lng: base.lng,
      ...base.panoId ? { panoId: base.panoId } : {},
      ...base.sdUrl ? { sdUrl: base.sdUrl } : {},
      ...typeof base.az === "number" ? { az: base.az } : {},
      heading: Math.floor(Math.random() * 360)
    });
  }
  return selected;
}

// server.ts
import_dotenv.default.config();
var geoRooms = /* @__PURE__ */ new Map();
var geoQueue = [];
function generateGeoRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return geoRooms.has(code) ? generateGeoRoomCode() : code;
}
function serializeGeoRoom(room, viewerId) {
  const isRevealPhase = room.status === "round_result" || room.status === "match_over";
  const lastRound = room.history.length > 0 ? room.history[room.history.length - 1] : null;
  return {
    roomCode: room.roomCode,
    hostId: room.hostId,
    youId: viewerId,
    format: room.format,
    mapId: room.mapId,
    moveMode: room.moveMode,
    roundTimeSec: room.roundTimeSec,
    status: room.status,
    currentRound: room.currentRound,
    maxRounds: room.maxRounds,
    multiplier: room.format === "duels" ? getDuelMultiplier(room.currentRound) : 1,
    target: room.status === "lobby" ? null : isRevealPhase ? room.target : {
      lat: room.target.lat,
      lng: room.target.lng,
      heading: room.target.heading,
      panoId: room.target.panoId,
      sdUrl: room.target.sdUrl,
      az: room.target.az
    },
    roundStartedAt: room.roundStartedAt,
    roundDeadlineAt: room.roundDeadlineAt,
    countdownEndAt: room.countdownEndAt,
    winnerId: room.winnerId,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      hp: p.hp,
      totalScore: p.totalScore,
      hasGuessed: p.guess !== null,
      guess: isRevealPhase || p.id === viewerId ? p.guess : null,
      readyForNext: p.readyForNext,
      wantsRematch: p.wantsRematch,
      connected: p.connected
    })),
    lastRound,
    history: isRevealPhase ? room.history : []
  };
}
function broadcastGeoRoom(room) {
  room.players.forEach((p) => {
    if (p.ws.readyState === import_ws.WebSocket.OPEN) {
      p.ws.send(
        JSON.stringify({
          type: "geo_room_state",
          room: serializeGeoRoom(room, p.id)
        })
      );
    }
  });
}
function startGeoRound(room, roundNumber) {
  const picked = pickRandomMapLocations(room.mapId, 1)[0];
  const now = Date.now();
  room.status = "playing";
  room.currentRound = roundNumber;
  room.target = {
    lat: picked.lat,
    lng: picked.lng,
    heading: picked.heading,
    panoId: picked.panoId,
    sdUrl: picked.sdUrl,
    az: picked.az
  };
  room.roundStartedAt = now;
  room.roundDeadlineAt = room.roundTimeSec > 0 ? now + room.roundTimeSec * 1e3 : null;
  room.countdownEndAt = null;
  room.players.forEach((p) => {
    p.guess = null;
    p.softPin = null;
    p.guessedAt = null;
    p.readyForNext = false;
    p.wantsRematch = false;
  });
  broadcastGeoRoom(room);
}
function resolveGeoRound(room) {
  if (room.status !== "playing") return;
  const mapCfg = GEOGUESSR_MAPS[room.mapId] || GEOGUESSR_MAPS.world;
  const multiplier = room.format === "duels" ? getDuelMultiplier(room.currentRound) : 1;
  room.players.forEach((p) => {
    if (!p.guess && p.softPin) {
      p.guess = p.softPin;
    }
  });
  const roundScores = room.players.map((p) => {
    if (!p.guess) {
      return { id: p.id, guess: null, distanceKm: null, score: 0 };
    }
    const distanceKm = haversineDistanceKm(p.guess, room.target);
    const score = calculateGeoScore(distanceKm, mapCfg.scaleKm);
    return { id: p.id, guess: p.guess, distanceKm, score };
  });
  const p0 = room.players[0];
  const p1 = room.players[1];
  const s0 = roundScores[0]?.score ?? 0;
  const s1 = roundScores[1]?.score ?? 0;
  if (p0) p0.totalScore += s0;
  if (p1) p1.totalScore += s1;
  let dmgTo0 = 0;
  let dmgTo1 = 0;
  if (room.format === "duels" && p0 && p1) {
    if (s0 > s1) {
      dmgTo1 = Math.round((s0 - s1) * multiplier);
      p1.hp = Math.max(0, p1.hp - dmgTo1);
    } else if (s1 > s0) {
      dmgTo0 = Math.round((s1 - s0) * multiplier);
      p0.hp = Math.max(0, p0.hp - dmgTo0);
    }
  }
  const results = {};
  if (p0) {
    results[p0.id] = {
      guess: roundScores[0].guess,
      distanceKm: roundScores[0].distanceKm,
      score: s0,
      damageDealt: dmgTo1,
      damageTaken: dmgTo0
    };
  }
  if (p1) {
    results[p1.id] = {
      guess: roundScores[1].guess,
      distanceKm: roundScores[1].distanceKm,
      score: s1,
      damageDealt: dmgTo0,
      damageTaken: dmgTo1
    };
  }
  room.history.push({
    roundNumber: room.currentRound,
    actual: { ...room.target },
    multiplier,
    results
  });
  if (room.format === "duels" && p0 && p1 && (p0.hp <= 0 || p1.hp <= 0)) {
    room.status = "match_over";
    room.winnerId = p0.hp > p1.hp ? p0.id : p1.id;
  } else if (room.format === "classic5" && room.currentRound >= room.maxRounds) {
    room.status = "match_over";
    if (p0 && p1) {
      if (p0.totalScore > p1.totalScore) room.winnerId = p0.id;
      else if (p1.totalScore > p0.totalScore) room.winnerId = p1.id;
      else room.winnerId = null;
    }
  } else {
    room.status = "round_result";
  }
  room.countdownEndAt = null;
  room.roundDeadlineAt = null;
  broadcastGeoRoom(room);
}
function removePlayerFromGeoQueue(playerId) {
  const idx = geoQueue.findIndex((q) => q.id === playerId);
  if (idx !== -1) {
    geoQueue.splice(idx, 1);
  }
}
function leavePlayerGeoRoom(playerId) {
  geoRooms.forEach((room, code) => {
    const idx = room.players.findIndex((p) => p.id === playerId);
    if (idx !== -1) {
      room.players.splice(idx, 1);
      if (room.players.length === 0) {
        geoRooms.delete(code);
      } else {
        room.hostId = room.players[0].id;
        room.players.forEach((remaining) => {
          if (remaining.ws.readyState === import_ws.WebSocket.OPEN) {
            remaining.ws.send(
              JSON.stringify({
                type: "geo_opponent_left",
                roomCode: code
              })
            );
          }
        });
        if (room.status === "playing" || room.status === "round_result") {
          room.status = "match_over";
          room.winnerId = room.players[0].id;
        }
        broadcastGeoRoom(room);
      }
    }
  });
}
setInterval(() => {
  const now = Date.now();
  geoRooms.forEach((room) => {
    if (room.status === "playing") {
      const effectiveDeadline = room.countdownEndAt && room.roundDeadlineAt ? Math.min(room.countdownEndAt, room.roundDeadlineAt) : room.countdownEndAt || room.roundDeadlineAt;
      if (effectiveDeadline && now >= effectiveDeadline) {
        resolveGeoRound(room);
      }
    }
  });
}, 500);
var app = (0, import_express.default)();
app.use(import_express.default.json({ limit: "10mb" }));
app.use(import_express.default.urlencoded({ extended: true, limit: "10mb" }));
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-admin-passcode");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});
var DB_FILE = import_path.default.join(process.cwd(), "wetalks_db.json");
var IMAGE_RETENTION_DAYS = 10;
var IMAGE_RETENTION_MS = IMAGE_RETENTION_DAYS * 24 * 60 * 60 * 1e3;
var ADMIN_PASSCODES = /* @__PURE__ */ new Set(["mozunbu1203"]);
function pruneExpiredWeTalksImages(db) {
  const now = Date.now();
  let pruned = 0;
  if (!Array.isArray(db.messages)) return 0;
  db.messages.forEach((m) => {
    if (m && m.image_base64) {
      const createdMs = Date.parse(m.created_at || "");
      if (!Number.isNaN(createdMs) && now - createdMs >= IMAGE_RETENTION_MS) {
        delete m.image_base64;
        m.image_expired = true;
        pruned++;
      }
    }
  });
  if (pruned > 0) {
    writeWeTalksDB(db);
  }
  return pruned;
}
function isAdminAuthorized(req) {
  const headerCode = req.headers["x-admin-passcode"];
  const queryCode = req.query.passcode;
  const bodyCode = req.body && req.body.passcode;
  const code = String(headerCode || queryCode || bodyCode || "").trim();
  return ADMIN_PASSCODES.has(code);
}
function readWeTalksDB() {
  const defaultRooms = [];
  try {
    if (import_fs.default.existsSync(DB_FILE)) {
      const data = import_fs.default.readFileSync(DB_FILE, "utf-8");
      const db = JSON.parse(data);
      if (!db.deleted_rooms) db.deleted_rooms = [];
      if (!Array.isArray(db.users)) db.users = [];
      if (!Array.isArray(db.messages)) db.messages = [];
      if (!db.rooms) {
        db.rooms = defaultRooms.filter((r) => !db.deleted_rooms.includes(r.id));
        writeWeTalksDB(db);
      } else {
        db.rooms = db.rooms.filter((r) => !db.deleted_rooms.includes(r.id));
      }
      pruneExpiredWeTalksImages(db);
      return db;
    }
  } catch (e) {
    console.error("Error reading wetalks db:", e);
  }
  const initialDB = { users: [], rooms: defaultRooms, messages: [], deleted_rooms: [] };
  writeWeTalksDB(initialDB);
  return initialDB;
}
function writeWeTalksDB(db) {
  try {
    import_fs.default.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (e) {
    console.error("Error writing wetalks db:", e);
  }
}
function hashPassword(password) {
  const salt = import_crypto.default.randomBytes(16).toString("hex");
  const derived = import_crypto.default.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}
function verifyPassword(password, user) {
  if (user.password_hash) {
    const [salt, storedHash] = user.password_hash.split(":");
    if (!salt || !storedHash) return false;
    const derived = import_crypto.default.scryptSync(password, salt, 64).toString("hex");
    try {
      return import_crypto.default.timingSafeEqual(Buffer.from(derived, "hex"), Buffer.from(storedHash, "hex"));
    } catch {
      return false;
    }
  }
  if (user.password_numeric) {
    return user.password_numeric === password;
  }
  return false;
}
function getRequestToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  if (req.body && req.body.token) {
    return String(req.body.token).trim();
  }
  return "";
}
function authenticateUser(req, db) {
  const token = getRequestToken(req);
  if (!token) return null;
  return db.users.find((u) => u.token && u.token === token) || null;
}
function isUserMemberOfRoom(room, username) {
  if (!room || !username || username === "\u30B2\u30B9\u30C8") return false;
  if (Array.isArray(room.members)) {
    return room.members.includes(username);
  }
  if (room.type === "direct" && room.name) {
    const parts = room.name.replace(/@/g, "").split(" & ");
    return parts.length === 2 && (parts[0] === username || parts[1] === username);
  }
  return false;
}
function markRoomMessagesAsRead(db, roomId, readerUsername) {
  if (!roomId || !readerUsername || readerUsername === "\u30B2\u30B9\u30C8") return 0;
  let updatedCount = 0;
  db.messages.forEach((m) => {
    if (m && m.room_id === roomId && m.sender !== readerUsername) {
      const current = Array.isArray(m.read_by) ? m.read_by.filter((u) => u && u !== m.sender) : [];
      if (!current.includes(readerUsername)) {
        current.push(readerUsername);
        m.read_by = current;
        updatedCount++;
      } else if (!Array.isArray(m.read_by)) {
        m.read_by = current;
      }
    }
  });
  if (updatedCount > 0) {
    writeWeTalksDB(db);
  }
  return updatedCount;
}
app.get("/api/wetalks/health", (req, res) => {
  res.json({ status: "ok", service: "WeTalks Express Server", time: (/* @__PURE__ */ new Date()).toISOString() });
});
app.get("/api/wetalks/users", (req, res) => {
  const db = readWeTalksDB();
  res.json(
    db.users.map((u) => ({
      username: u.username,
      avatar_base64: u.avatar_base64 || ""
    }))
  );
});
function handleRegisterUser(req, res) {
  const { username, password, password_numeric, avatar_base64 } = req.body || {};
  const cleanUsername = String(username || "").trim();
  const rawPassword = String(password ?? password_numeric ?? "").trim();
  if (!cleanUsername || !rawPassword) {
    return res.status(400).json({ error: "\u30E6\u30FC\u30B6\u30FC\u540D\u3068\u30D1\u30B9\u30EF\u30FC\u30C9\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002" });
  }
  if (cleanUsername === "\u30B2\u30B9\u30C8") {
    return res.status(400).json({ error: "\u3053\u306E\u30E6\u30FC\u30B6\u30FC\u540D\u306F\u4F7F\u7528\u3067\u304D\u307E\u305B\u3093\u3002" });
  }
  if (cleanUsername.length > 24) {
    return res.status(400).json({ error: "\u30E6\u30FC\u30B6\u30FC\u540D\u306F24\u6587\u5B57\u4EE5\u5185\u3067\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002" });
  }
  if (rawPassword.length < 4) {
    return res.status(400).json({ error: "\u30D1\u30B9\u30EF\u30FC\u30C9\u306F4\u6587\u5B57\u4EE5\u4E0A\u3067\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002" });
  }
  const db = readWeTalksDB();
  const lowerUser = cleanUsername.toLowerCase();
  if (db.users.some((u) => u.username.toLowerCase().trim() === lowerUser)) {
    return res.status(409).json({ error: "\u3053\u306E\u30E6\u30FC\u30B6\u30FC\u540D\u306F\u65E2\u306B\u767B\u9332\u3055\u308C\u3066\u3044\u307E\u3059\u3002" });
  }
  const token = import_crypto.default.randomBytes(24).toString("hex");
  const newUser = {
    id: "u-" + Date.now() + "-" + import_crypto.default.randomBytes(4).toString("hex"),
    username: cleanUsername,
    password_hash: hashPassword(rawPassword),
    token,
    avatar_base64: avatar_base64 || ""
  };
  db.users.push(newUser);
  writeWeTalksDB(db);
  res.json({
    success: true,
    token,
    user: {
      username: newUser.username,
      avatar_base64: newUser.avatar_base64
    }
  });
}
app.post("/api/wetalks/register", handleRegisterUser);
app.post("/api/wetalks/users", handleRegisterUser);
app.post("/api/wetalks/login", (req, res) => {
  const { username, password } = req.body || {};
  const cleanUsername = String(username || "").trim();
  const rawPassword = String(password || "").trim();
  if (!cleanUsername || !rawPassword) {
    return res.status(400).json({ error: "\u30E6\u30FC\u30B6\u30FC\u540D\u3068\u30D1\u30B9\u30EF\u30FC\u30C9\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002" });
  }
  const db = readWeTalksDB();
  const user = db.users.find((u) => u.username.toLowerCase().trim() === cleanUsername.toLowerCase());
  if (!user || !verifyPassword(rawPassword, user)) {
    return res.status(401).json({ error: "\u30E6\u30FC\u30B6\u30FC\u540D\u307E\u305F\u306F\u30D1\u30B9\u30EF\u30FC\u30C9\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093\u3002" });
  }
  if (!user.token) {
    user.token = import_crypto.default.randomBytes(24).toString("hex");
    writeWeTalksDB(db);
  }
  res.json({
    success: true,
    token: user.token,
    user: {
      username: user.username,
      avatar_base64: user.avatar_base64 || ""
    }
  });
});
app.get("/api/wetalks/auth/me", (req, res) => {
  const db = readWeTalksDB();
  const user = authenticateUser(req, db);
  if (!user) {
    return res.status(401).json({ error: "\u8A8D\u8A3C\u304C\u5FC5\u8981\u3067\u3059\u3002" });
  }
  res.json({
    success: true,
    user: {
      username: user.username,
      avatar_base64: user.avatar_base64 || ""
    }
  });
});
app.post("/api/wetalks/auth/me", (req, res) => {
  const db = readWeTalksDB();
  const user = authenticateUser(req, db);
  if (!user) {
    return res.status(401).json({ error: "\u8A8D\u8A3C\u304C\u5FC5\u8981\u3067\u3059\u3002" });
  }
  res.json({
    success: true,
    user: {
      username: user.username,
      avatar_base64: user.avatar_base64 || ""
    }
  });
});
app.post("/api/wetalks/users/avatar", (req, res) => {
  const { avatar_base64 } = req.body || {};
  const db = readWeTalksDB();
  const authUser = authenticateUser(req, db);
  if (!authUser) {
    return res.status(401).json({ error: "\u30ED\u30B0\u30A4\u30F3\u304C\u5FC5\u8981\u3067\u3059\u3002" });
  }
  authUser.avatar_base64 = avatar_base64 || "";
  writeWeTalksDB(db);
  return res.json({ success: true });
});
app.post("/api/wetalks/users/rename", (req, res) => {
  const { newUsername } = req.body || {};
  const newTrimmed = String(newUsername || "").trim();
  const db = readWeTalksDB();
  const authUser = authenticateUser(req, db);
  if (!authUser) {
    return res.status(401).json({ error: "\u30ED\u30B0\u30A4\u30F3\u304C\u5FC5\u8981\u3067\u3059\u3002\u518D\u30ED\u30B0\u30A4\u30F3\u3057\u3066\u304F\u3060\u3055\u3044\u3002" });
  }
  if (!newTrimmed) {
    return res.status(400).json({ error: "\u65B0\u3057\u3044\u30E6\u30FC\u30B6\u30FC\u540D\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002" });
  }
  if (newTrimmed === "\u30B2\u30B9\u30C8") {
    return res.status(400).json({ error: "\u3053\u306E\u30E6\u30FC\u30B6\u30FC\u540D\u306F\u4F7F\u7528\u3067\u304D\u307E\u305B\u3093\u3002" });
  }
  if (newTrimmed.length > 24) {
    return res.status(400).json({ error: "\u30E6\u30FC\u30B6\u30FC\u540D\u306F24\u6587\u5B57\u4EE5\u5185\u3067\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002" });
  }
  const oldName = authUser.username;
  if (newTrimmed === oldName) {
    return res.json({ success: true, username: newTrimmed });
  }
  const conflict = db.users.some(
    (u) => u !== authUser && u.username.toLowerCase().trim() === newTrimmed.toLowerCase()
  );
  if (conflict) {
    return res.status(409).json({ error: "\u3053\u306E\u30E6\u30FC\u30B6\u30FC\u540D\u306F\u65E2\u306B\u4F7F\u7528\u3055\u308C\u3066\u3044\u308B\u305F\u3081\u5909\u66F4\u3067\u304D\u307E\u305B\u3093\u3002" });
  }
  authUser.username = newTrimmed;
  db.messages.forEach((m) => {
    if (m.sender === oldName) {
      m.sender = newTrimmed;
    }
    if (m.reply_to && m.reply_to.sender === oldName) {
      m.reply_to.sender = newTrimmed;
    }
    if (Array.isArray(m.read_by) && m.read_by.includes(oldName)) {
      m.read_by = Array.from(new Set(m.read_by.map((r) => r === oldName ? newTrimmed : r).filter((r) => r && r !== m.sender)));
    }
  });
  db.rooms.forEach((r) => {
    if (r.created_by === oldName) {
      r.created_by = newTrimmed;
    }
    if (Array.isArray(r.members)) {
      r.members = Array.from(new Set(r.members.map((m) => m === oldName ? newTrimmed : m)));
    }
    if (r.type === "direct" && r.name) {
      const parts = r.name.replace(/@/g, "").split(" & ");
      if (parts.length === 2 && (parts[0] === oldName || parts[1] === oldName)) {
        const updatedParts = parts.map((p) => p === oldName ? newTrimmed : p).sort();
        r.name = "@" + updatedParts[0] + " & @" + updatedParts[1];
      }
    }
  });
  writeWeTalksDB(db);
  res.json({ success: true, username: newTrimmed });
});
var wetalksPresence = /* @__PURE__ */ new Map();
app.post("/api/wetalks/presence", (req, res) => {
  const { clientId, username, roomId, offline } = req.body || {};
  const db = readWeTalksDB();
  const authUser = authenticateUser(req, db);
  const resolvedName = authUser ? authUser.username : String(username || "").trim();
  const now = Date.now();
  if (offline && clientId) {
    wetalksPresence.delete(String(clientId));
  } else if (clientId && resolvedName && resolvedName !== "\u30B2\u30B9\u30C8") {
    wetalksPresence.set(String(clientId), {
      username: resolvedName,
      roomId: roomId ? String(roomId) : null,
      lastSeen: now
    });
  }
  for (const [key, val] of wetalksPresence.entries()) {
    if (now - val.lastSeen > 2e4) {
      wetalksPresence.delete(key);
    }
  }
  const activeClients = Array.from(wetalksPresence.values());
  const userMap = /* @__PURE__ */ new Map();
  activeClients.forEach((c) => {
    const uname = String(c.username || "").trim();
    if (uname && uname !== "\u30B2\u30B9\u30C8") {
      const k = uname.toLowerCase();
      if (!userMap.has(k)) userMap.set(k, uname);
    }
  });
  const onlineUsers = Array.from(userMap.values());
  const roomMembers = roomId ? Array.from(new Set(activeClients.filter((c) => c.roomId === roomId && c.username !== "\u30B2\u30B9\u30C8").map((c) => c.username))) : [];
  const fallbackSelf = !offline && resolvedName && resolvedName !== "\u30B2\u30B9\u30C8" ? 1 : 0;
  res.json({
    presenceSupported: true,
    onlineCount: onlineUsers.length > 0 ? onlineUsers.length : fallbackSelf,
    onlineUsers,
    roomMembers
  });
});
app.get("/api/wetalks/rooms", (req, res) => {
  const db = readWeTalksDB();
  const authUser = authenticateUser(req, db);
  if (!authUser) {
    return res.json([]);
  }
  const visibleRooms = db.rooms.filter((r) => isUserMemberOfRoom(r, authUser.username));
  res.json(visibleRooms);
});
app.post("/api/wetalks/rooms", (req, res) => {
  const { id, name, type, members } = req.body || {};
  if (!id || !name || !type) {
    return res.status(400).json({ error: "Missing fields" });
  }
  const db = readWeTalksDB();
  const authUser = authenticateUser(req, db);
  if (!authUser) {
    return res.status(401).json({ error: "\u30ED\u30B0\u30A4\u30F3\u304C\u5FC5\u8981\u3067\u3059\u3002" });
  }
  if (!db.deleted_rooms) db.deleted_rooms = [];
  db.deleted_rooms = db.deleted_rooms.filter((delId) => delId !== id);
  if (type === "direct") {
    const memberSet2 = /* @__PURE__ */ new Set([authUser.username]);
    if (Array.isArray(members)) {
      members.forEach((m) => {
        const s = String(m || "").trim();
        if (s && s !== "\u30B2\u30B9\u30C8") memberSet2.add(s);
      });
    }
    if (memberSet2.size < 2 && typeof name === "string") {
      const parts = name.replace(/@/g, "").split(" & ").map((s) => s.trim()).filter(Boolean);
      parts.forEach((p) => {
        if (p !== "\u30B2\u30B9\u30C8") memberSet2.add(p);
      });
    }
    const finalMembers = Array.from(memberSet2).slice(0, 2);
    if (finalMembers.length !== 2) {
      return res.status(400).json({ error: "1\u5BFE1\u30C8\u30FC\u30AF\u306B\u306F\u76F8\u624B\u306E\u30E6\u30FC\u30B6\u30FC\u304C\u5FC5\u8981\u3067\u3059\u3002" });
    }
    const sorted = [...finalMembers].sort();
    const canonicalName = "@" + sorted[0] + " & @" + sorted[1];
    const existingDirect = db.rooms.find((r) => {
      if (r.type !== "direct") return false;
      if (Array.isArray(r.members) && r.members.length === 2) {
        return r.members.includes(sorted[0]) && r.members.includes(sorted[1]);
      }
      return r.name === canonicalName;
    });
    if (existingDirect) {
      if (!Array.isArray(existingDirect.members)) {
        existingDirect.members = sorted;
        writeWeTalksDB(db);
      }
      return res.json({ success: true, room: existingDirect });
    }
    const existingById = db.rooms.find((r) => r.id === id);
    if (existingById) {
      return res.json({ success: true, room: existingById });
    }
    const newDirectRoom = {
      id,
      name: canonicalName,
      type: "direct",
      members: sorted,
      created_by: authUser.username
    };
    db.rooms.push(newDirectRoom);
    writeWeTalksDB(db);
    return res.json({ success: true, room: newDirectRoom });
  }
  const existing = db.rooms.find((r) => r.id === id);
  if (existing) {
    if (!isUserMemberOfRoom(existing, authUser.username)) {
      return res.status(403).json({ error: "\u3053\u306E\u30EB\u30FC\u30E0\u306B\u30A2\u30AF\u30BB\u30B9\u3059\u308B\u6A29\u9650\u304C\u3042\u308A\u307E\u305B\u3093\u3002" });
    }
    return res.json({ success: true, room: existing });
  }
  const registeredUsernames = new Set(db.users.map((u) => u.username));
  const memberSet = /* @__PURE__ */ new Set([authUser.username]);
  if (Array.isArray(members)) {
    members.forEach((m) => {
      const s = String(m || "").trim();
      if (s && s !== "\u30B2\u30B9\u30C8" && registeredUsernames.has(s)) {
        memberSet.add(s);
      }
    });
  }
  const newRoom = {
    id,
    name: String(name).trim(),
    type: "group",
    members: Array.from(memberSet),
    created_by: authUser.username
  };
  db.rooms.push(newRoom);
  writeWeTalksDB(db);
  res.json({ success: true, room: newRoom });
});
app.post("/api/wetalks/rooms/:id/invite", (req, res) => {
  const { id } = req.params;
  const { members, username } = req.body || {};
  const db = readWeTalksDB();
  const authUser = authenticateUser(req, db);
  if (!authUser) {
    return res.status(401).json({ error: "\u30ED\u30B0\u30A4\u30F3\u304C\u5FC5\u8981\u3067\u3059\u3002" });
  }
  const room = db.rooms.find((r) => r.id === id);
  if (!room) {
    return res.status(404).json({ error: "\u30C8\u30FC\u30AF\u30EB\u30FC\u30E0\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3002" });
  }
  if (room.type !== "group") {
    return res.status(400).json({ error: "\u30B0\u30EB\u30FC\u30D7\u30C8\u30FC\u30AF\u306E\u307F\u30E1\u30F3\u30D0\u30FC\u3092\u62DB\u5F85\u3067\u304D\u307E\u3059\u3002" });
  }
  if (!isUserMemberOfRoom(room, authUser.username)) {
    return res.status(403).json({ error: "\u3053\u306E\u30B0\u30EB\u30FC\u30D7\u306E\u30E1\u30F3\u30D0\u30FC\u306E\u307F\u62DB\u5F85\u3067\u304D\u307E\u3059\u3002" });
  }
  const candidates = [];
  if (Array.isArray(members)) {
    members.forEach((m) => candidates.push(String(m || "").trim()));
  }
  if (username) {
    candidates.push(String(username).trim());
  }
  const registeredUsernames = new Set(db.users.map((u) => u.username));
  const currentMembers = Array.isArray(room.members) ? [...room.members] : [authUser.username];
  const memberSet = new Set(currentMembers);
  const addedMembers = [];
  candidates.forEach((c) => {
    if (c && c !== "\u30B2\u30B9\u30C8" && registeredUsernames.has(c) && !memberSet.has(c)) {
      memberSet.add(c);
      addedMembers.push(c);
    }
  });
  room.members = Array.from(memberSet);
  writeWeTalksDB(db);
  res.json({ success: true, room, addedMembers });
});
app.delete("/api/wetalks/rooms/:id", (req, res) => {
  const { id } = req.params;
  const db = readWeTalksDB();
  if (!db.deleted_rooms) db.deleted_rooms = [];
  if (!db.deleted_rooms.includes(id)) {
    db.deleted_rooms.push(id);
  }
  db.rooms = db.rooms.filter((r) => r.id !== id);
  db.messages = db.messages.filter((m) => m.room_id !== id);
  writeWeTalksDB(db);
  res.json({ success: true });
});
app.post("/api/wetalks/rooms/:id/read", (req, res) => {
  const { id } = req.params;
  const db = readWeTalksDB();
  const authUser = authenticateUser(req, db);
  if (!authUser) {
    return res.status(401).json({ error: "\u30ED\u30B0\u30A4\u30F3\u304C\u5FC5\u8981\u3067\u3059\u3002" });
  }
  const room = db.rooms.find((r) => r.id === id);
  if (room && !isUserMemberOfRoom(room, authUser.username)) {
    return res.status(403).json({ error: "\u3053\u306E\u30C8\u30FC\u30AF\u30EB\u30FC\u30E0\u3092\u95B2\u89A7\u3059\u308B\u6A29\u9650\u304C\u3042\u308A\u307E\u305B\u3093\u3002" });
  }
  const updatedCount = markRoomMessagesAsRead(db, id, authUser.username);
  if (updatedCount > 0) {
    broadcastWetalksEvent("read", id);
  }
  res.json({ success: true, updatedCount });
});
app.get("/api/wetalks/messages/:roomId", (req, res) => {
  const { roomId } = req.params;
  const db = readWeTalksDB();
  const authUser = authenticateUser(req, db);
  if (!authUser) {
    return res.status(401).json({ error: "\u30ED\u30B0\u30A4\u30F3\u304C\u5FC5\u8981\u3067\u3059\u3002" });
  }
  const room = db.rooms.find((r) => r.id === roomId);
  if (room && !isUserMemberOfRoom(room, authUser.username)) {
    return res.status(403).json({ error: "\u3053\u306E\u30C8\u30FC\u30AF\u30EB\u30FC\u30E0\u3092\u95B2\u89A7\u3059\u308B\u6A29\u9650\u304C\u3042\u308A\u307E\u305B\u3093\u3002" });
  }
  const markRead = req.query.markRead === "1" || req.query.markRead === "true";
  if (markRead) {
    const updatedCount = markRoomMessagesAsRead(db, roomId, authUser.username);
    if (updatedCount > 0) {
      broadcastWetalksEvent("read", roomId);
    }
  }
  const isSummary = req.query.summary === "1" || req.query.summary === "true";
  let filtered = db.messages.filter((m) => m.room_id === roomId);
  if (isSummary && filtered.length > 30) {
    filtered = filtered.slice(-30);
  }
  const msgs = filtered.map((m) => {
    const cleanReadBy = Array.isArray(m.read_by) ? m.read_by.filter((u) => u && u !== m.sender) : [];
    if (isSummary) {
      return {
        id: m.id,
        room_id: m.room_id,
        sender: m.sender,
        text: m.text,
        has_image: !!m.image_base64,
        image_expired: !!m.image_expired,
        read_by: cleanReadBy,
        created_at: m.created_at
      };
    }
    return {
      ...m,
      read_by: cleanReadBy
    };
  });
  res.json(msgs);
});
app.post("/api/wetalks/messages", (req, res) => {
  const { id, room_id, text, image_base64, reply_to, created_at } = req.body || {};
  const cleanText = String(text || "").trim();
  const cleanImage = typeof image_base64 === "string" ? image_base64.trim() : "";
  if (!room_id || !cleanText && !cleanImage) {
    return res.status(400).json({ error: "Missing fields" });
  }
  if (cleanImage) {
    if (!/^data:image\/(png|jpeg|jpg|gif|webp|bmp);base64,[A-Za-z0-9+/=]+$/i.test(cleanImage)) {
      return res.status(400).json({ error: "\u7121\u52B9\u306A\u753B\u50CF\u5F62\u5F0F\u3067\u3059\u3002" });
    }
    if (cleanImage.length > 5 * 1024 * 1024) {
      return res.status(413).json({ error: "\u753B\u50CF\u30B5\u30A4\u30BA\u304C\u5927\u304D\u3059\u304E\u307E\u3059\u3002" });
    }
  }
  const db = readWeTalksDB();
  const authUser = authenticateUser(req, db);
  if (!authUser) {
    return res.status(401).json({ error: "\u30ED\u30B0\u30A4\u30F3\u304C\u5FC5\u8981\u3067\u3059\u3002" });
  }
  const room = db.rooms.find((r) => r.id === room_id);
  if (room && !isUserMemberOfRoom(room, authUser.username)) {
    return res.status(403).json({ error: "\u3053\u306E\u30C8\u30FC\u30AF\u30EB\u30FC\u30E0\u306B\u9001\u4FE1\u3059\u308B\u6A29\u9650\u304C\u3042\u308A\u307E\u305B\u3093\u3002" });
  }
  const msgId = id || "m-" + Date.now() + "-" + Math.random().toString(36).substr(2, 4);
  const existing = db.messages.find((m) => m.id === msgId);
  if (existing) {
    return res.json({ success: true, message: existing });
  }
  let cleanReply = null;
  if (reply_to && typeof reply_to === "object" && reply_to.id) {
    cleanReply = {
      id: String(reply_to.id).slice(0, 120),
      sender: String(reply_to.sender || "").slice(0, 40),
      text: String(reply_to.text || "").slice(0, 200),
      ...reply_to.has_image ? { has_image: true } : {}
    };
  }
  const newMsg = {
    id: msgId,
    room_id,
    sender: authUser.username,
    text: cleanText,
    ...cleanImage ? { image_base64: cleanImage } : {},
    ...cleanReply ? { reply_to: cleanReply } : {},
    read_by: [],
    created_at: created_at || (/* @__PURE__ */ new Date()).toISOString()
  };
  db.messages.push(newMsg);
  writeWeTalksDB(db);
  broadcastWetalksEvent("message", room_id, {
    message: {
      id: newMsg.id,
      room_id,
      sender: authUser.username,
      text: cleanText.slice(0, 300),
      has_image: !!cleanImage,
      created_at: newMsg.created_at
    },
    roomName: room?.name || "",
    members: Array.isArray(room?.members) ? room.members : void 0
  });
  res.json({ success: true, message: newMsg });
});
app.get("/api/wetalks/admin/overview", (req, res) => {
  if (!isAdminAuthorized(req)) {
    return res.status(401).json({ error: "\u7BA1\u7406\u8005\u8A8D\u8A3C\u304C\u5FC5\u8981\u3067\u3059\u3002" });
  }
  const db = readWeTalksDB();
  const roomMap = new Map(db.rooms.map((r) => [r.id, r.name]));
  const imagesCount = db.messages.filter((m) => !!m.image_base64).length;
  const users = db.users.map((u) => ({
    username: u.username,
    has_password: !!(u.password_hash || u.password_numeric),
    password_storage: u.password_hash ? "scrypt\u6697\u53F7\u5316\u4FDD\u5B58\u6E08\u307F" : u.password_numeric ? "\u4FDD\u5B58\u6E08\u307F" : "\u672A\u8A2D\u5B9A",
    avatar_base64: u.avatar_base64 || ""
  }));
  const rooms2 = db.rooms.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    members: Array.isArray(r.members) ? r.members : [],
    message_count: db.messages.filter((m) => m.room_id === r.id).length
  }));
  const recentMessages = db.messages.slice(-50).reverse().map((m) => {
    const createdMs = Date.parse(m.created_at || "");
    const expiresAt = m.image_base64 && !Number.isNaN(createdMs) ? new Date(createdMs + IMAGE_RETENTION_MS).toISOString() : null;
    return {
      id: m.id,
      room_id: m.room_id,
      room_name: roomMap.get(m.room_id) || m.room_id,
      sender: m.sender,
      text: m.text,
      has_image: !!m.image_base64,
      image_base64: m.image_base64 || "",
      image_expired: !!m.image_expired,
      created_at: m.created_at,
      image_expires_at: expiresAt
    };
  });
  return res.json({
    success: true,
    backend: "\u5185\u8535 Express \u30B5\u30FC\u30D0\u30FC (wetalks_db.json)",
    storage_verified: true,
    image_retention_days: IMAGE_RETENTION_DAYS,
    checked_at: (/* @__PURE__ */ new Date()).toISOString(),
    counts: {
      users: db.users.length,
      rooms: db.rooms.length,
      messages: db.messages.length,
      images: imagesCount
    },
    users,
    rooms: rooms2,
    recent_messages: recentMessages
  });
});
app.post("/api/wetalks/admin/prune-images", (req, res) => {
  if (!isAdminAuthorized(req)) {
    return res.status(401).json({ error: "\u7BA1\u7406\u8005\u8A8D\u8A3C\u304C\u5FC5\u8981\u3067\u3059\u3002" });
  }
  const db = readWeTalksDB();
  const prunedCount = pruneExpiredWeTalksImages(db);
  const remainingImages = db.messages.filter((m) => !!m.image_base64).length;
  return res.json({ success: true, prunedCount, remainingImages });
});
app.delete("/api/wetalks/admin/messages/:id", (req, res) => {
  if (!isAdminAuthorized(req)) {
    return res.status(401).json({ error: "\u7BA1\u7406\u8005\u8A8D\u8A3C\u304C\u5FC5\u8981\u3067\u3059\u3002" });
  }
  const { id } = req.params;
  const db = readWeTalksDB();
  const before = db.messages.length;
  db.messages = db.messages.filter((m) => m.id !== id);
  if (db.messages.length !== before) {
    writeWeTalksDB(db);
  }
  return res.json({ success: true });
});
app.delete("/api/wetalks/admin/users/:username", (req, res) => {
  if (!isAdminAuthorized(req)) {
    return res.status(401).json({ error: "\u7BA1\u7406\u8005\u8A8D\u8A3C\u304C\u5FC5\u8981\u3067\u3059\u3002" });
  }
  const target = String(req.params.username || "").trim().toLowerCase();
  const db = readWeTalksDB();
  const before = db.users.length;
  db.users = db.users.filter((u) => u.username.toLowerCase().trim() !== target);
  if (db.users.length !== before) {
    writeWeTalksDB(db);
  }
  return res.json({ success: true });
});
app.get("/api/wetalks/admin/rooms/:id/messages", (req, res) => {
  if (!isAdminAuthorized(req)) {
    return res.status(401).json({ error: "\u7BA1\u7406\u8005\u8A8D\u8A3C\u304C\u5FC5\u8981\u3067\u3059\u3002" });
  }
  const roomId = req.params.id;
  const db = readWeTalksDB();
  const room = db.rooms.find((r) => r.id === roomId) || null;
  const messages = db.messages.filter((m) => m.room_id === roomId).map((m) => {
    const createdMs = Date.parse(m.created_at || "");
    const expiresAt = m.image_base64 && !Number.isNaN(createdMs) ? new Date(createdMs + IMAGE_RETENTION_MS).toISOString() : null;
    return {
      ...m,
      has_image: !!m.image_base64,
      image_expires_at: expiresAt,
      read_by: Array.isArray(m.read_by) ? m.read_by.filter((u) => u && u !== m.sender) : []
    };
  });
  return res.json({ success: true, room, messages });
});
setInterval(() => {
  try {
    if (import_fs.default.existsSync(DB_FILE)) {
      readWeTalksDB();
    }
  } catch (e) {
  }
}, 60 * 60 * 1e3);
var tetrisQueue = [];
var tetrisRooms = {};
var server = import_http.default.createServer(app);
var PORT = 3e3;
var rooms = {};
var GRID_SIZE = 12;
var TILE_COLORS_COUNT = 5;
function createRandomGrid() {
  const grid = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    const row = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      row.push(Math.floor(Math.random() * TILE_COLORS_COUNT));
    }
    grid.push(row);
  }
  return grid;
}
function getRoom(roomId) {
  if (!rooms[roomId]) {
    rooms[roomId] = {
      roomId,
      players: {},
      grid: createRandomGrid(),
      flies: [],
      status: "waiting",
      timer: 90,
      seekerId: null,
      roundWinner: null
    };
    spawnFlies(rooms[roomId], 4);
  }
  return rooms[roomId];
}
function spawnFlies(room, count) {
  for (let i = 0; i < count; i++) {
    const gridX = Math.floor(Math.random() * GRID_SIZE);
    const gridY = Math.floor(Math.random() * GRID_SIZE);
    const flyId = Math.random().toString(36).substring(2, 9);
    room.flies.push({
      id: flyId,
      gridX,
      gridY,
      points: 10
    });
  }
}
function rotateGridColors(room) {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (Math.random() < 0.15) {
        room.grid[r][c] = (room.grid[r][c] + Math.floor(Math.random() * (TILE_COLORS_COUNT - 1)) + 1) % TILE_COLORS_COUNT;
      }
    }
  }
  Object.values(room.players).forEach((p) => {
    const gx = Math.floor(p.x);
    const gy = Math.floor(p.y);
    if (gx >= 0 && gx < GRID_SIZE && gy >= 0 && gy < GRID_SIZE) {
      p.targetColorIndex = room.grid[gy][gx];
    }
  });
}
function simulateBots(room) {
  const playerIds = Object.keys(room.players);
  const activeBots = playerIds.filter((id) => room.players[id].isBot);
  const realPlayers = playerIds.filter((id) => !room.players[id].isBot);
  if (realPlayers.length > 0 && activeBots.length < 3) {
    const botId = `bot_${Math.random().toString(36).substring(2, 6)}`;
    room.players[botId] = {
      id: botId,
      name: `ChameleBot ${Math.floor(Math.random() * 90) + 10}`,
      x: Math.floor(Math.random() * (GRID_SIZE - 2)) + 1 + 0.5,
      y: Math.floor(Math.random() * (GRID_SIZE - 2)) + 1 + 0.5,
      colorIndex: 0,
      targetColorIndex: 0,
      role: "hider",
      isAlive: true,
      score: 0,
      skinId: Math.floor(Math.random() * 4),
      isBot: true,
      heading: 0
    };
  }
  if (room.status === "playing") {
    Object.values(room.players).forEach((p) => {
      if (!p.isBot || !p.isAlive) return;
      if (p.role === "hider") {
        if (Math.random() < 0.08) {
          const dx = (Math.random() - 0.5) * 0.4;
          const dy = (Math.random() - 0.5) * 0.4;
          p.x = Math.max(0.1, Math.min(GRID_SIZE - 0.1, p.x + dx));
          p.y = Math.max(0.1, Math.min(GRID_SIZE - 0.1, p.y + dy));
          p.heading = Math.atan2(dy, dx) * (180 / Math.PI);
        }
        const gx = Math.floor(p.x);
        const gy = Math.floor(p.y);
        if (gx >= 0 && gx < GRID_SIZE && gy >= 0 && gy < GRID_SIZE) {
          p.targetColorIndex = room.grid[gy][gx];
        }
      } else if (p.role === "seeker") {
        if (Math.random() < 0.03) {
          const hiders = Object.values(room.players).filter((pl) => pl.role === "hider" && pl.isAlive);
          if (hiders.length > 0) {
            const target = hiders[Math.floor(Math.random() * hiders.length)];
            const err = 1;
            const targetX = target.x + (Math.random() - 0.5) * err;
            const targetY = target.y + (Math.random() - 0.5) * err;
            const angle = Math.atan2(targetY - p.y, targetX - p.x);
            p.x = Math.max(0.1, Math.min(GRID_SIZE - 0.1, p.x + Math.cos(angle) * 0.3));
            p.y = Math.max(0.1, Math.min(GRID_SIZE - 0.1, p.y + Math.sin(angle) * 0.3));
            p.heading = angle * (180 / Math.PI);
            if (Math.random() < 0.25) {
              const lickRange = 1.5;
              hiders.forEach((hid) => {
                const dist = Math.hypot(hid.x - p.x, hid.y - p.y);
                if (dist <= lickRange) {
                  hid.isAlive = false;
                  p.score += 50;
                }
              });
            }
          }
        }
      }
    });
  }
}
setInterval(() => {
  Object.keys(rooms).forEach((roomId) => {
    const room = rooms[roomId];
    simulateBots(room);
    if (room.status === "playing") {
      room.timer--;
      if (room.timer % 6 === 0) {
        rotateGridColors(room);
      }
      room.flies.forEach((fly, index) => {
        Object.values(room.players).forEach((p) => {
          if (p.isAlive && p.role === "hider") {
            const dist = Math.hypot(p.x - (fly.gridX + 0.5), p.y - (fly.gridY + 0.5));
            if (dist < 0.6) {
              p.score += fly.points;
              room.flies.splice(index, 1);
              spawnFlies(room, 1);
            }
          }
        });
      });
      const seeker = Object.values(room.players).find((p) => p.role === "seeker");
      if (seeker) {
        Object.values(room.players).forEach((hider) => {
          if (hider.role === "hider" && hider.isAlive) {
            const dist = Math.hypot(hider.x - seeker.x, hider.y - seeker.y);
            if (dist < 0.5) {
              hider.isAlive = false;
              seeker.score += 50;
            }
          }
        });
      }
      const aliveHiders = Object.values(room.players).filter((p) => p.role === "hider" && p.isAlive);
      if (aliveHiders.length === 0) {
        room.status = "ended";
        room.roundWinner = "seeker";
      } else if (room.timer <= 0) {
        room.status = "ended";
        room.roundWinner = "hiders";
      }
    }
  });
}, 1e3);
var wss = new import_ws.WebSocketServer({ noServer: true });
var wsMetaMap = /* @__PURE__ */ new WeakMap();
var relayChannels = /* @__PURE__ */ new Map();
var wetalksWsClients = /* @__PURE__ */ new Set();
var wetalksCallRooms = /* @__PURE__ */ new Map();
function getWetalksCallParticipants(roomId) {
  const peers = wetalksCallRooms.get(roomId);
  if (!peers) return [];
  return Array.from(peers.values()).map((p) => ({
    peerId: p.peerId,
    username: p.username,
    camOn: p.camOn,
    micOn: p.micOn
  }));
}
function broadcastWetalksCallRoster(roomId) {
  if (!roomId) return;
  const participants = getWetalksCallParticipants(roomId);
  const payload = JSON.stringify({
    type: "wetalks_call_roster",
    roomId,
    participants
  });
  wetalksWsClients.forEach((client) => {
    if (client.readyState === import_ws.WebSocket.OPEN) {
      try {
        client.send(payload);
      } catch {
      }
    }
  });
  const roomPeers = wetalksCallRooms.get(roomId);
  if (roomPeers) {
    roomPeers.forEach((p) => {
      if (!wetalksWsClients.has(p.ws) && p.ws.readyState === import_ws.WebSocket.OPEN) {
        try {
          p.ws.send(payload);
        } catch {
        }
      }
    });
  }
}
function leaveWetalksCall(ws, targetRoomId) {
  const meta = wsMetaMap.get(ws);
  if (!meta) return;
  const roomId = targetRoomId || meta.wetalksCallRoomId;
  const peerId = meta.wetalksCallPeerId;
  if (!roomId || !peerId) return;
  const peers = wetalksCallRooms.get(roomId);
  if (peers) {
    const existing = peers.get(peerId);
    if (!existing || existing.ws === ws) {
      peers.delete(peerId);
      const leavePayload = JSON.stringify({
        type: "wetalks_call_peer_left",
        roomId,
        peerId
      });
      peers.forEach((p) => {
        if (p.ws.readyState === import_ws.WebSocket.OPEN) {
          try {
            p.ws.send(leavePayload);
          } catch {
          }
        }
      });
      if (peers.size === 0) {
        wetalksCallRooms.delete(roomId);
      }
      broadcastWetalksCallRoster(roomId);
    }
  }
  if (meta.wetalksCallRoomId === roomId) {
    meta.wetalksCallRoomId = void 0;
    meta.wetalksCallPeerId = void 0;
  }
}
function broadcastWetalksEvent(event, roomId, meta) {
  if (!roomId || wetalksWsClients.size === 0) return;
  const membersList = Array.isArray(meta?.members) && meta.members.length > 0 ? meta.members : null;
  const memberSet = membersList ? new Set(membersList) : null;
  const basePayload = JSON.stringify({ type: "wetalks_event", event, roomId });
  const richPayload = event === "message" && meta?.message && memberSet ? JSON.stringify({
    type: "wetalks_event",
    event,
    roomId,
    message: meta.message,
    roomName: meta.roomName || "",
    members: membersList
  }) : basePayload;
  wetalksWsClients.forEach((client) => {
    if (client.readyState !== import_ws.WebSocket.OPEN) return;
    const cMeta = wsMetaMap.get(client);
    if (memberSet) {
      if (!cMeta?.wetalksUsername || !memberSet.has(cMeta.wetalksUsername)) {
        return;
      }
      try {
        client.send(richPayload);
      } catch {
      }
      return;
    }
    try {
      client.send(basePayload);
    } catch {
    }
  });
}
function leaveRelayChannel(ws, targetChannel) {
  const meta = wsMetaMap.get(ws);
  if (!meta) return;
  const channel = targetChannel || meta.relayChannel;
  if (!channel) return;
  const members = relayChannels.get(channel);
  if (members) {
    members.delete(ws);
    const leavePayload = JSON.stringify({
      type: "relay_member_left",
      channel,
      memberId: meta.relayMemberId || meta.clientId,
      username: meta.relayUsername || "Player"
    });
    members.forEach((client) => {
      if (client.readyState === import_ws.WebSocket.OPEN) {
        client.send(leavePayload);
      }
    });
    if (members.size === 0) {
      relayChannels.delete(channel);
    }
  }
  if (meta.relayChannel === channel) {
    meta.relayChannel = void 0;
  }
}
server.on("upgrade", (request, socket, head) => {
  const protocol = request.headers["sec-websocket-protocol"];
  if (protocol === "vite-hmr" || protocol === "vite-ping") {
    return;
  }
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});
wss.on("connection", (ws) => {
  let playerRoomId = "";
  const playerId = Math.random().toString(36).substring(2, 9);
  wsMetaMap.set(ws, { clientId: playerId });
  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);
      const meta = wsMetaMap.get(ws) || { clientId: playerId };
      wsMetaMap.set(ws, meta);
      switch (data.type) {
        case "ping": {
          ws.send(JSON.stringify({ type: "pong" }));
          break;
        }
        case "wetalks_subscribe": {
          const uname = typeof data.username === "string" ? data.username.trim().slice(0, 64) : "";
          meta.wetalksUsername = uname && uname !== "\u30B2\u30B9\u30C8" ? uname : void 0;
          wetalksWsClients.add(ws);
          break;
        }
        case "wetalks_notify_message": {
          const roomId = typeof data.roomId === "string" ? data.roomId.trim().slice(0, 120) : "";
          if (!roomId || !data.message || typeof data.message !== "object") break;
          const rawMsg = data.message;
          const msgId = typeof rawMsg.id === "string" ? rawMsg.id.trim().slice(0, 120) : "";
          const rawSender = typeof rawMsg.sender === "string" ? rawMsg.sender.trim().slice(0, 64) : "";
          const sender = meta.wetalksUsername || rawSender;
          if (!msgId || !sender || sender === "\u30B2\u30B9\u30C8") break;
          if (meta.wetalksUsername && rawSender && rawSender !== meta.wetalksUsername) break;
          const text = typeof rawMsg.text === "string" ? rawMsg.text.trim().slice(0, 300) : "";
          const hasImage = Boolean(rawMsg.has_image);
          if (!text && !hasImage) break;
          const createdAt = typeof rawMsg.created_at === "string" ? rawMsg.created_at.slice(0, 40) : (/* @__PURE__ */ new Date()).toISOString();
          const roomName = typeof data.roomName === "string" ? data.roomName.trim().slice(0, 100) : "";
          let members;
          if (Array.isArray(data.members)) {
            const cleaned = data.members.filter((m) => typeof m === "string").map((m) => m.trim().slice(0, 64)).filter((m) => Boolean(m) && m !== "\u30B2\u30B9\u30C8").slice(0, 50);
            if (cleaned.length > 0 && cleaned.includes(sender)) {
              members = cleaned;
            }
          }
          broadcastWetalksEvent("message", roomId, {
            message: { id: msgId, room_id: roomId, sender, text, has_image: hasImage, created_at: createdAt },
            roomName,
            members
          });
          break;
        }
        case "wetalks_call_probe": {
          const roomId = String(data.roomId || "").trim();
          if (!roomId) break;
          wetalksWsClients.add(ws);
          ws.send(
            JSON.stringify({
              type: "wetalks_call_roster",
              roomId,
              participants: getWetalksCallParticipants(roomId)
            })
          );
          break;
        }
        case "wetalks_call_join": {
          const roomId = String(data.roomId || "").trim();
          if (!roomId) break;
          const peerId = String(data.peerId || playerId).trim();
          const username = String(data.username || meta.wetalksUsername || "User").slice(0, 32);
          const camOn = Boolean(data.camOn);
          const micOn = data.micOn !== false;
          if (meta.wetalksCallRoomId && meta.wetalksCallRoomId !== roomId) {
            leaveWetalksCall(ws, meta.wetalksCallRoomId);
          }
          meta.wetalksCallRoomId = roomId;
          meta.wetalksCallPeerId = peerId;
          wetalksWsClients.add(ws);
          let peers = wetalksCallRooms.get(roomId);
          if (!peers) {
            peers = /* @__PURE__ */ new Map();
            wetalksCallRooms.set(roomId, peers);
          }
          const peerEntry = { peerId, username, camOn, micOn, ws };
          peers.set(peerId, peerEntry);
          ws.send(
            JSON.stringify({
              type: "wetalks_call_joined",
              roomId,
              peerId,
              participants: getWetalksCallParticipants(roomId)
            })
          );
          const joinedNotify = JSON.stringify({
            type: "wetalks_call_peer_joined",
            roomId,
            peer: { peerId, username, camOn, micOn }
          });
          peers.forEach((p) => {
            if (p.peerId !== peerId && p.ws.readyState === import_ws.WebSocket.OPEN) {
              try {
                p.ws.send(joinedNotify);
              } catch {
              }
            }
          });
          broadcastWetalksCallRoster(roomId);
          break;
        }
        case "wetalks_call_signal": {
          const roomId = String(data.roomId || meta.wetalksCallRoomId || "").trim();
          const targetPeerId = String(data.targetPeerId || "").trim();
          const fromPeerId = String(meta.wetalksCallPeerId || data.fromPeerId || "").trim();
          if (!roomId || !targetPeerId || !fromPeerId || !data.signal) break;
          const peers = wetalksCallRooms.get(roomId);
          const target = peers?.get(targetPeerId);
          if (target && target.ws.readyState === import_ws.WebSocket.OPEN) {
            try {
              target.ws.send(
                JSON.stringify({
                  type: "wetalks_call_signal",
                  roomId,
                  fromPeerId,
                  signal: data.signal
                })
              );
            } catch {
            }
          }
          break;
        }
        case "wetalks_call_media_state": {
          const roomId = String(data.roomId || meta.wetalksCallRoomId || "").trim();
          const peerId = String(meta.wetalksCallPeerId || data.peerId || "").trim();
          if (!roomId || !peerId) break;
          const peers = wetalksCallRooms.get(roomId);
          const peer = peers?.get(peerId);
          if (!peer) break;
          peer.camOn = Boolean(data.camOn);
          peer.micOn = data.micOn !== false;
          const stateMsg = JSON.stringify({
            type: "wetalks_call_media_state",
            roomId,
            peerId,
            camOn: peer.camOn,
            micOn: peer.micOn
          });
          peers.forEach((p) => {
            if (p.peerId !== peerId && p.ws.readyState === import_ws.WebSocket.OPEN) {
              try {
                p.ws.send(stateMsg);
              } catch {
              }
            }
          });
          broadcastWetalksCallRoster(roomId);
          break;
        }
        case "wetalks_call_audio": {
          const roomId = String(data.roomId || meta.wetalksCallRoomId || "").trim();
          const fromPeerId = String(meta.wetalksCallPeerId || data.fromPeerId || "").trim();
          const targetPeerId = typeof data.targetPeerId === "string" ? data.targetPeerId.trim() : "";
          const pcm = typeof data.pcm === "string" ? data.pcm : "";
          const sampleRate = Number(data.sampleRate) || 32e3;
          if (!roomId || !fromPeerId || !pcm || pcm.length > 32768) break;
          if (sampleRate < 8e3 || sampleRate > 48e3) break;
          const peers = wetalksCallRooms.get(roomId);
          if (!peers || !peers.has(fromPeerId)) break;
          const audioMsg = JSON.stringify({
            type: "wetalks_call_audio",
            roomId,
            fromPeerId,
            sampleRate,
            pcm
          });
          if (targetPeerId) {
            const target = peers.get(targetPeerId);
            if (target && target.peerId !== fromPeerId && target.ws.readyState === import_ws.WebSocket.OPEN) {
              try {
                target.ws.send(audioMsg);
              } catch {
              }
            }
          } else {
            peers.forEach((p) => {
              if (p.peerId !== fromPeerId && p.ws.readyState === import_ws.WebSocket.OPEN) {
                try {
                  p.ws.send(audioMsg);
                } catch {
                }
              }
            });
          }
          break;
        }
        case "wetalks_call_need_ws_audio": {
          const roomId = String(data.roomId || meta.wetalksCallRoomId || "").trim();
          const fromPeerId = String(meta.wetalksCallPeerId || data.fromPeerId || "").trim();
          const targetPeerId = typeof data.targetPeerId === "string" ? data.targetPeerId.trim() : "";
          if (!roomId || !fromPeerId || !targetPeerId) break;
          const peers = wetalksCallRooms.get(roomId);
          if (!peers || !peers.has(fromPeerId)) break;
          const target = peers.get(targetPeerId);
          if (target && target.peerId !== fromPeerId && target.ws.readyState === import_ws.WebSocket.OPEN) {
            try {
              target.ws.send(JSON.stringify({
                type: "wetalks_call_need_ws_audio",
                roomId,
                fromPeerId
              }));
            } catch {
            }
          }
          break;
        }
        case "wetalks_call_leave": {
          const roomId = data.roomId ? String(data.roomId).trim() : void 0;
          leaveWetalksCall(ws, roomId);
          break;
        }
        case "relay_join": {
          const channel = String(data.channel || "").trim();
          if (!channel) break;
          if (meta.relayChannel && meta.relayChannel !== channel) {
            leaveRelayChannel(ws, meta.relayChannel);
          }
          meta.relayChannel = channel;
          meta.relayMemberId = String(data.memberId || playerId);
          meta.relayUsername = String(data.username || "Player");
          let members = relayChannels.get(channel);
          if (!members) {
            members = /* @__PURE__ */ new Set();
            relayChannels.set(channel, members);
          }
          members.add(ws);
          const memberList = Array.from(members).map((client) => {
            const cm = wsMetaMap.get(client);
            return {
              memberId: cm?.relayMemberId || cm?.clientId || "",
              username: cm?.relayUsername || "Player"
            };
          }).filter((m) => !!m.memberId);
          ws.send(
            JSON.stringify({
              type: "relay_joined",
              channel,
              memberId: meta.relayMemberId,
              members: memberList
            })
          );
          const joinNotify = JSON.stringify({
            type: "relay_member_joined",
            channel,
            memberId: meta.relayMemberId,
            username: meta.relayUsername
          });
          members.forEach((client) => {
            if (client !== ws && client.readyState === import_ws.WebSocket.OPEN) {
              client.send(joinNotify);
            }
          });
          break;
        }
        case "relay_broadcast": {
          const channel = String(data.channel || meta.relayChannel || "").trim();
          if (!channel || !data.event) break;
          const members = relayChannels.get(channel);
          if (!members) break;
          const out = JSON.stringify({
            type: "relay_event",
            channel,
            event: data.event,
            payload: data.payload ?? {},
            fromMemberId: meta.relayMemberId || playerId
          });
          members.forEach((client) => {
            if (client.readyState === import_ws.WebSocket.OPEN && (data.includeSelf || client !== ws)) {
              client.send(out);
            }
          });
          break;
        }
        case "relay_leave": {
          leaveRelayChannel(ws, data.channel ? String(data.channel).trim() : void 0);
          break;
        }
        case "join": {
          playerRoomId = String(data.roomId || "default").trim().toLowerCase() || "default";
          meta.chameleonRoomId = playerRoomId;
          const currentRoom = getRoom(playerRoomId);
          const hasSeeker = Object.values(currentRoom.players).some((p) => p.role === "seeker");
          const role = hasSeeker ? "hider" : "seeker";
          const px = Math.floor(Math.random() * (GRID_SIZE - 2)) + 1 + 0.5;
          const py = Math.floor(Math.random() * (GRID_SIZE - 2)) + 1 + 0.5;
          const tileColor = currentRoom.grid[Math.floor(py)][Math.floor(px)] ?? 0;
          currentRoom.players[playerId] = {
            id: playerId,
            name: data.name || `Chameleon_${playerId}`,
            x: px,
            y: py,
            colorIndex: 0,
            targetColorIndex: tileColor,
            role,
            isAlive: true,
            score: 0,
            skinId: data.skinId || 0,
            isBot: false,
            heading: 0
          };
          if (role === "seeker") {
            currentRoom.seekerId = playerId;
          }
          ws.send(JSON.stringify({
            type: "init",
            playerId,
            roomId: playerRoomId,
            gameState: currentRoom
          }));
          break;
        }
        case "move": {
          if (!playerRoomId) break;
          const room = getRoom(playerRoomId);
          const player = room.players[playerId];
          if (player && player.isAlive) {
            player.x = Math.max(0.1, Math.min(GRID_SIZE - 0.1, data.x));
            player.y = Math.max(0.1, Math.min(GRID_SIZE - 0.1, data.y));
            player.heading = data.heading || 0;
            const gx = Math.floor(player.x);
            const gy = Math.floor(player.y);
            if (gx >= 0 && gx < GRID_SIZE && gy >= 0 && gy < GRID_SIZE) {
              player.targetColorIndex = room.grid[gy][gx];
            }
          }
          break;
        }
        case "lick": {
          if (!playerRoomId) break;
          const room = getRoom(playerRoomId);
          const player = room.players[playerId];
          if (player && player.role === "seeker") {
            const lickRange = 1.8;
            Object.values(room.players).forEach((hid) => {
              if (hid.role === "hider" && hid.isAlive) {
                const dist = Math.hypot(hid.x - player.x, hid.y - player.y);
                if (dist <= lickRange) {
                  hid.isAlive = false;
                  player.score += 50;
                }
              }
            });
            broadcastToRoom(playerRoomId, {
              type: "lick_effect",
              seekerId: playerId,
              x: player.x,
              y: player.y,
              heading: player.heading
            });
          }
          break;
        }
        case "skin_change": {
          if (!playerRoomId) break;
          const room = getRoom(playerRoomId);
          const player = room.players[playerId];
          if (player) {
            player.skinId = data.skinId;
          }
          break;
        }
        case "start_game": {
          if (!playerRoomId) break;
          const room = getRoom(playerRoomId);
          if (room.status !== "playing") {
            room.status = "playing";
            room.timer = 90;
            room.flies = [];
            room.roundWinner = null;
            spawnFlies(room, 4);
            const playerIds = Object.keys(room.players);
            if (playerIds.length > 0) {
              const seekerIndex = Math.floor(Math.random() * playerIds.length);
              playerIds.forEach((id, idx) => {
                const nx = Math.floor(Math.random() * (GRID_SIZE - 2)) + 1 + 0.5;
                const ny = Math.floor(Math.random() * (GRID_SIZE - 2)) + 1 + 0.5;
                room.players[id].role = idx === seekerIndex ? "seeker" : "hider";
                room.players[id].isAlive = true;
                room.players[id].x = nx;
                room.players[id].y = ny;
                room.players[id].targetColorIndex = room.grid[Math.floor(ny)][Math.floor(nx)] ?? 0;
              });
              room.seekerId = playerIds[seekerIndex];
            }
            broadcastToRoom(playerRoomId, {
              type: "system",
              text: "The hunt has started! Chameleon hiders, camouflage into the tiles!"
            });
          }
          break;
        }
        case "chat": {
          if (!playerRoomId) break;
          const room = getRoom(playerRoomId);
          broadcastToRoom(playerRoomId, {
            type: "chat",
            sender: room.players[playerId]?.name || "Chameleon",
            text: data.text
          });
          break;
        }
        case "tetris_join": {
          const clientName = data.name || "Anonymous Player";
          const newClient = {
            id: playerId,
            name: clientName,
            ws
          };
          const existingIdx = tetrisQueue.findIndex((c) => c.id === playerId);
          if (existingIdx !== -1) {
            tetrisQueue[existingIdx] = newClient;
          } else if (tetrisQueue.length > 0) {
            const opp = tetrisQueue.shift();
            if (opp.id === playerId) {
              tetrisQueue.push(newClient);
              ws.send(JSON.stringify({ type: "tetris_waiting" }));
            } else {
              const rId = "t_room_" + Math.random().toString(36).substr(2, 6);
              const room = {
                id: rId,
                player1: opp,
                player2: newClient
              };
              tetrisRooms[rId] = room;
              opp.ws.send(JSON.stringify({
                type: "tetris_matched",
                roomId: rId,
                opponentName: newClient.name
              }));
              ws.send(JSON.stringify({
                type: "tetris_matched",
                roomId: rId,
                opponentName: opp.name
              }));
            }
          } else {
            tetrisQueue.push(newClient);
            ws.send(JSON.stringify({ type: "tetris_waiting" }));
          }
          break;
        }
        case "tetris_sync_grid": {
          const rId = data.roomId;
          const room = tetrisRooms[rId];
          if (room) {
            const isP1 = room.player1.id === playerId;
            const opp = isP1 ? room.player2 : room.player1;
            opp.ws.send(JSON.stringify({
              type: "tetris_sync_grid",
              grid: data.grid,
              score: data.score
            }));
          }
          break;
        }
        case "tetris_send_garbage": {
          const rId = data.roomId;
          const room = tetrisRooms[rId];
          if (room) {
            const isP1 = room.player1.id === playerId;
            const opp = isP1 ? room.player2 : room.player1;
            opp.ws.send(JSON.stringify({
              type: "tetris_opponent_garbage",
              lines: data.lines
            }));
          }
          break;
        }
        case "tetris_gameover": {
          const rId = data.roomId;
          const room = tetrisRooms[rId];
          if (room) {
            const isP1 = room.player1.id === playerId;
            const opp = isP1 ? room.player2 : room.player1;
            opp.ws.send(JSON.stringify({
              type: "tetris_opponent_gameover"
            }));
          }
          break;
        }
        // ─── GeoGuessr Online Multiplayer Handlers ───
        case "geo_queue_join": {
          removePlayerFromGeoQueue(playerId);
          leavePlayerGeoRoom(playerId);
          const format = data.format === "classic5" ? "classic5" : "duels";
          const mapId = GEOGUESSR_MAPS[data.mapId] ? data.mapId : "world";
          const moveMode = data.moveMode === "nomove" || data.moveMode === "nmpz" ? data.moveMode : "moving";
          const roundTimeSec = typeof data.roundTimeSec === "number" ? data.roundTimeSec : 90;
          const playerName = String(data.name || `Explorer_${playerId.slice(0, 4)}`).slice(0, 24);
          const opponentIdx = geoQueue.findIndex((q) => q.format === format && q.id !== playerId);
          if (opponentIdx !== -1) {
            const opponent = geoQueue.splice(opponentIdx, 1)[0];
            const roomCode = generateGeoRoomCode();
            const room = {
              roomCode,
              hostId: opponent.id,
              format,
              mapId: opponent.mapId,
              moveMode: opponent.moveMode,
              roundTimeSec: opponent.roundTimeSec,
              status: "lobby",
              currentRound: 1,
              maxRounds: format === "classic5" ? 5 : 99,
              target: { lat: 0, lng: 0, heading: 0 },
              roundStartedAt: null,
              roundDeadlineAt: null,
              countdownEndAt: null,
              winnerId: null,
              players: [
                {
                  id: opponent.id,
                  name: opponent.name,
                  ws: opponent.ws,
                  hp: 6e3,
                  totalScore: 0,
                  guess: null,
                  softPin: null,
                  guessedAt: null,
                  readyForNext: false,
                  wantsRematch: false,
                  connected: true
                },
                {
                  id: playerId,
                  name: playerName,
                  ws,
                  hp: 6e3,
                  totalScore: 0,
                  guess: null,
                  softPin: null,
                  guessedAt: null,
                  readyForNext: false,
                  wantsRematch: false,
                  connected: true
                }
              ],
              history: [],
              createdAt: Date.now()
            };
            geoRooms.set(roomCode, room);
            startGeoRound(room, 1);
          } else {
            geoQueue.push({
              id: playerId,
              name: playerName,
              ws,
              format,
              mapId,
              moveMode,
              roundTimeSec,
              joinedAt: Date.now()
            });
            ws.send(
              JSON.stringify({
                type: "geo_queue_waiting",
                format,
                waitingCount: geoQueue.length
              })
            );
          }
          break;
        }
        case "geo_queue_leave": {
          removePlayerFromGeoQueue(playerId);
          ws.send(JSON.stringify({ type: "geo_queue_cancelled" }));
          break;
        }
        case "geo_room_create": {
          removePlayerFromGeoQueue(playerId);
          leavePlayerGeoRoom(playerId);
          const format = data.format === "classic5" ? "classic5" : "duels";
          const mapId = GEOGUESSR_MAPS[data.mapId] ? data.mapId : "world";
          const moveMode = data.moveMode === "nomove" || data.moveMode === "nmpz" ? data.moveMode : "moving";
          const roundTimeSec = typeof data.roundTimeSec === "number" ? data.roundTimeSec : 90;
          const playerName = String(data.name || `Host_${playerId.slice(0, 4)}`).slice(0, 24);
          const roomCode = generateGeoRoomCode();
          const room = {
            roomCode,
            hostId: playerId,
            format,
            mapId,
            moveMode,
            roundTimeSec,
            status: "lobby",
            currentRound: 1,
            maxRounds: format === "classic5" ? 5 : 99,
            target: { lat: 0, lng: 0, heading: 0 },
            roundStartedAt: null,
            roundDeadlineAt: null,
            countdownEndAt: null,
            winnerId: null,
            players: [
              {
                id: playerId,
                name: playerName,
                ws,
                hp: 6e3,
                totalScore: 0,
                guess: null,
                softPin: null,
                guessedAt: null,
                readyForNext: false,
                wantsRematch: false,
                connected: true
              }
            ],
            history: [],
            createdAt: Date.now()
          };
          geoRooms.set(roomCode, room);
          broadcastGeoRoom(room);
          break;
        }
        case "geo_room_join": {
          const code = String(data.roomCode || "").trim().toUpperCase();
          const room = geoRooms.get(code);
          if (!room) {
            ws.send(JSON.stringify({ type: "geo_error", message: "\u30EB\u30FC\u30E0\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3002\u30B3\u30FC\u30C9\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002" }));
            break;
          }
          if (room.players.length >= 2) {
            ws.send(JSON.stringify({ type: "geo_error", message: "\u3053\u306E\u30EB\u30FC\u30E0\u306F\u6E80\u54E1\u3067\u3059\u3002" }));
            break;
          }
          if (room.status !== "lobby") {
            ws.send(JSON.stringify({ type: "geo_error", message: "\u3053\u306E\u30EB\u30FC\u30E0\u306F\u3059\u3067\u306B\u5BFE\u6226\u4E2D\u3067\u3059\u3002" }));
            break;
          }
          removePlayerFromGeoQueue(playerId);
          leavePlayerGeoRoom(playerId);
          const playerName = String(data.name || `Guest_${playerId.slice(0, 4)}`).slice(0, 24);
          room.players.push({
            id: playerId,
            name: playerName,
            ws,
            hp: 6e3,
            totalScore: 0,
            guess: null,
            softPin: null,
            guessedAt: null,
            readyForNext: false,
            wantsRematch: false,
            connected: true
          });
          broadcastGeoRoom(room);
          break;
        }
        case "geo_room_update_settings": {
          const code = String(data.roomCode || "").trim().toUpperCase();
          const room = geoRooms.get(code);
          if (!room || room.hostId !== playerId || room.status !== "lobby") break;
          if (data.format === "duels" || data.format === "classic5") {
            room.format = data.format;
            room.maxRounds = data.format === "classic5" ? 5 : 99;
          }
          if (GEOGUESSR_MAPS[data.mapId]) room.mapId = data.mapId;
          if (data.moveMode === "moving" || data.moveMode === "nomove" || data.moveMode === "nmpz") {
            room.moveMode = data.moveMode;
          }
          if (typeof data.roundTimeSec === "number") room.roundTimeSec = data.roundTimeSec;
          broadcastGeoRoom(room);
          break;
        }
        case "geo_room_start": {
          const code = String(data.roomCode || "").trim().toUpperCase();
          const room = geoRooms.get(code);
          if (!room || room.hostId !== playerId || room.players.length < 2) break;
          room.players.forEach((p) => {
            p.hp = 6e3;
            p.totalScore = 0;
          });
          room.history = [];
          room.winnerId = null;
          startGeoRound(room, 1);
          break;
        }
        case "geo_pano_verified": {
          const code = String(data.roomCode || "").trim().toUpperCase();
          const room = geoRooms.get(code);
          if (!room || room.status !== "playing" || room.currentRound !== data.roundNumber) break;
          if (!room.target.panoId && data.actual && typeof data.actual.lat === "number" && typeof data.actual.lng === "number") {
            room.target = {
              lat: data.actual.lat,
              lng: data.actual.lng,
              heading: room.target.heading,
              panoId: data.actual.panoId ? String(data.actual.panoId) : void 0,
              locationLabel: data.actual.locationLabel ? String(data.actual.locationLabel) : void 0
            };
            broadcastGeoRoom(room);
          } else if (!room.target.locationLabel && data.actual?.locationLabel) {
            room.target.locationLabel = String(data.actual.locationLabel);
          }
          break;
        }
        case "geo_guess_pin": {
          const code = String(data.roomCode || "").trim().toUpperCase();
          const room = geoRooms.get(code);
          if (!room || room.status !== "playing") break;
          const player = room.players.find((p) => p.id === playerId);
          if (!player || player.guess) break;
          if (typeof data.lat === "number" && typeof data.lng === "number") {
            player.softPin = { lat: data.lat, lng: data.lng };
          }
          break;
        }
        case "geo_guess_submit": {
          const code = String(data.roomCode || "").trim().toUpperCase();
          const room = geoRooms.get(code);
          if (!room || room.status !== "playing") break;
          const player = room.players.find((p) => p.id === playerId);
          if (!player || player.guess) break;
          if (typeof data.lat !== "number" || typeof data.lng !== "number") break;
          player.guess = { lat: data.lat, lng: data.lng };
          player.softPin = player.guess;
          player.guessedAt = Date.now();
          const allGuessed = room.players.every((p) => p.guess !== null);
          if (allGuessed) {
            resolveGeoRound(room);
          } else {
            const pressureEnd = Date.now() + 15e3;
            room.countdownEndAt = room.countdownEndAt ? Math.min(room.countdownEndAt, pressureEnd) : pressureEnd;
            broadcastGeoRoom(room);
          }
          break;
        }
        case "geo_next_round": {
          const code = String(data.roomCode || "").trim().toUpperCase();
          const room = geoRooms.get(code);
          if (!room || room.status !== "round_result") break;
          const player = room.players.find((p) => p.id === playerId);
          if (!player) break;
          player.readyForNext = true;
          if (room.players.every((p) => p.readyForNext)) {
            startGeoRound(room, room.currentRound + 1);
          } else {
            broadcastGeoRoom(room);
          }
          break;
        }
        case "geo_rematch": {
          const code = String(data.roomCode || "").trim().toUpperCase();
          const room = geoRooms.get(code);
          if (!room || room.status !== "match_over") break;
          const player = room.players.find((p) => p.id === playerId);
          if (!player) break;
          player.wantsRematch = true;
          if (room.players.length >= 2 && room.players.every((p) => p.wantsRematch)) {
            room.players.forEach((p) => {
              p.hp = 6e3;
              p.totalScore = 0;
              p.wantsRematch = false;
            });
            room.history = [];
            room.winnerId = null;
            startGeoRound(room, 1);
          } else {
            broadcastGeoRoom(room);
          }
          break;
        }
        case "geo_leave_room": {
          removePlayerFromGeoQueue(playerId);
          leavePlayerGeoRoom(playerId);
          break;
        }
      }
    } catch (err) {
      console.error("Error handling WebSocket message:", err);
    }
  });
  ws.on("close", () => {
    leaveWetalksCall(ws);
    wetalksWsClients.delete(ws);
    leaveRelayChannel(ws);
    removePlayerFromGeoQueue(playerId);
    leavePlayerGeoRoom(playerId);
    const queueIdx = tetrisQueue.findIndex((c) => c.id === playerId);
    if (queueIdx !== -1) {
      tetrisQueue.splice(queueIdx, 1);
    }
    Object.keys(tetrisRooms).forEach((rId) => {
      const room = tetrisRooms[rId];
      if (room.player1.id === playerId || room.player2.id === playerId) {
        const opp = room.player1.id === playerId ? room.player2 : room.player1;
        try {
          opp.ws.send(JSON.stringify({ type: "tetris_opponent_disconnected" }));
        } catch (e) {
        }
        delete tetrisRooms[rId];
      }
    });
    Object.keys(rooms).forEach((rId) => {
      const room = rooms[rId];
      if (room.players[playerId]) {
        delete room.players[playerId];
        if (room.seekerId === playerId) {
          const remainingIds = Object.keys(room.players);
          if (remainingIds.length > 0) {
            const nextSeeker = remainingIds[0];
            room.players[nextSeeker].role = "seeker";
            room.seekerId = nextSeeker;
          } else {
            room.seekerId = null;
          }
        }
        const hasRealPlayer = Object.values(room.players).some((p) => !p.isBot);
        if (!hasRealPlayer) {
          delete rooms[rId];
        }
      }
    });
  });
});
function broadcastToRoom(roomId, message) {
  const payload = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === import_ws.WebSocket.OPEN) {
      const meta = wsMetaMap.get(client);
      if (meta?.chameleonRoomId === roomId) {
        client.send(payload);
      }
    }
  });
}
function broadcastAllWs(message) {
  const payload = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === import_ws.WebSocket.OPEN) {
      client.send(payload);
    }
  });
}
setInterval(() => {
  Object.keys(rooms).forEach((roomId) => {
    const room = rooms[roomId];
    broadcastToRoom(roomId, {
      type: "state_update",
      gameState: room
    });
  });
}, 40);
var BROADCASTS_FILE = import_path.default.join(process.cwd(), "broadcasts_db.json");
function readBroadcasts() {
  try {
    if (import_fs.default.existsSync(BROADCASTS_FILE)) {
      const data = import_fs.default.readFileSync(BROADCASTS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Error reading broadcasts db:", e);
  }
  return [];
}
function writeBroadcasts(broadcasts) {
  try {
    import_fs.default.writeFileSync(BROADCASTS_FILE, JSON.stringify(broadcasts, null, 2), "utf-8");
  } catch (e) {
    console.error("Error writing broadcasts db:", e);
  }
}
app.get("/api/admin/broadcasts", (req, res) => {
  const broadcasts = readBroadcasts();
  res.json(broadcasts);
});
app.post("/api/admin/broadcasts", (req, res) => {
  const { sender, title, text, kind, batFilename, batCode, autoRun, targetUser, senderClientId } = req.body;
  if (!title || !text && !batCode) {
    return res.status(400).json({ error: "Title and text/batCode are required" });
  }
  const broadcasts = readBroadcasts();
  const newBroadcast = {
    id: "bc-" + Date.now() + "-" + Math.random().toString(36).substr(2, 4),
    sender: sender || "\u7BA1\u7406\u8005 (Admin)",
    title,
    text: text || batCode || "",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    ...kind === "bat" ? {
      kind: "bat",
      batFilename: String(batFilename || title || "script.bat"),
      batCode: String(batCode || text || ""),
      autoRun: Boolean(autoRun)
    } : { kind: "docx" },
    ...targetUser ? { targetUser: String(targetUser) } : {},
    ...senderClientId ? { senderClientId: String(senderClientId) } : {}
  };
  broadcasts.push(newBroadcast);
  writeBroadcasts(broadcasts);
  broadcastAllWs({
    type: "admin_broadcast",
    broadcast: newBroadcast
  });
  res.json({ success: true, broadcast: newBroadcast });
});
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", playersCount: wss.clients.size });
});
app.get("/api/geoguessr/config", (_req, res) => {
  res.json({ provider: "panoramax-osm", requiresKey: false });
});
function isPrivateOrDisallowedHost(hostname) {
  const h = hostname.toLowerCase().trim();
  if (!h || h === "localhost" || h === "::1" || h.endsWith(".local") || h.endsWith(".internal")) {
    return true;
  }
  if (/^127\.|^10\.|^192\.168\.|^0\.|^169\.254\./.test(h)) {
    return true;
  }
  const m172 = h.match(/^172\.(\d+)\./);
  if (m172) {
    const second = Number(m172[1]);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}
app.get("/api/custom-web/check", async (req, res) => {
  const rawUrl = String(req.query.url || "").trim();
  if (!rawUrl || rawUrl === "about:blank") {
    return res.json({ ok: false, status: 0, blocked: true, reason: "URL\u304C\u672A\u8A2D\u5B9A\u307E\u305F\u306F\u7121\u52B9\u3067\u3059\u3002" });
  }
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return res.json({ ok: false, status: 0, blocked: true, reason: "\u7121\u52B9\u306AURL\u5F62\u5F0F\u3067\u3059\u3002" });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return res.json({ ok: false, status: 0, blocked: true, reason: "HTTP/HTTPS \u306E\u307F\u5BFE\u5FDC\u3057\u3066\u3044\u307E\u3059\u3002" });
  }
  if (isPrivateOrDisallowedHost(parsed.hostname)) {
    return res.json({ ok: false, status: 0, blocked: true, reason: "\u30ED\u30FC\u30AB\u30EB/\u30D7\u30E9\u30A4\u30D9\u30FC\u30C8URL\u306F\u691C\u8A3C\u5BFE\u8C61\u5916\u3067\u3059\u3002" });
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);
  try {
    const resp = await fetch(parsed.toString(), {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AbordOS-CustomWebCheck/1.0)",
        Accept: "text/html,application/xhtml+xml,*/*;q=0.8"
      }
    });
    clearTimeout(timeout);
    try {
      await resp.body?.cancel();
    } catch {
    }
    const xfo = (resp.headers.get("x-frame-options") || "").toLowerCase();
    const csp = (resp.headers.get("content-security-policy") || "").toLowerCase();
    const frameAncestorsMatch = csp.match(/frame-ancestors\s+([^;]+)/i);
    const frameAncestors = frameAncestorsMatch ? frameAncestorsMatch[1].trim() : "";
    let blocked = false;
    let reason = "";
    if (resp.status >= 400) {
      blocked = true;
      reason = `\u30B5\u30FC\u30D0\u30FC\u304C\u30A8\u30E9\u30FC (HTTP ${resp.status}) \u3092\u8FD4\u3057\u307E\u3057\u305F\u3002`;
    } else if (xfo.includes("deny") || xfo.includes("sameorigin")) {
      blocked = true;
      reason = `\u3053\u306E\u30B5\u30A4\u30C8\u306F iframe \u57CB\u3081\u8FBC\u307F\u3092\u7981\u6B62\u3057\u3066\u3044\u307E\u3059 (X-Frame-Options: ${xfo})\u3002`;
    } else if (frameAncestors && (frameAncestors.includes("'none'") || frameAncestors === "'self'")) {
      blocked = true;
      reason = `\u3053\u306E\u30B5\u30A4\u30C8\u306F CSP (frame-ancestors) \u306B\u3088\u308A\u57CB\u3081\u8FBC\u307F\u3092\u7981\u6B62\u3057\u3066\u3044\u307E\u3059\u3002`;
    }
    return res.json({ ok: !blocked, status: resp.status, blocked, reason });
  } catch (err) {
    clearTimeout(timeout);
    const aborted = err?.name === "AbortError";
    return res.json({
      ok: false,
      status: 0,
      blocked: false,
      reason: aborted ? "\u5FDC\u7B54\u30BF\u30A4\u30E0\u30A2\u30A6\u30C8\uFF084.5\u79D2\uFF09" : "\u63A5\u7D9A\u78BA\u8A8D\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002"
    });
  }
});
var isProduction = process.env.NODE_ENV === "production";
async function startServer() {
  if (!isProduction) {
    const isHmrDisabled = process.env.DISABLE_HMR === "true";
    let viteServerRef = null;
    let viteInitError = null;
    const viteInitPromise = (async () => {
      const { createServer: createViteServer } = await import("vite");
      viteServerRef = await createViteServer({
        server: {
          middlewareMode: true,
          ...isHmrDisabled ? { hmr: false, ws: false } : { hmr: { server } }
        },
        appType: "spa"
      });
    })().catch((err) => {
      viteInitError = err;
      console.error("Failed to initialize Vite dev server:", err);
    });
    if (isHmrDisabled) {
      app.use(async (req, res, next) => {
        if (req.path === "/@vite/client" || req.path.endsWith("/@vite/client")) {
          await viteInitPromise;
          if (viteServerRef) {
            try {
              const result = await viteServerRef.transformRequest("/@vite/client");
              if (result) {
                const patchedCode = result.code.replace(
                  "transport.connect(createHMRHandler(handleMessage));",
                  "/* HMR disabled via DISABLE_HMR=true */"
                );
                res.setHeader("Content-Type", "application/javascript");
                return res.send(patchedCode);
              }
            } catch {
            }
          }
        }
        next();
      });
    }
    app.use(async (req, res, next) => {
      if (!viteServerRef) {
        await viteInitPromise;
      }
      if (viteServerRef) {
        return viteServerRef.middlewares(req, res, next);
      }
      if (viteInitError) {
        return res.status(500).send("Vite initialization failed");
      }
      next();
    });
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use("/noon-os", import_express.default.static(distPath));
    app.use(import_express.default.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
