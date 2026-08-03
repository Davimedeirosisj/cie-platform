#!/usr/bin/env node
/**
 * Carrega os denominadores oficiais do TSE em `votos_totais`.
 *
 * O denominador é quantos votos foram dados ao cargo em cada território. Sem
 * ele o sistema só sabe volume ("Messejana é o maior bairro"); com ele responde
 * força ("Messejana tem 3,85%, mas Guajeru tem 5,86%").
 *
 * Existe como script, e não como carga manual, porque o mesmo trabalho se
 * repete a cada eleição -- em 2026 é rodar de novo apontando para o arquivo
 * novo. Também é a única via prática: são ~22 mil seções por estado, volume que
 * não cabe em execução interativa.
 *
 * USO
 *   node scripts/importar-totais-tse.mjs <arquivo> [opções]
 *
 *   <arquivo>  .zip ou .csv do TSE (dados abertos, "votacao_secao_<ano>_<UF>")
 *              https://dadosabertos.tse.jus.br/dataset/resultados-<ano>
 *
 *   --cargo-tse  "Deputado Federal"   nome do cargo COMO O TSE ESCREVE
 *   --cargo      "Deputada Federal"   nome do cargo COMO A CAMPANHA USA
 *   --ano        2022
 *   --turno      1
 *   --candidata  "NOME COMPLETO NA URNA"   (opcional; confere o total do banco)
 *   --dry-run                              (calcula e mostra, não grava)
 *
 * Os dois nomes de cargo são separados de propósito: o TSE publica no
 * masculino genérico e a campanha registra no feminino. Já houve um bug por
 * isso -- o join por (ano, cargo) não casava e a penetração vinha vazia.
 *
 * REQUER  SUPABASE_SERVICE_ROLE_KEY no .env.local. A escrita passa por cima da
 * RLS, o que é o ponto: é carga administrativa, não ação de usuário. Nunca
 * exponha essa chave no navegador.
 */
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const RAIZ = path.resolve(import.meta.dirname, "..");

// ---------------------------------------------------------------- argumentos

function lerArgs(argv) {
  const [arquivo, ...resto] = argv;
  const op = {
    arquivo,
    cargoTse: "Deputado Federal",
    cargo: "Deputada Federal",
    ano: 2022,
    turno: "1",
    candidata: null,
    dryRun: false,
  };
  for (let i = 0; i < resto.length; i++) {
    const a = resto[i];
    if (a === "--dry-run") op.dryRun = true;
    else if (a === "--cargo-tse") op.cargoTse = resto[++i];
    else if (a === "--cargo") op.cargo = resto[++i];
    else if (a === "--ano") op.ano = Number(resto[++i]);
    else if (a === "--turno") op.turno = String(resto[++i]);
    else if (a === "--candidata") op.candidata = resto[++i];
    else throw new Error(`Opção desconhecida: ${a}`);
  }
  if (!op.arquivo) throw new Error("Informe o arquivo do TSE (.zip ou .csv).");
  if (!Number.isInteger(op.ano)) throw new Error("--ano precisa ser um número.");
  return op;
}

// ------------------------------------------------------------------ leitura

/**
 * Devolve as linhas do CSV já em UTF-8.
 *
 * O arquivo do TSE vem em latin1 e o descompactado passa de 700 MB, então é
 * lido em fluxo: carregar inteiro na memória trava máquinas modestas.
 */
function abrirLinhas(arquivo) {
  const ext = path.extname(arquivo).toLowerCase();

  if (ext === ".csv") {
    return createInterface({
      input: createReadStream(arquivo, { encoding: "latin1" }),
      crlfDelay: Infinity,
    });
  }

  if (ext !== ".zip") {
    throw new Error(`Extensão não suportada: ${ext}. Use .zip ou .csv.`);
  }

  // `unzip -p` joga o conteúdo em stdout sem gravar os 700 MB em disco.
  const proc = spawn("unzip", ["-p", arquivo, "*.csv"], { stdio: ["ignore", "pipe", "pipe"] });
  proc.on("error", () => {
    console.error(
      "\nNão consegui executar `unzip`. Descompacte o arquivo e passe o .csv direto:\n" +
        `  node scripts/importar-totais-tse.mjs caminho/para/arquivo.csv\n`,
    );
    process.exit(1);
  });
  proc.stdout.setEncoding("latin1");
  return createInterface({ input: proc.stdout, crlfDelay: Infinity });
}

