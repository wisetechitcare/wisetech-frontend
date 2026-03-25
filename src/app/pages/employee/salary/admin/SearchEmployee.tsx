import AllEmployeesSearchDropdown from '@app/modules/common/components/AllEmployeesSearchDropdown';
import SalaryView from '../personal/SalaryView';

function SearchEmployee() {
  return (
    <>
      <AllEmployeesSearchDropdown />
      <div className='mt-8'></div>
      <SalaryView fromAdmin={true} />
    </>
  );
}

export default SearchEmployee;