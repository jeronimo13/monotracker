import { parseNaturalDateRange, formatDateRangeForDisplay, getDateRangePresets } from '../dateRangeParser';

describe('parseNaturalDateRange', () => {
  describe('Basic patterns (1d, 2w, 3m, 1y)', () => {
    test('parses "1d" correctly', () => {
      const result = parseNaturalDateRange('1d');
      expect(result).toBeTruthy();
      expect(result?.display).toBe('Останній день');
      
      // Should be from start of today to end of today  
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
      const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
      
      expect(result?.start).toBe(Math.floor(startOfToday.getTime() / 1000));
      expect(result?.end).toBe(Math.floor(endOfToday.getTime() / 1000));
    });

    test('parses "3d" correctly', () => {
      const result = parseNaturalDateRange('3d');
      expect(result).toBeTruthy();
      expect(result?.display).toBe('Останні 3 дні');
      
      // Should be 3 complete days ending today
      const today = new Date();
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(today.getDate() - 2); // -2 because we include today
      
      const startOfRange = new Date(threeDaysAgo.getFullYear(), threeDaysAgo.getMonth(), threeDaysAgo.getDate(), 0, 0, 0);
      const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
      
      expect(result?.start).toBe(Math.floor(startOfRange.getTime() / 1000));
      expect(result?.end).toBe(Math.floor(endOfToday.getTime() / 1000));
    });

    test('parses "1w" correctly', () => {
      const result = parseNaturalDateRange('1w');
      expect(result).toBeTruthy();
      expect(result?.display).toBe('Останній тиждень');
      
      // Should be 7 complete days ending today
      const today = new Date();
      const oneWeekAgo = new Date(today);
      oneWeekAgo.setDate(today.getDate() - 6); // -6 because we include today
      
      const startOfRange = new Date(oneWeekAgo.getFullYear(), oneWeekAgo.getMonth(), oneWeekAgo.getDate(), 0, 0, 0);
      const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
      
      expect(result?.start).toBe(Math.floor(startOfRange.getTime() / 1000));
      expect(result?.end).toBe(Math.floor(endOfToday.getTime() / 1000));
    });

    test('parses "2w" correctly', () => {
      const result = parseNaturalDateRange('2w');
      expect(result).toBeTruthy();
      expect(result?.display).toBe('Останні 2 тижні');
    });

    test('parses "1m" correctly', () => {
      const result = parseNaturalDateRange('1m');
      expect(result).toBeTruthy();
      expect(result?.display).toBe('Останній місяць');
    });

    test('parses "3m" correctly', () => {
      const result = parseNaturalDateRange('3m');
      expect(result).toBeTruthy();
      expect(result?.display).toBe('Останні 3 місяці');
    });

    test('parses "1y" correctly', () => {
      const result = parseNaturalDateRange('1y');
      expect(result).toBeTruthy();
      expect(result?.display).toBe('Останній рік');
    });
  });

  describe('Natural language patterns', () => {
    test('parses "last 3 days" correctly', () => {
      const result = parseNaturalDateRange('last 3 days');
      expect(result).toBeTruthy();
      expect(result?.display).toBe('Останні 3 дні');
    });

    test('parses "past 2 weeks" correctly', () => {
      const result = parseNaturalDateRange('past 2 weeks');
      expect(result).toBeTruthy();
      expect(result?.display).toBe('Останні 2 тижні');
    });

    test('parses "last 1 month" correctly', () => {
      const result = parseNaturalDateRange('last 1 month');
      expect(result).toBeTruthy();
      expect(result?.display).toBe('Останній місяць');
    });

    test('parses "last 1 year" correctly', () => {
      const result = parseNaturalDateRange('last 1 year');
      expect(result).toBeTruthy();
      expect(result?.display).toBe('Останній рік');
    });
  });

  describe('Date range patterns', () => {
    test('parses "2024-01-01 to 2024-01-31" correctly', () => {
      const result = parseNaturalDateRange('2024-01-01 to 2024-01-31');
      expect(result).toBeTruthy();
      expect(result?.display).toBe('2024-01-01 до 2024-01-31');
      
      const expectedStart = Math.floor(new Date('2024-01-01').getTime() / 1000);
      const expectedEnd = Math.floor(new Date('2024-01-31T23:59:59').getTime() / 1000);
      
      expect(result?.start).toBe(expectedStart);
      expect(result?.end).toBe(expectedEnd);
    });

    test('parses "2024-01-01..2024-01-31" correctly', () => {
      const result = parseNaturalDateRange('2024-01-01..2024-01-31');
      expect(result).toBeTruthy();
      expect(result?.display).toBe('2024-01-01 до 2024-01-31');
    });

    test('parses single date "2024-01-01" correctly', () => {
      const result = parseNaturalDateRange('2024-01-01');
      expect(result).toBeTruthy();
      expect(result?.display).toBe('2024-01-01');
      
      const expectedStart = Math.floor(new Date('2024-01-01').getTime() / 1000);
      const expectedEnd = Math.floor(new Date('2024-01-01T23:59:59').getTime() / 1000);
      
      expect(result?.start).toBe(expectedStart);
      expect(result?.end).toBe(expectedEnd);
    });
  });

  describe('Special cases', () => {
    test('returns null for "all time"', () => {
      const result = parseNaturalDateRange('all time');
      expect(result).toBeNull();
    });

    test('returns null for "all"', () => {
      const result = parseNaturalDateRange('all');
      expect(result).toBeNull();
    });

    test('returns null for empty string', () => {
      const result = parseNaturalDateRange('');
      expect(result).toBeNull();
    });

    test('returns null for invalid input', () => {
      const result = parseNaturalDateRange('invalid input');
      expect(result).toBeNull();
    });

    test('handles case insensitive input', () => {
      const result = parseNaturalDateRange('LAST 3 DAYS');
      expect(result).toBeTruthy();
      expect(result?.display).toBe('Останні 3 дні');
    });
  });
});