/**
 * Quebra a linha do TSE em campos.
 *
 * Os campos vêm entre aspas e separados por ponto e vírgula. Um split simples
 * basta para as colunas que interessam (todas antes dos campos de endereço,
 * que são os únicos onde texto livre poderia conter o separador).
 */
function campos(linha) {
  return linha.split(";").map((c) => c.replace(/^"|"$/g, ""));
}

// Posições fixas no layout do TSE (1-indexadas na documentação).
const COL = { TURNO: 5, MUNICIPIO: 14, ZONA: 15, SECAO: 16, CARGO: 18, VOTAVEL: 20, VOTOS: 21 };

async function agregarArquivo(op) {
  const rl = abrirLinhas(op.arquivo);

  const porSecao = new Map(); // "zona,secao"      -> total do cargo
  const porMunicipio = new Map(); // nome          -> total do cargo
  const porZona = new Map(); // numero            -> total do cargo
  let votosCandidata = 0;
  let secoesCandidata = 0;
  let lidas = 0;
  let primeira = true;

  for await (const linha of rl) {
    if (primeira) {
      primeira = false;
      continue; // cabeçalho
    }
    if (!linha) continue;

    const c = campos(linha);
    if (c[COL.TURNO] !== op.turno) continue;
    if (c[COL.CARGO] !== op.cargoTse) continue;

    const zona = c[COL.ZONA];
    const secao = c[COL.SECAO];
    const municipio = c[COL.MUNICIPIO];
    const votos = Number(c[COL.VOTOS]) || 0;

    porSecao.set(`${zona},${secao}`, (porSecao.get(`${zona},${secao}`) ?? 0) + votos);
    porMunicipio.set(municipio, (porMunicipio.get(municipio) ?? 0) + votos);
    porZona.set(zona, (porZona.get(zona) ?? 0) + votos);

    if (op.candidata && c[COL.VOTAVEL] === op.candidata && votos > 0) {
      votosCandidata += votos;
      secoesCandidata++;
    }

    if (++lidas % 500_000 === 0) process.stderr.write(`  ...${lidas.toLocaleString("pt-BR")} linhas\n`);
  }

  return { porSecao, porMunicipio, porZona, votosCandidata, secoesCandidata, lidas };
}

// ------------------------------------------------------------------- banco

async function conectar() {
  const env = await readFile(path.join(RAIZ, ".env.local"), "utf8").catch(() => "");
  const ler = (nome) =>
    process.env[nome] ??
    env.match(new RegExp(`^${nome}=(.*)$`, "m"))?.[1]?.trim().replace(/^["']|["']$/g, "");

  const url = ler("NEXT_PUBLIC_SUPABASE_URL");
  const chave = ler("SUPABASE_SERVICE_ROLE_KEY");

  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL não encontrada no .env.local.");
  if (!chave) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não encontrada.\n" +
        "Pegue em Supabase > Project Settings > API > service_role e acrescente ao .env.local.\n" +
        "Ela ignora a RLS -- mantenha fora do repositório e nunca use no navegador.",
    );
  }

  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, chave, { auth: { persistSession: false } });
}

/** PostgREST devolve no máximo 1.000 linhas por vez; pagina até acabar. */
async function buscarTudo(supabase, tabela, select) {
  const passo = 1000;
  const todas = [];
  for (let de = 0; ; de += passo) {
    const { data, error } = await supabase.from(tabela).select(select).range(de, de + passo - 1);
    if (error) throw new Error(`Erro lendo ${tabela}: ${error.message}`);
    todas.push(...data);
    if (data.length < passo) return todas;
  }
}

/**
 * Apaga o que existe para (ano, cargo) e insere de novo.
 *
 * Não dá para usar upsert: a unicidade de `votos_totais` vem de quatro índices
 * parciais, um por nível, e o upsert precisa de um alvo de conflito único.
 * Apagar e reinserir é idempotente, roda duas vezes sem duplicar, e mantém o
 * arquivo do TSE como fonte da verdade -- que é o comportamento desejado numa
 * recarga.
 */
async function gravar(supabase, linhas, op) {
  const { error: errApaga } = await supabase
    .from("votos_totais")
    .delete()
    .eq("ano", op.ano)
    .eq("cargo", op.cargo);
  if (errApaga) throw new Error(`Erro limpando denominadores anteriores: ${errApaga.message}`);

  const lote = 500;
  let gravadas = 0;
  for (let i = 0; i < linhas.length; i += lote) {
    const { error } = await supabase.from("votos_totais").insert(linhas.slice(i, i + lote));
    if (error) throw new Error(`Erro gravando votos_totais: ${error.message}`);
    gravadas += Math.min(lote, linhas.length - i);
    process.stderr.write(`  ...${gravadas}/${linhas.length}\n`);
  }
  return gravadas;
}

