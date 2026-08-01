/**
 * Fills in latitude/longitude for municípios or bairros that have none.
 *
 * The maps only plot territories that carry coordinates, so anything created
 * by an import starts invisible -- that is what left /mapa showing a single
 * marker after the 2022 file added 165 municípios.
 *
 * Usage (from the repo root, with NEXT_PUBLIC_MAPBOX_TOKEN in .env.local):
 *
 *   node scripts/geocode-territorios.mjs municipios
 *   node scripts/geocode-territorios.mjs bairros FORTALEZA
 *
 * Prints an UPDATE statement to stdout rather than writing to the database:
 * geocoding is a guess, and the result should be eyeballed before it lands on
 * a map that informs campaign decisions.
 *
 * Two guards against Mapbox answering with something plausible but wrong:
 * results must carry the expected feature_type, and must fall inside the
 * state's bounding box. Anything else is reported as a failure instead of
 * being written. Coordinates shared by several territories are also flagged --
 * that is Mapbox falling back to a generic point (a city centroid) when it
 * cannot find the place, which otherwise passes the bbox check silently.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const [, , alvo, municipioFiltro] = process.argv;

if (alvo !== "municipios" && alvo !== "bairros") {
  console.error("uso: node scripts/geocode-territorios.mjs <municipios|bairros> [municipio]");
  process.exit(1);
}

const env = readFileSync(".env.local", "utf8");
const pegar = (chave) => env.match(new RegExp(`${chave}=(.+)`))?.[1]?.trim();

const TOKEN = pegar("NEXT_PUBLIC_MAPBOX_TOKEN");
const SUPABASE_URL = pegar("NEXT_PUBLIC_SUPABASE_URL");
const SUPABASE_KEY = pegar("SUPABASE_SERVICE_ROLE_KEY") ?? pegar("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

if (!TOKEN) throw new Error("NEXT_PUBLIC_MAPBOX_TOKEN ausente em .env.local");

// Ceará, with a small margin. Change this if the campaign moves state.
const BBOX = { w: -41.6, s: -8.0, e: -37.1, n: -2.6 };

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function pendentes() {
  let q = supabase
    .from(alvo)
    .select(alvo === "bairros" ? "nome, municipios(nome)" : "nome")
    .is("latitude", null);
  const { data, error } = await q;
  if (error) throw new Error(`consulta falhou: ${error.message}`);
  return (data ?? [])
    .filter((r) => !municipioFiltro || r.municipios?.nome === municipioFiltro)
    .map((r) => ({ nome: r.nome, contexto: r.municipios?.nome }));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function geocode({ nome, contexto }) {
  const termo = alvo === "bairros" ? `${nome}, ${contexto}, Ceará, Brasil` : `${nome}, Ceará, Brasil`;
  const tipos = alvo === "bairros" ? "neighborhood,locality" : "place";
  const url =
    "https://api.mapbox.com/search/geocode/v6/forward" +
    `?q=${encodeURIComponent(termo)}&country=br&limit=1&language=pt&types=${tipos}` +
    `&bbox=${BBOX.w},${BBOX.s},${BBOX.e},${BBOX.n}&access_token=${TOKEN}`;

  const r = await fetch(url);
  if (!r.ok) return { erro: `HTTP ${r.status}` };
  const f = (await r.json()).features?.[0];
  if (!f) return { erro: "sem resultado" };

  const [lon, lat] = f.geometry.coordinates;
  if (lon < BBOX.w || lon > BBOX.e || lat < BBOX.s || lat > BBOX.n) {
    return { erro: `fora do estado (${lat},${lon})` };
  }
  return { lat, lon, retornado: f.properties?.name ?? "", tipo: f.properties?.feature_type };
}

const lista = await pendentes();
console.error(`${lista.length} ${alvo} sem coordenada\n`);

const ok = [];
const falhas = [];

for (const item of lista) {
  const r = await geocode(item);
  await sleep(120);
  if (r.erro) {
    falhas.push({ ...item, motivo: r.erro });
    console.error(`FALHA  ${item.nome} -> ${r.erro}`);
  } else {
    ok.push({ nome: item.nome, ...r });
    console.error(`ok     ${item.nome} -> ${r.retornado} [${r.tipo}]`);
  }
}

const porCoord = new Map();
for (const r of ok) {
  const k = `${r.lat},${r.lon}`;
  porCoord.set(k, [...(porCoord.get(k) ?? []), r.nome]);
}
const repetidas = [...porCoord.entries()].filter(([, v]) => v.length > 1);

console.error(`\n=== ${ok.length} ok, ${falhas.length} falhas ===`);
if (repetidas.length) {
  console.error("COORDENADAS REPETIDAS -- provavelmente fallback generico, confira antes de aplicar:");
  for (const [c, nomes] of repetidas) console.error(`  ${c} -> ${nomes.join(", ")}`);
}

if (ok.length === 0) process.exit(0);

const linhas = ok
  .map((r) => `  ('${r.nome.replace(/'/g, "''")}',${r.lat},${r.lon})`)
  .join(",\n");

console.log(`update ${alvo} t
set latitude = v.lat, longitude = v.lon
from (values
${linhas}
) as v(nome, lat, lon)
where t.nome = v.nome;`);
