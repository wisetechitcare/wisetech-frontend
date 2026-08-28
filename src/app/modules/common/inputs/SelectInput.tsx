import { WtSelect } from '@app/modules/common/components/ui/WtSelect';
import { isEmpty } from 'lodash';
import { useDispatch } from 'react-redux';
import { saveCurrentBranchInfo, saveCurrentCompanyInfo } from '@redux/slices/company';
import { useMemo } from 'react';
import { sortOptionsAlphabetically } from '@utils/sortUtils';


interface SelectInputProps {
    options: any;
    placeholder: string;
    dropdown?: string;
    value: any;
    passData?: (data: any) => any;
}

function SelectInput({ options, placeholder, dropdown, value, passData }: SelectInputProps) {
    const dispatch = useDispatch();

    const sortedOptions = useMemo(() => {
        return sortOptionsAlphabetically(options || []);
    }, [options]);


    return (
        <WtSelect
            placeholder={placeholder}
            options={sortedOptions}
            {...(!isEmpty(value) ? { value } : {})}
            onChange={(option: any) => {
                if (dropdown === "company") {
                    const payload = { id: option.value, name: option.label };
                    dispatch(saveCurrentCompanyInfo(payload));
                    localStorage.setItem("selectedCompany", JSON.stringify(payload));
                }
                if (dropdown === "branch") {
                    const payload = { id: option.value, name: option.label };
                    dispatch(saveCurrentBranchInfo(payload));
                    localStorage.setItem("selectedBranch", JSON.stringify(payload));
                }
                if (dropdown === "employee names") {
                    if (passData) passData(option.value);
                }
                if (dropdown === "export_select") {
                    if (passData) passData(option.value);
                }
                if (dropdown && dropdown.startsWith("search_column_select")) {
                    if (passData) passData(option.value);
                }
                // Default: any other (or no) `dropdown` key just reports the value.
                // Without this the component was only usable by the handful of
                // call sites named above — every new consumer had to add its own
                // branch here, which is why features kept hand-rolling their own
                // dropdown instead. Existing keys are matched first, so their
                // behaviour is unchanged.
                if (
                    passData &&
                    dropdown !== "employee names" &&
                    dropdown !== "export_select" &&
                    !(dropdown && dropdown.startsWith("search_column_select"))
                ) {
                    passData(option.value);
                }
            }}
        />
    );
}

export default SelectInput;