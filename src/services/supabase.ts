// File ini dulunya digunakan untuk Supabase. 
// Sekarang hanya menyimpan flag isSupabaseConfigured = true agar hooks tidak error,
// sebelum nantinya file ini dihapus sepenuhnya setelah refactoring selesai.

export const isSupabaseConfigured = true;

// Mock function agar import getSupabase tidak menyebabkan crash
export function getSupabase(): any {
  console.warn("getSupabase called but Supabase has been removed. Use custom API instead.");
  return {
    auth: {},
    from: () => ({ select: () => ({ eq: () => ({ order: () => ({}) }) }) })
  };
}

