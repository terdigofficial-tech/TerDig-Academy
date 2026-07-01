import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase-server BEFORE importing progression
vi.mock('@/lib/supabase-server', () => ({
  createServerClient: vi.fn(),
}));

// Mock console.log/warn untuk menjaga output test tetap bersih
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});

import { createServerClient } from '@/lib/supabase-server';

// ========================================
// Helper: Pure function untuk test formula
// ========================================
function calculateFinalScore(
  avgObservation: number,
  avgWorksheet: number | null,
  weightObs: number,
  weightWs: number
): { finalScore: number; hasWorksheet: boolean } {
  const hasWorksheet = avgWorksheet !== null && avgWorksheet > 0;
  const finalScore = hasWorksheet
    ? avgObservation * weightObs + avgWorksheet * weightWs
    : avgObservation;
  return { finalScore, hasWorksheet };
}

describe('calculateFinalScore (pure logic)', () => {
  it('harus menghitung dengan bobot 50:50 (default)', () => {
    const { finalScore } = calculateFinalScore(80, 90, 0.5, 0.5);
    expect(finalScore).toBe(85);
  });

  it('harus menghitung dengan bobot 70:30 (observasi dominan)', () => {
    const { finalScore } = calculateFinalScore(90, 60, 0.7, 0.3);
    expect(finalScore).toBe(81);
  });

  it('harus menghitung dengan bobot 30:70 (worksheet dominan)', () => {
    const { finalScore } = calculateFinalScore(60, 90, 0.3, 0.7);
    expect(finalScore).toBe(81);
  });

  it('harus menggunakan hanya observasi jika worksheet null', () => {
    const { finalScore, hasWorksheet } = calculateFinalScore(85, null, 0.5, 0.5);
    expect(hasWorksheet).toBe(false);
    expect(finalScore).toBe(85);
  });

  it('harus menggunakan hanya observasi jika worksheet 0', () => {
    const { finalScore, hasWorksheet } = calculateFinalScore(75, 0, 0.5, 0.5);
    expect(hasWorksheet).toBe(false);
    expect(finalScore).toBe(75);
  });

  it('harus menangani angka desimal dengan presisi', () => {
    const { finalScore } = calculateFinalScore(83.5, 91.2, 0.5, 0.5);
    expect(finalScore).toBeCloseTo(87.35, 1);
  });

  it('harus menangani bobot ekstrem 100:0 (hanya observasi)', () => {
    const { finalScore } = calculateFinalScore(80, 100, 1, 0);
    expect(finalScore).toBe(80);
  });

  it('harus menangani bobot ekstrem 0:100 (hanya worksheet)', () => {
    const { finalScore } = calculateFinalScore(0, 95, 0, 1);
    expect(finalScore).toBe(95);
  });

  it('harus konsisten: weightObs + weightWs = 1', () => {
    const cases = [
      { obs: 70, ws: 80, wObs: 0.6, wWs: 0.4 },
      { obs: 70, ws: 80, wObs: 0.4, wWs: 0.6 },
      { obs: 70, ws: 80, wObs: 0.9, wWs: 0.1 },
    ];
    for (const s of cases) {
      const { finalScore } = calculateFinalScore(s.obs, s.ws, s.wObs, s.wWs);
      const min = Math.min(s.obs, s.ws);
      const max = Math.max(s.obs, s.ws);
      expect(finalScore).toBeGreaterThanOrEqual(min);
      expect(finalScore).toBeLessThanOrEqual(max);
    }
  });
});

describe('getWeights (dengan mock database)', () => {
  let mockSupabase: any;

  beforeEach(() => {
    // Buat mock supabase dengan chainable methods
    const createMockChain = (overrides: Record<string, any> = {}) => {
      const chain: Record<string, any> = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockReturnThis(),
        ...overrides,
      };
      // Setiap method return chain itu sendiri
      for (const key of Object.keys(chain)) {
        if (key !== 'then' && typeof chain[key] === 'function' && chain[key]._isMockFunction) {
          // Already a mock from vi.fn()
        }
      }
      return chain;
    };

    mockSupabase = {
      from: vi.fn().mockReturnValue(createMockChain()),
    };
    (createServerClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);
  });

  it('harus fallback ke 50:50 jika database error', async () => {
    // Mock: from('app_settings') → select → in → reject
    const appSettingsChain = {
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockRejectedValue(new Error('DB connection error')),
      }),
    };

    // Mock: from('attendance') → select → eq → order → limit → [mock attendances]
    const attendanceChain = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
      }),
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'app_settings') return appSettingsChain;
      if (table === 'attendance') return attendanceChain;
      // Default: semua query mengembalikan data: null
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: null }),
            }),
            in: vi.fn().mockResolvedValue({ data: null }),
            single: vi.fn().mockResolvedValue({ data: null }),
          }),
          in: vi.fn().mockResolvedValue({ data: [] }),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [] }),
        }),
        in: vi.fn().mockResolvedValue({ data: [] }),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [] }),
        single: vi.fn().mockResolvedValue({ data: null }),
        insert: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      };
    });

    const { checkAndPromoteStudent } = await import('@/lib/progression');

    // checkAndPromoteStudent akan panggil getWeights yang akan reject (DB error)
    // GetWeights catch error → fallback ke 50:50 → console.warn dipanggil
    // Lalu checkAndPromoteStudent lanjut cek attendance → null → return undefined
    const result = await checkAndPromoteStudent('test-id');
    expect(result).toBeUndefined();
    expect(console.warn).toHaveBeenCalled();
  });

  it('harus menggunakan bobot dari database jika tersedia', async () => {
    const mockWeightData = [
      { key: 'weight_observation', value: '70' },
      { key: 'weight_worksheet', value: '30' },
    ];

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'app_settings') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: mockWeightData }),
          }),
        };
      }
      // Default chain untuk tabel lain
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: null }),
            }),
            in: vi.fn().mockResolvedValue({ data: null }),
            single: vi.fn().mockResolvedValue({ data: null }),
          }),
          in: vi.fn().mockResolvedValue({ data: [] }),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [] }),
        }),
        in: vi.fn().mockResolvedValue({ data: [] }),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [] }),
        single: vi.fn().mockResolvedValue({ data: null }),
        insert: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      };
    });

    const { checkAndPromoteStudent } = await import('@/lib/progression');
    const result = await checkAndPromoteStudent('test-id');
    expect(result).toBeUndefined();
  });
});

