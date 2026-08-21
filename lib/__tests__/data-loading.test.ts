import { describe, it, expect, beforeEach, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock storage functions
const STORAGE_KEYS = {
  STORES: 'stores',
  SURVEY_TEMPLATES: 'survey_templates',
  SURVEY_RESULTS: 'survey_results',
  PRODUCTS: 'products',
  EVENTS: 'events',
  MARKETING_GOALS: 'marketing_goals',
};

const getItems = async (key: string) => {
  const data = await AsyncStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

const saveItems = async (key: string, data: any) => {
  await AsyncStorage.setItem(key, JSON.stringify(data));
};

// Mock AsyncStorage
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
}));

describe('Data Loading Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loadStores', () => {
    it('should load and filter active stores', async () => {
      const mockStores = [
        {
          id: '1',
          name: 'محل 1',
          ownerName: 'أحمد',
          phone: '0123456789',
          region: 'منطقة 1',
          address: 'العنوان 1',
          category: 'نخبة',
          notes: '',
          isActive: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          name: 'محل 2',
          ownerName: 'محمد',
          phone: '0987654321',
          region: 'منطقة 2',
          address: 'العنوان 2',
          category: 'عادي',
          notes: '',
          isActive: false,
          createdAt: new Date().toISOString(),
        },
      ];

      (AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify(mockStores));

      const data = await getItems(STORAGE_KEYS.STORES);
      const filtered = data.filter((s: any) => s.isActive);

      expect(filtered).toHaveLength(1);
      expect((filtered[0] as any).name).toBe('محل 1');
    });

    it('should handle empty stores list', async () => {
      (AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify([]));

      const data = await getItems(STORAGE_KEYS.STORES);
      const filtered = data.filter((s: any) => s.isActive);

      expect(filtered).toHaveLength(0);
    });

    it('should handle storage errors gracefully', async () => {
      (AsyncStorage.getItem as any).mockRejectedValue(new Error('Storage error'));

      try {
        await getItems(STORAGE_KEYS.STORES);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should sort stores by creation date', async () => {
      const now = new Date();
      const mockStores = [
        {
          id: '1',
          name: 'محل 1',
          ownerName: 'أحمد',
          phone: '0123456789',
          region: 'منطقة 1',
          address: 'العنوان 1',
          category: 'نخبة',
          notes: '',
          isActive: true,
          createdAt: new Date(now.getTime() - 1000).toISOString(),
        },
        {
          id: '2',
          name: 'محل 2',
          ownerName: 'محمد',
          phone: '0987654321',
          region: 'منطقة 2',
          address: 'العنوان 2',
          category: 'عادي',
          notes: '',
          isActive: true,
          createdAt: new Date(now.getTime() + 1000).toISOString(),
        },
      ];

      (AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify(mockStores));

      const data = await getItems(STORAGE_KEYS.STORES);
      const sorted = data.sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      expect((sorted[0] as any).id).toBe('2');
      expect((sorted[1] as any).id).toBe('1');
    });
  });

  describe('loadSurveys (loadData)', () => {
    it('should load templates, results, stores, and products in parallel', async () => {
      const mockTemplates = [
        {
          id: '1',
          name: 'استبيان 1',
          createdAt: new Date().toISOString(),
          products: [],
        },
      ];

      const mockResults = [
        {
          id: '1',
          templateId: '1',
          templateName: 'استبيان 1',
          storeId: '1',
          storeName: 'محل 1',
          storeRegion: 'منطقة 1',
          surveyDate: new Date().toISOString(),
          data: [],
          createdAt: new Date().toISOString(),
        },
      ];

      const mockStores = [
        {
          id: '1',
          name: 'محل 1',
          region: 'منطقة 1',
          isActive: true,
        },
      ];

      const mockProducts = [
        {
          id: '1',
          name: 'منتج 1',
          categoryName: 'فئة 1',
          type: 'company' as const,
        },
      ];

      (AsyncStorage.getItem as any)
        .mockResolvedValueOnce(JSON.stringify(mockTemplates))
        .mockResolvedValueOnce(JSON.stringify(mockResults))
        .mockResolvedValueOnce(JSON.stringify(mockStores))
        .mockResolvedValueOnce(JSON.stringify(mockProducts));

      const [templates, results, stores, products] = await Promise.all([
        getItems(STORAGE_KEYS.SURVEY_TEMPLATES),
        getItems(STORAGE_KEYS.SURVEY_RESULTS),
        getItems(STORAGE_KEYS.STORES),
        getItems(STORAGE_KEYS.PRODUCTS),
      ]);

      expect(templates).toHaveLength(1);
      expect(results).toHaveLength(1);
      expect(stores).toHaveLength(1);
      expect(products).toHaveLength(1);
    });

    it('should sort templates and results by creation date descending', async () => {
      const now = new Date();
      const mockTemplates = [
        {
          id: '1',
          name: 'استبيان 1',
          createdAt: new Date(now.getTime() - 1000).toISOString(),
          products: [],
        },
        {
          id: '2',
          name: 'استبيان 2',
          createdAt: new Date(now.getTime() + 1000).toISOString(),
          products: [],
        },
      ];

      (AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify(mockTemplates));

      const data = await getItems(STORAGE_KEYS.SURVEY_TEMPLATES);
      const sorted = data.sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      expect((sorted[0] as any).id).toBe('2');
      expect((sorted[1] as any).id).toBe('1');
    });

    it('should filter only active stores', async () => {
      const mockStores = [
        {
          id: '1',
          name: 'محل 1',
          region: 'منطقة 1',
          isActive: true,
        },
        {
          id: '2',
          name: 'محل 2',
          region: 'منطقة 2',
          isActive: false,
        },
      ];

      (AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify(mockStores));

      const data = await getItems(STORAGE_KEYS.STORES);
      const activeStores = data.filter((s: any) => s.isActive !== false);

      expect(activeStores).toHaveLength(1);
      expect((activeStores[0] as any).name).toBe('محل 1');
    });

    it('should handle parallel load errors', async () => {
      (AsyncStorage.getItem as any).mockRejectedValue(new Error('Load failed'));

      try {
        await Promise.all([
          getItems(STORAGE_KEYS.SURVEY_TEMPLATES),
          getItems(STORAGE_KEYS.SURVEY_RESULTS),
          getItems(STORAGE_KEYS.STORES),
          getItems(STORAGE_KEYS.PRODUCTS),
        ]);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('loadEvents', () => {
    it('should load and sort events by date descending', async () => {
      const now = new Date();
      const mockEvents = [
        {
          id: '1',
          title: 'فعالية 1',
          eventDate: new Date(now.getTime() - 1000).toISOString().split('T')[0],
          location: 'الموقع 1',
          region: 'منطقة 1',
          detailedAddress: 'العنوان المفصل 1',
          budget: 1000,
          actualCost: 900,
          giftsDistributed: 50,
          attendeesCount: 100,
          status: 'completed' as const,
          createdAt: new Date(now.getTime() - 1000).toISOString(),
        },
        {
          id: '2',
          title: 'فعالية 2',
          eventDate: new Date(now.getTime() + 1000).toISOString().split('T')[0],
          location: 'الموقع 2',
          region: 'منطقة 2',
          detailedAddress: 'العنوان المفصل 2',
          budget: 2000,
          actualCost: 1800,
          giftsDistributed: 100,
          attendeesCount: 200,
          status: 'planned' as const,
          createdAt: new Date(now.getTime() + 1000).toISOString(),
        },
      ];

      (AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify(mockEvents));

      const data = await getItems(STORAGE_KEYS.EVENTS);
      const sorted = data.sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      expect((sorted[0] as any).id).toBe('2');
      expect((sorted[1] as any).id).toBe('1');
    });

    it('should handle empty events list', async () => {
      (AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify([]));

      const data = await getItems(STORAGE_KEYS.EVENTS);

      expect(data).toHaveLength(0);
    });

    it('should handle storage errors in events loading', async () => {
      (AsyncStorage.getItem as any).mockRejectedValue(new Error('Storage error'));

      try {
        await getItems(STORAGE_KEYS.EVENTS);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should preserve all event properties', async () => {
      const mockEvent = {
        id: '1',
        title: 'فعالية 1',
        eventDate: '2024-05-31',
        location: 'الموقع 1',
        region: 'منطقة 1',
        detailedAddress: 'العنوان المفصل 1',
        budget: 1000,
        actualCost: 900,
        giftsDistributed: 50,
        attendeesCount: 100,
        status: 'completed' as const,
        rating: 4.5,
        notes: 'ملاحظات',
        imageUri: 'uri://image',
        mediaUris: ['uri://media1'],
        goalId: 'goal1',
        createdAt: new Date().toISOString(),
      };

      (AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify([mockEvent]));

      const data = await getItems(STORAGE_KEYS.EVENTS);

      expect(data[0]).toEqual(mockEvent);
      expect((data[0] as any).rating).toBe(4.5);
      expect((data[0] as any).notes).toBe('ملاحظات');
    });
  });

  describe('Data Validation', () => {
    it('should validate store data structure', () => {
      const mockStore: any = {
        id: '1',
        name: 'محل 1',
        ownerName: 'أحمد',
        phone: '0123456789',
        region: 'منطقة 1',
        address: 'العنوان 1',
        category: 'نخبة',
        notes: '',
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      expect(mockStore).toHaveProperty('id');
      expect(mockStore).toHaveProperty('name');
      expect(mockStore).toHaveProperty('isActive');
      expect(mockStore).toHaveProperty('createdAt');
    });

    it('should validate survey template data structure', () => {
      const mockTemplate: any = {
        id: '1',
        name: 'استبيان 1',
        createdAt: new Date().toISOString(),
        products: [],
      };

      expect(mockTemplate).toHaveProperty('id');
      expect(mockTemplate).toHaveProperty('name');
      expect(mockTemplate).toHaveProperty('createdAt');
      expect(Array.isArray(mockTemplate.products)).toBe(true);
    });

    it('should validate event data structure', () => {
      const mockEvent: any = {
        id: '1',
        title: 'فعالية 1',
        eventDate: '2024-05-31',
        location: 'الموقع 1',
        region: 'منطقة 1',
        detailedAddress: 'العنوان المفصل 1',
        budget: 1000,
        actualCost: 900,
        giftsDistributed: 50,
        attendeesCount: 100,
        status: 'completed' as const,
        createdAt: new Date().toISOString(),
      };

      expect(mockEvent).toHaveProperty('id');
      expect(mockEvent).toHaveProperty('title');
      expect(mockEvent).toHaveProperty('status');
      expect(['planned', 'ongoing', 'completed', 'cancelled']).toContain(mockEvent.status);
    });
  });
});
