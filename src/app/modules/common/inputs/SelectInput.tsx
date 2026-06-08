import Select from 'react-select';
import { isEmpty } from 'lodash';
import { useThemeMode } from "@metronic/partials";
import { useDispatch } from 'react-redux';
import { saveCurrentBranchInfo, saveCurrentCompanyInfo } from '@redux/slices/company';

const colors = {
    white: '#fff',
    black: '#000',
    primary: '#17c653',
    secondary: '#04B440',
    lightGreyShade1: '#ccc',
    lightGreyShade2: '#e0e0e0',
    darkGreyShade1: '#555',
    darkGreyShade2: '#aaa',
    darkGreyShade3: '#2c2c2c',
    darkGreyShade4: '#666',
    darkGreyShade5: '#777'
}

interface SelectInputProps {
    options: any;
    placeholder: string;
    dropdown?: string;
    value: any;
    passData?: (data: any) => any;
}

function SelectInput({ options, placeholder, dropdown, value, passData }: SelectInputProps) {
    const { mode } = useThemeMode();
    const isDarkMode = mode === 'dark';
    const { white, black, darkGreyShade1, darkGreyShade2, darkGreyShade3, darkGreyShade4, darkGreyShade5, lightGreyShade1, lightGreyShade2,
        primary, secondary
    } = colors;
    const dispatch = useDispatch();

    const customStyles = {
        control: (provided: any, state: any) => ({
            ...provided,
            backgroundColor: isDarkMode ? darkGreyShade3 : white,
            borderColor: 'red', // 🔴 Change here
            boxShadow: state.isFocused ? `0 0 0 1px red` : 'none',
            '&:hover': {
                borderColor: 'red', // 🔴 Change here
            },
        }),
        menu: (provided: any) => ({
            ...provided,
            backgroundColor: isDarkMode ? darkGreyShade3 : white,
            zIndex: 9999,
        }),
        menuPortal: (provided: any) => ({
            ...provided,
            zIndex: 9999,
        }),
        singleValue: (provided: any) => ({
            ...provided,
            color: isDarkMode ? white : black,
        }),
        placeholder: (provided: any) => ({
            ...provided,
            color: isDarkMode ? darkGreyShade2 : darkGreyShade4,
        }),
        option: (provided: any, state: any) => ({
            ...provided,
            color: state.isSelected ? white : (isDarkMode ? white : black),
            '&:hover': {
                backgroundColor: isDarkMode ? secondary : lightGreyShade2,
                color: isDarkMode ? white : black,
            },
        }),
    };

    return (
        <Select
            classNamePrefix={"react-select"}
            className='react-select-styled'
            placeholder={placeholder}
            options={options}
            styles={customStyles}
            menuPortalTarget={document.body}
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
            }} />
    );
}

export default SelectInput;