describe('formatDateRangeForDisplay', () => {
  test('formats "last day" pattern correctly', () => {
    const now = Math.floor(Date.now() / 1000);
    const dayInSeconds = 24 * 60 * 60;
    const start = now - dayInSeconds;
    const end = now;
    const result = formatDateRangeForDisplay(start, end);
    expect(result).toBe('Останній день');
  });

  test('formats "last week" pattern correctly', () => {
    const now = Math.floor(Date.now() / 1000);
    const dayInSeconds = 24 * 60 * 60;
    const start = now - (7 * dayInSeconds);
    const end = now;
    const result = formatDateRangeForDisplay(start, end);
    expect(result).toBe('Останній тиждень');
  });

  test('formats date range when not a "last X" pattern', () => {
    const start = Math.floor(new Date('2024-01-01').getTime() / 1000);
    const end = Math.floor(new Date('2024-01-31T23:59:59').getTime() / 1000);
    const result = formatDateRangeForDisplay(start, end);
    expect(result).toBe('2024-01-01 до 2024-01-31');
  });

  test('formats same day correctly', () => {
    const start = Math.floor(new Date('2024-01-01').getTime() / 1000);
    const end = Math.floor(new Date('2024-01-01T23:59:59').getTime() / 1000);
    const result = formatDateRangeForDisplay(start, end);
    expect(result).toBe('2024-01-01');
  });
});

describe('getDateRangePresets', () => {
  test('returns expected presets', () => {
    const presets = getDateRangePresets();
    expect(presets).toBeDefined();
    expect(Array.isArray(presets)).toBe(true);
    expect(presets.length).toBeGreaterThan(0);

    // Check a few expected presets
    const oneDay = presets.find(p => p.label === 'Останній день');
    expect(oneDay).toBeTruthy();
    expect(oneDay?.value).toBe('1d');
    expect(oneDay?.shorthand).toBe('1D');

    const oneWeek = presets.find(p => p.label === 'Останній тиждень');
    expect(oneWeek).toBeTruthy();
    expect(oneWeek?.value).toBe('1w');
    expect(oneWeek?.shorthand).toBe('1W');
  });
});

describe('Integration tests - preset values should parse correctly', () => {
  test('all preset values should parse without errors', () => {
    const presets = getDateRangePresets();
    
    presets.forEach(preset => {
      const result = parseNaturalDateRange(preset.value);
      expect(result).toBeTruthy();
      expect(result?.start).toBeDefined();
      expect(result?.end).toBeDefined();
      expect(result?.display).toBeDefined();
      expect(result?.start).toBeLessThan(result.end);
    });
  });

  test('preset parsing matches expected patterns', () => {
    const testCases = [
      { value: '1d', expectedDisplay: 'Останній день' },
      { value: '3d', expectedDisplay: 'Останні 3 дні' },
      { value: '1w', expectedDisplay: 'Останній тиждень' },
      { value: '2w', expectedDisplay: 'Останні 2 тижні' },
      { value: '1m', expectedDisplay: 'Останній місяць' },
      { value: '3m', expectedDisplay: 'Останні 3 місяці' },
      { value: '6m', expectedDisplay: 'Останні 6 місяців' },
      { value: '1y', expectedDisplay: 'Останній рік' },
    ];

    testCases.forEach(({ value, expectedDisplay }) => {
      const result = parseNaturalDateRange(value);
      expect(result).toBeTruthy();
      expect(result?.display).toBe(expectedDisplay);
    });
  });
});