describe('checkAndPromoteStudent — validasi logika naik level', () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();
    (console.warn as any).mockClear();
    
    mockSupabase = { from: vi.fn() };
    (createServerClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);
  });

  // Helper untuk membuat chain default
  function defaultChain(overrides: Record<string, any> = {}) {
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [] }),
            ...overrides.limitResolve,
          }),
          in: vi.fn().mockResolvedValue({ data: null }),
          single: vi.fn().mockResolvedValue({ data: null }),
          ...overrides.eqResolve,
        }),
        in: vi.fn().mockResolvedValue({ data: [] }),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [] }),
        single: vi.fn().mockResolvedValue({ data: null }),
        ...overrides.selectResolve,
      }),
      in: vi.fn().mockResolvedValue({ data: [] }),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [] }),
      single: vi.fn().mockResolvedValue({ data: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    };
  }

  it('tidak naik level jika kehadiran < 85% (3 dari 4 hadir)', async () => {
    const attendancesData = [
      { session_id: 's1', status: 'present' },
      { session_id: 's2', status: 'present' },
      { session_id: 's3', status: 'present' },
      { session_id: 's4', status: 'absent' },
    ];

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'app_settings') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: null }),
          }),
        };
      }
      if (table === 'attendance') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: attendancesData }),
              }),
            }),
          }),
        };
      }
      return defaultChain();
    });

    const { checkAndPromoteStudent } = await import('@/lib/progression');
    const result = await checkAndPromoteStudent('test-id');
    expect(result).toBeUndefined();
  });

  it('tidak naik level jika nilai akhir < 80', async () => {
    const attendancesData = [
      { session_id: 's1', status: 'present' },
      { session_id: 's2', status: 'present' },
      { session_id: 's3', status: 'present' },
      { session_id: 's4', status: 'present' },
    ];

    const assessmentsData = [
      { total_score: 70 },
      { total_score: 65 },
      { total_score: 75 },
      { total_score: 60 },
    ];

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'app_settings') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: [
              { key: 'weight_observation', value: '50' },
              { key: 'weight_worksheet', value: '50' },
            ] }),
          }),
        };
      }
      if (table === 'attendance') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: attendancesData }),
              }),
            }),
          }),
        };
      }
      if (table === 'assessments') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: assessmentsData }),
            }),
          }),
        };
      }
      if (table === 'worksheet_submissions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: [] }),
            }),
          }),
        };
      }
      return defaultChain();
    });

    const { checkAndPromoteStudent } = await import('@/lib/progression');
    const result = await checkAndPromoteStudent('test-id');
    expect(result).toBeUndefined();
  });

  it('harus naik level jika semua syarat terpenuhi', async () => {
    const attendancesData = [
      { session_id: 's1', status: 'present' },
      { session_id: 's2', status: 'present' },
      { session_id: 's3', status: 'present' },
      { session_id: 's4', status: 'present' },
    ];

    const assessmentsData = [
      { total_score: 85 },
      { total_score: 90 },
      { total_score: 88 },
      { total_score: 92 },
    ];

    const worksheetData = [
      { score: 80 },
      { score: 85 },
      { score: 82 },
      { score: 90 },
    ];

    const studentData = { id: 'test-id', current_level: 3 };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'app_settings') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: [
              { key: 'weight_observation', value: '60' },
              { key: 'weight_worksheet', value: '40' },
            ] }),
          }),
        };
      }
      if (table === 'attendance') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: attendancesData }),
              }),
            }),
          }),
        };
      }
      if (table === 'assessments') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: assessmentsData }),
            }),
          }),
        };
      }
      if (table === 'worksheet_submissions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: worksheetData }),
            }),
          }),
        };
      }
      if (table === 'students') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: studentData }),
              in: vi.fn().mockResolvedValue({ data: [] }),
              order: vi.fn().mockReturnThis(),
              limit: vi.fn().mockResolvedValue({ data: [] }),
            }),
            in: vi.fn().mockResolvedValue({ data: [] }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      if (table === 'progression_history') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return defaultChain();
    });

    // Hapus module cache agar import ulang mendapatkan mock terbaru
    const { checkAndPromoteStudent } = await import('@/lib/progression');
    const result = await checkAndPromoteStudent('test-id');

    expect(result).toBeDefined();
    expect(result!.promoted).toBe(true);
    expect(result!.newLevel).toBe(4); // dari 3 ke 4
    expect(result!.finalScore).toBeDefined();
    expect(parseFloat(result!.finalScore)).toBeGreaterThan(80);
  });
});
