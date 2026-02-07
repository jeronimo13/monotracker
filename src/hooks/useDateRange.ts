import { useContext } from 'react';
import { DateRangeContext } from '../contexts/DateRangeContext';

export const useDateRange = () => {
  const context = useContext(DateRangeContext);
  if (context === undefined) {
    throw new Error('useDateRange must be used within a DateRangeProvider');
  }
  return context;
};