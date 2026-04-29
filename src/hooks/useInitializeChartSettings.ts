// hooks/useInitializeChartSettings.ts
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@redux/store';
import { initializeChartSettings } from '@redux/slices/leadProjectCompanies';

export const useInitializeChartSettings = () => {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    dispatch(initializeChartSettings());
  }, [dispatch]);
};