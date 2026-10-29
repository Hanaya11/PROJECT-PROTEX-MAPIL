export const validateReport = (
  judul: string,
  deskripsi: string,
  jenis_laporan: string,
  lokasi: string,
  tanggal_kejadian: string,
): boolean => {
  if (judul.trim() === "") return false;
  if (deskripsi.trim() === "") return false;
  if (lokasi.trim() === "") return false;
  if (tanggal_kejadian.trim() === "") return false;

  if (jenis_laporan !== "hilang" && jenis_laporan !== "ditemukan") {
    return false;
  }

  return true;
};
