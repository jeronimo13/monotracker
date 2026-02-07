// Quick test for date range parsing functionality
import { parseNaturalDateRange, getDateRangePresets } from './src/utils/dateRangeParser.ts';

console.log('Testing date range parser...');

// Test the presets that were reported as broken
const testCases = [
  '1w', '2w', '1m', '3m', '6m', '1y',
  'Last 1 week', 'Last 2 weeks', 
  'Last 1 month', 'Last 3 months'
];

testCases.forEach(input => {
  const result = parseNaturalDateRange(input);
  console.log(`${input}: ${result ? result.display : 'FAILED'}`);
});

console.log('\nPresets:');
const presets = getDateRangePresets();
presets.forEach(preset => {
  const result = parseNaturalDateRange(preset.value);
  console.log(`${preset.label} (${preset.value}): ${result ? result.display : 'FAILED'}`);
});