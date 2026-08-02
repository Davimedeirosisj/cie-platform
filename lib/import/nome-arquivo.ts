/**
 * Supabase Storage only accepts a restricted ASCII set in object keys. TSE
 * exports routinely carry accents ("...votacao-CEARÁ-1T-SECAO..."), which
 * failed the upload outright with "Invalid key".
 *
 * Only the storage key is sanitised -- import_batches.nome_arquivo keeps the
 * original name so the history shows the file as the user knows it.
 */
export function sanitizarNomeArquivo(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // combining accents left by NFD
    .replace(/[^a-zA-Z0-9._-]/g, "_");
}
