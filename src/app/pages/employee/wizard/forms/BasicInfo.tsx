import { useEffect, useState } from "react";
import DropDownInput from "@app/modules/common/inputs/DropdownInput";
import DateInput from "app/modules/common/inputs/DateInput";
import FileInput from "app/modules/common/inputs/FileInput";
import RadioInput, { RadioButton } from "app/modules/common/inputs/RadioInput";
import TextInput from "app/modules/common/inputs/TextInput";
import { fetchAllEmployees } from "@services/employee";

const genderRadioBtn: RadioButton[] = [
  { label: "Male", value: "0" },
  { label: "Female", value: "1" },
];

const maritalStatusRadioBtn: RadioButton[] = [
  { label: "Married", value: "0" },
  { label: "Unmarried", value: "1" },
];

const bloodGroupOptions = [
  { value: "A_POS", label: "A+" },
  { value: "A_NEG", label: "A-" },
  { value: "B_POS", label: "B+" },
  { value: "B_NEG", label: "B-" },
  { value: "AB_POS", label: "AB+" },
  { value: "AB_NEG", label: "AB-" },
  { value: "O_POS", label: "O+" },
  { value: "O_NEG", label: "O-" },
];

function BasicInfo({ formikProps }: any) {
  const [managersOptions, setManagersOptions] = useState([]);
  const [totalEmployees, setTotalEmployees] = useState<number>();

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await fetchAllEmployees();
      setTotalEmployees(data.employees.length);

      const options = data.employees.map((employee: any) => ({
        value: employee.id,
        label: `${employee.users.firstName} ${employee.users.lastName}`,
      }));

      setManagersOptions(options);
    };

    fetchData();
  }, []);

  const isTrue = !!totalEmployees && totalEmployees > 0;

  return (
    <>
      {/* Row 1: First Name, Last Name */}
      <div className="row mb-4">
        <div className="col-lg-6 col-md-6 col-sm-12 mb-3 mb-lg-0">
          <TextInput
            isRequired
            label="First Name"
            margin="mb-0"
            formikField="firstName"
          />
        </div>
        <div className="col-lg-6 col-md-6 col-sm-12">
          <TextInput
            isRequired
            label="Last Name"
            margin="mb-0"
            formikField="lastName"
          />
        </div>
      </div>

      {/* Row 2: Nickname, DOB */}
      <div className="row mb-4">
        <div className="col-lg-6 col-md-6 col-sm-12 mb-3 mb-lg-0">
          <TextInput
            isRequired={false}
            label="Nickname"
            margin="mb-0"
            formikField="nickName"
          />
        </div>
        <div className="col-lg-6 col-md-6 col-sm-12">
          <DateInput
            formikField="dateOfBirth"
            isRequired
            formikProps={formikProps}
            inputLabel="Date Of Birth"
            placeHolder="Date Of Birth"
            maxDate
          />
        </div>
      </div>

 

      {/* Row 4: Gender, Marital Status (side by side radios) */}
      <div className="row">
        <div className="col-lg-6 col-md-6 col-sm-12 mb-3 mb-lg-0">
          <RadioInput
            inputLabel="Gender"
            isRequired
            radioBtns={genderRadioBtn}
            formikField="gender"
          />
        </div>
        <div className="col-lg-6 col-md-6 col-sm-12">
          <RadioInput
            inputLabel="Marital Status"
            isRequired={false}
            radioBtns={maritalStatusRadioBtn}
            formikField="maritalStatus"
          />
        </div>
      </div>
           {/* Row 3: Anniversary, Blood Group */}
      <div className="row">
        <div className="col-lg-6 col-md-6 col-sm-12">
          <DateInput
            formikField="anniversary"
            isRequired={false}
            formikProps={formikProps}
            inputLabel="Anniversary Date"
            placeHolder="Anniversary Date"
          />
        </div>
        {/* <div className="col-lg-6">
          <DropDownInput
            isRequired={false}
            formikField="bloodGroup"
            inputLabel="Blood Group"
            options={bloodGroupOptions}
          />
        </div> */}
      </div>

      {/* Row 5: Reporting To (commented out as requested) */}
      {/*
      {isTrue && (
        <div className="row mb-4">
          <div className="col-lg-6">
            <DropDownInput
              isRequired
              formikField="reportsToId"
              inputLabel="Reporting To"
              options={managersOptions}
            />
          </div>
        </div>
      )}
      */}
    </>
  );
}

export default BasicInfo;
