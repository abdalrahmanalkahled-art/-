import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { convertToCSVWithArabic, encodeExcelCsvForNative } from '../export-with-path-picker';

// Suppress console errors during tests
const originalError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});
afterEach(() => {
  console.error = originalError;
});

// Mock modules
vi.mock('expo-file-system/legacy', () => ({
  documentDirectory: '/data/data/app/files/',
  cacheDirectory: '/data/data/app/cache/',
  writeAsStringAsync: vi.fn(),
  EncodingType: { UTF8: 'utf8', Base64: 'base64' },
}));

vi.mock('expo-sharing', () => ({
  isAvailableAsync: vi.fn().mockResolvedValue(true),
  shareAsync: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('react-native', () => ({
  Alert: {
    alert: vi.fn(),
  },
  Platform: {
    OS: 'android',
  },
  View: 'View',
  Text: 'Text',
  Modal: 'Modal',
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  StyleSheet: {
    create: (styles: any) => styles,
  },
  FlatList: 'FlatList',
  Dimensions: {
    get: () => ({ width: 375, height: 667 }),
  },
}));

vi.mock('expo-modules-core', () => ({
  NativeModulesProxy: {},
  Platform: {
    OS: 'android',
  },
  requireNativeModule: () => ({}),
}));

describe('Export with Path Picker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set global __DEV__
    (global as any).__DEV__ = false;
    (global as any).TurboModuleRegistry = { getEnforcing: () => ({}) };
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete (global as any).__DEV__;
    delete (global as any).TurboModuleRegistry;
    console.error = originalError;
  });

  describe('convertToCSVWithArabic - Data Conversion', () => {
    it('should convert data to CSV with UTF-8 BOM', () => {
      const data = [
        { name: 'محل 1', owner: 'أحمد', active: true },
        { name: 'محل 2', owner: 'علي', active: false },
      ];

      const result = convertToCSVWithArabic(data);

      // Check for UTF-8 BOM
      expect(result.charCodeAt(0)).toBe(0xFEFF);

      // Check content
      expect(result).toContain('sep=;');
      expect(result).toContain('name;owner;active');
      expect(result).toContain('محل 1;أحمد;نعم');
      expect(result).toContain('محل 2;علي;لا');
    });

    it('should handle custom columns', () => {
      const data = [
        { name: 'محل 1', owner: 'أحمد', phone: '0123456789' },
      ];
      const columns = ['name', 'phone'];

      const result = convertToCSVWithArabic(data, columns);

      expect(result).toContain('name;phone');
      expect(result).toContain('محل 1;0123456789');
      expect(result).not.toContain('أحمد');
    });

    it('should escape semicolons in values so Excel keeps the value in one cell', () => {
      const data = [
        { name: 'محل; مهم', address: 'شارع، الرياض' },
      ];

      const result = convertToCSVWithArabic(data);

      expect(result).toContain('"محل; مهم"');
      expect(result).toContain('شارع، الرياض');
    });

    it('should escape quotes in values', () => {
      const data = [
        { name: 'محل "الأول"', owner: 'أحمد "علي"' },
      ];

      const result = convertToCSVWithArabic(data);

      expect(result).toContain('"محل ""الأول"""');
      expect(result).toContain('"أحمد ""علي"""');
    });

    it('should handle null and undefined values', () => {
      const data = [
        { name: 'محل 1', owner: null, phone: undefined },
      ];

      const result = convertToCSVWithArabic(data);

      expect(result).toContain('محل 1;;');
    });

    it('should convert boolean values correctly', () => {
      const data = [
        { name: 'محل 1', isActive: true, isArchived: false },
      ];

      const result = convertToCSVWithArabic(data);

      expect(result).toContain('نعم');
      expect(result).toContain('لا');
    });

    it('should handle numbers correctly', () => {
      const data = [
        { name: 'محل 1', budget: 1000, actualCost: 750.50 },
      ];

      const result = convertToCSVWithArabic(data);

      expect(result).toContain('1000');
      expect(result).toContain('750.5');
    });

    it('should handle arrays by joining with semicolon', () => {
      const data = [
        { name: 'محل 1', tags: ['جديد', 'مهم', 'نشط'] },
      ];

      const result = convertToCSVWithArabic(data);

      expect(result).toContain('جديد; مهم; نشط');
    });

    it('should handle objects by converting to JSON', () => {
      const data = [
        { name: 'محل 1', metadata: { region: 'الرياض', category: 'عام' } },
      ];

      const result = convertToCSVWithArabic(data);

      expect(result).toContain('region');
      expect(result).toContain('الرياض');
    });

    it('should return empty string for empty data', () => {
      const result = convertToCSVWithArabic([]);

      expect(result).toBe('');
    });

    it('should handle newlines in values', () => {
      const data = [
        { name: 'محل 1', notes: 'ملاحظة\nسطر جديد' },
      ];

      const result = convertToCSVWithArabic(data);

      // Newlines should be preserved in quoted fields
      expect(result).toContain('ملاحظة');
      expect(result).toContain('سطر جديد');
    });

    it('should preserve column order', () => {
      const data = [
        { z: 'آخر', a: 'أول', m: 'وسط' },
      ];
      const columns = ['a', 'm', 'z'];

      const result = convertToCSVWithArabic(data, columns);

      const lines = result.split('\n');
      const separator = lines[0].replace('\uFEFF', '');
      expect(separator).toBe('sep=;');
      expect(lines[1]).toBe('a;m;z');
    });

    it('should handle mixed Arabic and English text', () => {
      const data = [
        { name: 'محل ABC', owner: 'أحمد Smith', phone: '+966123456789' },
      ];

      const result = convertToCSVWithArabic(data);

      expect(result).toContain('محل ABC');
      expect(result).toContain('أحمد Smith');
      expect(result).toContain('+966123456789');
    });

    it('should handle special characters', () => {
      const data = [
        { name: 'محل @#$%', notes: 'علامات خاصة: ™®©' },
      ];

      const result = convertToCSVWithArabic(data);

      expect(result).toContain('محل @#$%');
      expect(result).toContain('™®©');
    });

    it('should handle very long strings', () => {
      const longString = 'أ'.repeat(100); // Reduced from 1000 for faster tests
      const data = [
        { name: longString },
      ];

      const result = convertToCSVWithArabic(data);

      expect(result).toContain(longString);
    });

    it('should handle large datasets', () => {
      const data = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        name: `محل ${i + 1}`,
        owner: `مالك ${i + 1}`,
      }));

      const result = convertToCSVWithArabic(data);

      expect(result).toContain('محل 1');
      expect(result).toContain('محل 50');
      expect(result).toContain('محل 100');
    });
  });

  describe('Excel Arabic native encoding', () => {
    it('should encode Arabic CSV as UTF-16LE with a byte-order mark', () => {
      const content = convertToCSVWithArabic([{ name: 'محل دمشق' }]);
      const bytes = Array.from(atob(encodeExcelCsvForNative(content)), (character) => character.charCodeAt(0));

      expect(bytes.slice(0, 2)).toEqual([0xff, 0xfe]);
      expect(bytes).toContain('م'.charCodeAt(0) & 0xff);
      expect(bytes).toContain('م'.charCodeAt(0) >> 8);
    });
  });

  describe('Export Stores Data', () => {
    it('should export stores with correct columns', () => {
      const storesData = [
        {
          name: 'محل الرياض',
          ownerName: 'أحمد',
          phone: '0123456789',
          region: 'الرياض',
          address: 'شارع النيل',
          category: 'عام',
          isActive: true,
        },
      ];

      const result = convertToCSVWithArabic(storesData);

      expect(result).toContain('محل الرياض');
      expect(result).toContain('أحمد');
      expect(result).toContain('0123456789');
      expect(result).toContain('الرياض');
      expect(result).toContain('شارع النيل');
      expect(result).toContain('عام');
      expect(result).toContain('نعم');
    });
  });

  describe('Export events data', () => {
    it('should export events with correct columns', () => {
      const eventsData = [
        {
          title: 'فعالية الرياض',
          eventDate: '2026-05-31',
          location: 'مركز المعارض',
          region: 'الرياض',
          budget: 10000,
          actualCost: 8500,
          status: 'مكتملة',
        },
      ];

      const result = convertToCSVWithArabic(eventsData);

      expect(result).toContain('فعالية الرياض');
      expect(result).toContain('2026-05-31');
      expect(result).toContain('مركز المعارض');
      expect(result).toContain('10000');
      expect(result).toContain('8500');
      expect(result).toContain('مكتملة');
    });
  });

  describe('Export surveys data', () => {
    it('should export survey templates with correct columns', () => {
      const templatesData = [
        {
          name: 'استبيان الرضا',
          createdAt: '2026-05-31T10:00:00Z',
        },
      ];

      const result = convertToCSVWithArabic(templatesData);

      expect(result).toContain('استبيان الرضا');
      expect(result).toContain('2026-05-31T10:00:00Z');
    });

    it('should export survey results with correct columns', () => {
      const resultsData = [
        {
          id: '1',
          templateId: 'template-1',
          storeId: 'store-1',
          surveyDate: '2026-05-31',
        },
      ];

      const result = convertToCSVWithArabic(resultsData);

      expect(result).toContain('1');
      expect(result).toContain('template-1');
      expect(result).toContain('store-1');
      expect(result).toContain('2026-05-31');
    });
  });
});