// -------------------------------------------------------------------- main

async function main() {
  const op = lerArgs(process.argv.slice(2));

  console.log(`Lendo ${path.basename(op.arquivo)} (cargo TSE: "${op.cargoTse}", turno ${op.turno})`);
  const ag = await agregarArquivo(op);
  console.log(
    `  ${ag.lidas.toLocaleString("pt-BR")} linhas do cargo | ` +
      `${ag.porSecao.size.toLocaleString("pt-BR")} seções | ` +
      `${ag.porMunicipio.size} municípios | ${ag.porZona.size} zonas`,
  );

  const supabase = await conectar();

  console.log("Lendo territórios do banco...");
  const [municipios, zonas, secoes] = await Promise.all([
    buscarTudo(supabase, "municipios", "id, nome"),
    buscarTudo(supabase, "zonas", "id, numero_zona"),
    buscarTudo(supabase, "secoes", "id, numero_secao, bairro_id, zonas(numero_zona)"),
  ]);
  console.log(`  ${municipios.length} municípios | ${zonas.length} zonas | ${secoes.length} seções`);

  const base = { ano: op.ano, cargo: op.cargo, fonte: "TSE dados abertos" };
  const linhas = [];

  for (const m of municipios) {
    const total = ag.porMunicipio.get(m.nome);
    if (total != null) linhas.push({ ...base, nivel: "municipio", municipio_id: m.id, total_votos: total });
  }
  for (const z of zonas) {
    const total = ag.porZona.get(String(z.numero_zona));
    if (total != null) linhas.push({ ...base, nivel: "zona", zona_id: z.id, total_votos: total });
  }

  // Bairro é somado a partir das seções, porque o TSE não publica bairro.
  const porBairro = new Map();
  let semCorrespondencia = 0;
  for (const s of secoes) {
    const numeroZona = s.zonas?.numero_zona;
    const total = ag.porSecao.get(`${numeroZona},${s.numero_secao}`);
    if (total == null) {
      semCorrespondencia++;
      continue;
    }
    linhas.push({ ...base, nivel: "secao", secao_id: s.id, total_votos: total });
    if (s.bairro_id) porBairro.set(s.bairro_id, (porBairro.get(s.bairro_id) ?? 0) + total);
  }
  for (const [bairroId, total] of porBairro) {
    linhas.push({ ...base, nivel: "bairro", bairro_id: bairroId, total_votos: total });
  }

  console.log(
    `Preparadas ${linhas.length.toLocaleString("pt-BR")} linhas ` +
      `(${porBairro.size} bairros; ${semCorrespondencia} seções sem correspondência no TSE)`,
  );

  if (op.candidata) {
    console.log(
      `\nConferência com o TSE — ${op.candidata}\n` +
        `  TSE: ${ag.votosCandidata.toLocaleString("pt-BR")} votos em ${ag.secoesCandidata} seções`,
    );
    const { data: campanha } = await supabase
      .from("campanhas")
      .select("id, nome")
      .eq("ano", op.ano)
      .maybeSingle();

    if (campanha) {
      // Soma pela visão de município: é o nível mais alto, então já reflete a
      // regra de "grão mais fino ganha" sem risco de contar duas vezes.
      const linhasVotos = await buscarTudo(
        supabase,
        "vw_votos_municipio",
        "total_votos, campanha_id",
      );
      const noBanco = linhasVotos
        .filter((r) => r.campanha_id === campanha.id)
        .reduce((s, r) => s + Number(r.total_votos), 0);

      const dif = ag.votosCandidata - noBanco;
      const pct = ((Math.abs(dif) / ag.votosCandidata) * 100).toFixed(2);
      console.log(
        `  ${campanha.nome}: ${noBanco.toLocaleString("pt-BR")} (diferença de ${dif}, ${pct}%)`,
      );
      if (Math.abs(dif) / ag.votosCandidata > 0.02) {
        console.log("  ATENÇÃO: divergência acima de 2% — vale investigar antes de confiar.");
      }
    }
  }

  if (op.dryRun) {
    console.log("\n--dry-run: nada foi gravado.");
    return;
  }

  console.log("\nGravando...");
  const n = await gravar(supabase, linhas, op);
  console.log(`Pronto: ${n.toLocaleString("pt-BR")} denominadores gravados.`);
}

main().catch((e) => {
  console.error(`\n${e.message}`);
  process.exit(1);
});
