import AllEmployeesSearchDropdown from '@app/modules/common/components/AllEmployeesSearchDropdown';
import IncrementView from '../personal/IncrementView';

function SearchIncrementEmployee() {
  return (
    <>
      <AllEmployeesSearchDropdown />
      <div className='mt-8'></div>
      <IncrementView fromAdmin={true} />
    </>
  );
}

export default SearchIncrementEmployee;
