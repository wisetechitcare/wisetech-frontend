import { PageTitle } from '@metronic/layout/core'
import React, { useEffect } from 'react'
import MyTimeSheetPage from './component/MyTimeSheetPage';
import { loadAllEmployeesIfNeeded } from '@redux/slices/allEmployees';
import { initializeChartSettings } from '@redux/slices/leadProjectCompanies';
import { AppDispatch } from '@redux/store';
import { useDispatch } from 'react-redux';

const MyTimeSheetMain = () => {

  
  const dispatch = useDispatch<AppDispatch>();

 
  useEffect(() => {
    dispatch(loadAllEmployeesIfNeeded());
    dispatch(initializeChartSettings());
  }, [dispatch]);


  const TaskBreadcrumbs = [
    {
      title: 'Home',
      path: '/tasks/timesheet',
      isSeparator: false,
      isActive: false,
    },
    {
      title: '',
      path: '',
      isSeparator: true,
      isActive: false,
    },
  ];
  return (
    <div>
      <PageTitle breadcrumbs={TaskBreadcrumbs}>
             My TimeSheet
      </PageTitle>

      <MyTimeSheetPage />

    </div>
  )
}

export default MyTimeSheetMain