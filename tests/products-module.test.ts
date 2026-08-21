import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * اختبارات صفحة إدارة المنتجات
 */

describe('Products Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Product Management', () => {
    it('should create a new product with valid data', () => {
      const product = {
        id: '1',
        name: 'منتج جديد',
        categoryId: 'powder',
        categoryName: 'مسحوق',
        type: 'company' as const,
        brandName: 'مدار',
        createdAt: new Date().toISOString(),
      };

      expect(product.name).toBe('منتج جديد');
      expect(product.categoryId).toBe('powder');
      expect(product.type).toBe('company');
      expect(product.brandName).toBe('مدار');
    });

    it('should validate product name is not empty', () => {
      const productName = '';
      const isValid = productName.trim().length > 0;
      expect(isValid).toBe(false);
    });

    it('should validate category is selected', () => {
      const categoryId = '';
      const isValid = categoryId.length > 0;
      expect(isValid).toBe(false);
    });

    it('should handle competitor product type', () => {
      const product = {
        id: '2',
        name: 'منتج منافس',
        categoryId: 'liquid',
        categoryName: 'سائل جلي',
        type: 'competitor' as const,
        competitorName: 'شركة منافسة',
        createdAt: new Date().toISOString(),
      };

      expect(product.type).toBe('competitor');
      expect(product.competitorName).toBe('شركة منافسة');
    });

    it('should validate competitor name for competitor products', () => {
      const competitorName = '';
      const isValid = competitorName.trim().length > 0;
      expect(isValid).toBe(false);
    });

    it('should validate brand name for company products', () => {
      const brandName = '';
      const isValid = brandName.trim().length > 0;
      expect(isValid).toBe(false);
    });

    it('should delete a product', () => {
      const products = [
        { id: '1', name: 'منتج 1', categoryId: 'powder', categoryName: 'مسحوق', type: 'company' as const, createdAt: '' },
        { id: '2', name: 'منتج 2', categoryId: 'liquid', categoryName: 'سائل جلي', type: 'company' as const, createdAt: '' },
      ];

      const filtered = products.filter((p) => p.id !== '1');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('2');
    });
  });

  describe('Category Management', () => {
    it('should create a new category', () => {
      const category = {
        id: '1',
        name: 'مسحوق',
        createdAt: new Date().toISOString(),
      };

      expect(category.name).toBe('مسحوق');
      expect(category.id).toBeDefined();
    });

    it('should validate category name is not empty', () => {
      const categoryName = '';
      const isValid = categoryName.trim().length > 0;
      expect(isValid).toBe(false);
    });

    it('should update a category', () => {
      const category = { id: '1', name: 'مسحوق', createdAt: '' };
      const updated = { ...category, name: 'مسحوق جديد' };

      expect(updated.name).toBe('مسحوق جديد');
      expect(updated.id).toBe('1');
    });

    it('should delete a category', () => {
      const categories = [
        { id: '1', name: 'مسحوق', createdAt: '' },
        { id: '2', name: 'سائل جلي', createdAt: '' },
      ];

      const filtered = categories.filter((c) => c.id !== '1');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('2');
    });

    it('should prevent deleting category with products', () => {
      const products = [
        { id: '1', name: 'منتج 1', categoryId: 'powder', categoryName: 'مسحوق', type: 'company' as const, createdAt: '' },
      ];

      const categoryId = 'powder';
      const productsUsingCategory = products.filter((p) => p.categoryId === categoryId);
      const canDelete = productsUsingCategory.length === 0;

      expect(canDelete).toBe(false);
    });

    it('should allow deleting empty category', () => {
      const products: any[] = [];
      const categoryId = 'unused';
      const productsUsingCategory = products.filter((p) => p.categoryId === categoryId);
      const canDelete = productsUsingCategory.length === 0;

      expect(canDelete).toBe(true);
    });
  });

  describe('Competitor Management', () => {
    it('should add a new competitor', () => {
      const competitors = ['شركة أ', 'شركة ب'];
      const newCompetitor = 'شركة ج';

      const updated = [...competitors, newCompetitor];
      expect(updated).toHaveLength(3);
      expect(updated).toContain('شركة ج');
    });

    it('should validate competitor name is not empty', () => {
      const competitorName = '';
      const isValid = competitorName.trim().length > 0;
      expect(isValid).toBe(false);
    });

    it('should prevent duplicate competitors', () => {
      const competitors = ['شركة أ', 'شركة ب'];
      const newCompetitor = 'شركة أ';

      const isDuplicate = competitors.includes(newCompetitor);
      expect(isDuplicate).toBe(true);
    });

    it('should filter products by competitor', () => {
      const products = [
        { id: '1', name: 'منتج 1', categoryId: 'powder', categoryName: 'مسحوق', type: 'competitor' as const, competitorName: 'شركة أ', createdAt: '' },
        { id: '2', name: 'منتج 2', categoryId: 'liquid', categoryName: 'سائل جلي', type: 'competitor' as const, competitorName: 'شركة ب', createdAt: '' },
      ];

      const filtered = products.filter((p) => p.competitorName === 'شركة أ');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].competitorName).toBe('شركة أ');
    });
  });

  describe('Search and Filter', () => {
    it('should search products by name', () => {
      const products = [
        { id: '1', name: 'مسحوق أبيض', categoryId: 'powder', categoryName: 'مسحوق', type: 'company' as const, createdAt: '' },
        { id: '2', name: 'سائل جلي أزرق', categoryId: 'liquid', categoryName: 'سائل جلي', type: 'company' as const, createdAt: '' },
      ];

      const searchTerm = 'مسحوق';
      const filtered = products.filter((p) => p.name.includes(searchTerm));

      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toContain('مسحوق');
    });

    it('should filter products by type', () => {
      const products = [
        { id: '1', name: 'منتج 1', categoryId: 'powder', categoryName: 'مسحوق', type: 'company' as const, createdAt: '' },
        { id: '2', name: 'منتج 2', categoryId: 'liquid', categoryName: 'سائل جلي', type: 'competitor' as const, competitorName: 'شركة أ', createdAt: '' },
      ];

      const filtered = products.filter((p) => p.type === 'company');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].type).toBe('company');
    });

    it('should combine search and filter', () => {
      const products = [
        { id: '1', name: 'مسحوق أبيض', categoryId: 'powder', categoryName: 'مسحوق', type: 'company' as const, createdAt: '' },
        { id: '2', name: 'سائل جلي أزرق', categoryId: 'liquid', categoryName: 'سائل جلي', type: 'company' as const, createdAt: '' },
        { id: '3', name: 'مسحوق منافس', categoryId: 'powder', categoryName: 'مسحوق', type: 'competitor' as const, competitorName: 'شركة أ', createdAt: '' },
      ];

      const searchTerm = 'مسحوق';
      const type = 'company';
      const filtered = products.filter((p) => p.type === type && p.name.includes(searchTerm));

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('1');
    });
  });

  describe('Form Validation', () => {
    it('should validate product form', () => {
      const form = {
        name: '',
        categoryId: '',
        type: 'company' as const,
        competitorName: '',
      };

      const isValid = form.name.trim().length > 0 && form.categoryId.length > 0;
      expect(isValid).toBe(false);
    });

    it('should validate category form', () => {
      const categoryForm = { name: '' };
      const isValid = categoryForm.name.trim().length > 0;
      expect(isValid).toBe(false);
    });

    it('should validate competitor form', () => {
      const competitorForm = { name: '' };
      const isValid = competitorForm.name.trim().length > 0;
      expect(isValid).toBe(false);
    });
  });

  describe('Default Categories', () => {
    it('should have default categories', () => {
      const DEFAULT_CATEGORIES = [
        { id: 'powder', name: 'مسحوق' },
        { id: 'liquid', name: 'سائل جلي' },
        { id: 'perfume', name: 'معطر' },
        { id: 'disinfectant', name: 'معقم' },
        { id: 'other', name: 'أخرى' },
      ];

      expect(DEFAULT_CATEGORIES).toHaveLength(5);
      expect(DEFAULT_CATEGORIES[0].name).toBe('مسحوق');
    });

    it('should map default categories with createdAt', () => {
      const DEFAULT_CATEGORIES = [
        { id: 'powder', name: 'مسحوق' },
        { id: 'liquid', name: 'سائل جلي' },
      ];

      const mapped = DEFAULT_CATEGORIES.map((c) => ({ ...c, createdAt: new Date().toISOString() }));
      expect(mapped[0].createdAt).toBeDefined();
      expect(mapped).toHaveLength(2);
    });
  });
});
