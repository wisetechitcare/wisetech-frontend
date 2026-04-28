import { ChangeEvent, useEffect, useState } from "react";
import { fetchAllCities, fetchAllCountries, fetchAllStates, fetchCountryName, fetchStateName } from "@services/options";
import TextInput from "app/modules/common/inputs/TextInput";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { saveCountries } from "@redux/slices/locations";
import LocationDropdown from "@app/modules/common/inputs/LocationDropdown";
import { useParams } from "react-router-dom";
import { Option } from "@models/dropdown";

// const presentAddress = {
//     presentAddressLine1: "",
//     presentAddressLine2: "",
//     presentCountry: "",
//     presentState: "",
//     presentCity: "",
//     presentPostalCode: "",
// }

function AddressInfo({ formikProps }: any) {
    const dispatch = useDispatch();
    const { countries } = useSelector((state: RootState) => state.locations);

    const [countriesOption, setCountriesOptions] = useState([]);
    const [selectedPermanentCountry, setSelectedPermanentCountry] = useState<Option | null>(null);
    const [selectedPresentCountry, setSelectedPresentCountry] = useState<Option | null>(null);

    let countryCode = "";

    const [permanentStatesOption, setPermanentStatesOptions] = useState([]);
    const [selectedPermanentState, setSelectedPermanentState] = useState<Option | null>(null);

    const [permanentCitiesOption, setPermanentCitiesOptions] = useState([]);
    const [selectedPermanentCity, setSelectedPermanentCity] = useState<Option | null>(null);

    let stateCode = "";

    const [presentStatesOption, setPresentStatesOptions] = useState([]);
    const [selectedPresentState, setSelectedPresentState] = useState<Option | null>(null);

    const [presentCitiesOption, setPresentCitiesOptions] = useState([]);
    const [selectedPresentCity, setSelectedPresentCity] = useState<Option | null>(null);

    const { values: { addressInfo }, setFieldValue } = formikProps;
    const [isSameAddress, setIsSameAddress] = useState(false);

    const { employeeId } = useParams();

    useEffect(() => {
        const { permanentAddressLine1, presentAddressLine1, permanentAddressLine2, presentAddressLine2, 
                permanentPostalCode, presentPostalCode, permanentCountry, presentCountry, 
                permanentState, presentState, permanentCity, presentCity } = addressInfo;
        
        // Check if all address fields match for auto-checking checkbox in edit mode
        if (permanentAddressLine1?.length > 0 && 
            permanentAddressLine1 === presentAddressLine1 &&
            permanentAddressLine2 === presentAddressLine2 &&
            permanentPostalCode === presentPostalCode &&
            permanentCountry === presentCountry &&
            permanentState === presentState &&
            permanentCity === presentCity) {
            setIsSameAddress(true);
        }

        handleEdit();
    }, []);

    const handleEdit = async (): Promise<void> => {
        if ((employeeId !== undefined || employeeId !== null || employeeId !== "") &&
            (addressInfo.id !== undefined || addressInfo.id !== null || addressInfo.id !== "")) {

            const { permanentCountry, permanentState, permanentCity, presentCountry, presentState, presentCity } = addressInfo;

            try {
                const permanentCountryName = await fetchCountryName(permanentCountry);
                const permanentStateName = await fetchStateName(permanentCountry, permanentState);

                setSelectedPermanentCountry({ value: permanentCountry, label: permanentCountryName.name });
                setSelectedPermanentState({ value: permanentState, label: permanentStateName.name });
                setSelectedPermanentCity({ value: permanentCity, label: permanentCity });
            } catch (e) {
                console.log(e);
            }

            try {
                const presentCountryName = await fetchCountryName(presentCountry);
                const presentStateName = await fetchStateName(presentCountry, presentState);

                setSelectedPresentCountry({ value: presentCountry, label: presentCountryName.name });
                setSelectedPresentState({ value: presentState, label: presentStateName.name });
                setSelectedPresentCity({ value: presentCity, label: presentCity });
            } catch (e) {
                console.log(e);
            }

            return;
        }
    };

    const handleChange = (selectedOption: any, formikField: string, setSelectedOptionState: React.Dispatch<React.SetStateAction<any>>, setFieldValue: (field: string, value: any) => void) => {
        setFieldValue(formikField, selectedOption ? selectedOption.value : "");
        setSelectedOptionState(selectedOption);
    };

    const fetchCountries = async () => {
        if (countries != null) {
            setCountriesOptions(countries);
            // Set India as default after countries are loaded (only for new employees)
            setDefaultCountryIfNeeded(countries);
            return;
        }

        const countriesResponse = await fetchAllCountries();
        const countriesOptions = countriesResponse.map((country: any) => ({ value: country.iso2, label: country.name }));
        dispatch(saveCountries(countriesOptions));
        setCountriesOptions(countriesOptions);
        // Set India as default after countries are loaded (only for new employees)
        setDefaultCountryIfNeeded(countriesOptions);
    };

    const setDefaultCountryIfNeeded = (countriesOptions: any[]) => {
        // Only set default for new employees (not in edit mode) and if no country is already set
        if (!employeeId && !addressInfo.permanentCountry && !addressInfo.presentCountry) {
            const indiaOption = countriesOptions.find((country: any) => country.value === 'IN') || { value: "IN", label: "India" };
            setSelectedPermanentCountry(indiaOption);
            setSelectedPresentCountry(indiaOption);
            
            // Set formik values for both countries to India
            setFieldValue('addressInfo.permanentCountry', 'IN');
            setFieldValue('addressInfo.presentCountry', 'IN');
        }
    };

    useEffect(()=>{
        fetchCountries();
    },[])
    
    // ----------------- APIs call for permanent states and cities start ---------------
    const fetchPermanentStates = async () => {
        countryCode = selectedPermanentCountry!.value;

        const statesResponse = await fetchAllStates(countryCode);

        // In case if country doesnt have states then assigning selected country
        if (statesResponse.length > 0) {
            const statesOptions = statesResponse.map((state: any) => ({ value: state.iso2, label: state.name }));
            setPermanentStatesOptions(statesOptions);
        } else {
            setPermanentStatesOptions([selectedPermanentCountry] as unknown as []);
        }
    };

    const fetchPermanentCities = async () => {
        countryCode = selectedPermanentCountry!.value;
        stateCode = selectedPermanentState!.value;

        const citiesResponse = await fetchAllCities(countryCode, stateCode);

        // In case if states doesnt have cities then assigning selected states
        if (citiesResponse.length > 0) {
            const citiesOptions = citiesResponse.map((city: any) => ({ value: city.name, label: city.name }));
            setPermanentCitiesOptions(citiesOptions);
        } else {
            const citiesOptionAsState = [selectedPermanentState].map((state: any) => ({ value: state.label, label: state.label }));
            setPermanentCitiesOptions(citiesOptionAsState as []);
        }
    };
    // ----------------- APIs call for permanent states and cities end ---------------

    // ----------------- APIs call for present states and cities start ---------------
    const fetchPresentStates = async () => {
        countryCode = selectedPresentCountry!.value;

        const statesResponse = await fetchAllStates(countryCode);

        // In case if country doesnt have states then assigning selected country
        if (statesResponse.length > 0) {
            const statesOptions = statesResponse.map((state: any) => ({ value: state.iso2, label: state.name }));
            setPresentStatesOptions(statesOptions);
        } else {
            setPresentStatesOptions([selectedPresentCountry] as unknown as []);
        }
    };

    const fetchPresentCities = async () => {
        countryCode = selectedPresentCountry!.value;
        stateCode = selectedPresentState!.value;

        const citiesResponse = await fetchAllCities(countryCode, stateCode);

        // In case if states doesnt have cities then assigning selected states
        if (citiesResponse.length > 0) {
            const citiesOptions = citiesResponse.map((city: any) => ({ value: city.name, label: city.name }));
            setPresentCitiesOptions(citiesOptions);
        } else {
            const citiesOptionAsState = [selectedPresentState].map((state: any) => ({ value: state.label, label: state.label }));
            setPresentCitiesOptions(citiesOptionAsState as []);
        }
    };
    // ----------------- APIs call for present states and cities end ---------------

    const handleSameAsAbove = (e: ChangeEvent<HTMLInputElement>) => {
        const isChecked = e.target.checked;
        setIsSameAddress(isChecked);

        if (isChecked) {
            // Copy all CURRENT/PRESENT address fields to PERMANENT address
            const permanentAddress = {
                permanentAddressLine1: addressInfo.presentAddressLine1,
                permanentAddressLine2: addressInfo.presentAddressLine2,
                permanentCountry: addressInfo.presentCountry,
                permanentState: addressInfo.presentState,
                permanentCity: addressInfo.presentCity,
                permanentPostalCode: addressInfo.presentPostalCode,
            }
            setFieldValue('addressInfo', { ...addressInfo, ...permanentAddress }, true);

            // Copy dropdown selections for permanent address
            setSelectedPermanentCountry(selectedPresentCountry);
            setSelectedPermanentState(selectedPresentState);
            setSelectedPermanentCity(selectedPresentCity);

            // Copy dropdown options for permanent address
            setPermanentStatesOptions(presentStatesOption);
            setPermanentCitiesOptions(presentCitiesOption);
        }
        else {
            // Clear permanent address fields when unchecked
            const clearedPermanentAddress = {
                permanentAddressLine1: "",
                permanentAddressLine2: "",
                permanentCountry: "",
                permanentState: "",
                permanentCity: "",
                permanentPostalCode: "",
            }
            setFieldValue('addressInfo', { ...addressInfo, ...clearedPermanentAddress }, true);

            // Clear permanent address dropdown selections
            setSelectedPermanentCountry(null);
            setSelectedPermanentState(null);
            setSelectedPermanentCity(null);

            // Clear permanent address dropdown options
            setPermanentStatesOptions([]);
            setPermanentCitiesOptions([]);
        }
    }

    return (
        <div className="d-flex flex-column gap-4">
  {/* Current Address Section */}
  <div className="d-flex flex-column gap-3">
    {/* Header */}
    <p
      style={{
        fontFamily: "Inter",
        fontWeight: 500,
        fontSize: "14px",
        color: "#798DB3",
        textTransform: "uppercase",
        margin: 0,
      }}
    >
      Current Address
    </p>

    {/* Row 1: Address Line 1, Address Line 2 */}
    <div className="row g-3">
      <div className="col-lg-6 col-md-6 col-sm-12">
        <TextInput
          isRequired={false}
          label="Address Line 1"
          margin="mb-0"
          formikField="addressInfo.presentAddressLine1"
        />
      </div>

      <div className="col-lg-6 col-md-6 col-sm-12">
        <TextInput
          isRequired={false}
          label="Address Line 2"
          margin="mb-0"
          formikField="addressInfo.presentAddressLine2"
        />
      </div>
    </div>

    {/* Row 2: Country, State, City, Postal Code */}
    <div className="row g-3">
      <div
        className="col-lg-3 col-md-6 col-sm-12"
        onClick={fetchCountries}
      >
        <LocationDropdown
          isRequired={false}
          value={selectedPresentCountry}
          handleChange={(option: any) => {
            handleChange(
              option,
              "addressInfo.presentCountry",
              setSelectedPresentCountry,
              formikProps.setFieldValue
            );

            setSelectedPresentState(null);
            formikProps.setFieldValue("addressInfo.presentState", "");

            setSelectedPresentCity(null);
            formikProps.setFieldValue("addressInfo.presentCity", "");

            setPresentStatesOptions([]);
            setPresentCitiesOptions([]);
          }}
          formikField="addressInfo.presentCountry"
          inputLabel="Country"
          options={countriesOption}
        />
      </div>

      <div
        className="col-lg-3 col-md-6 col-sm-12"
        onClick={fetchPresentStates}
      >
        <LocationDropdown
          isDisabled={selectedPresentCountry == null}
          value={selectedPresentState}
          isRequired={false}
          handleChange={(option: any) => {
            handleChange(
              option,
              "addressInfo.presentState",
              setSelectedPresentState,
              formikProps.setFieldValue
            );

            setSelectedPresentCity(null);
            formikProps.setFieldValue("addressInfo.presentCity", "");
            setPresentCitiesOptions([]);
          }}
          formikField="addressInfo.presentState"
          inputLabel="State"
          options={presentStatesOption}
        />
      </div>

      <div
        className="col-lg-3 col-md-6 col-sm-12"
        onClick={fetchPresentCities}
      >
        <LocationDropdown
          isDisabled={selectedPresentState == null}
          isRequired={false}
          value={selectedPresentCity}
          handleChange={(option: any) => {
            handleChange(
              option,
              "addressInfo.presentCity",
              setSelectedPresentCity,
              formikProps.setFieldValue
            );
          }}
          formikField="addressInfo.presentCity"
          inputLabel="City"
          options={presentCitiesOption}
        />
      </div>

      <div className="col-lg-3 col-md-6 col-sm-12">
        <TextInput
          isRequired={false}
          label="Postal Code"
          margin="mb-0"
          formikField="addressInfo.presentPostalCode"
        />
      </div>
    </div>
  </div>

  {/* Permanent Address Section */}
  <div className="d-flex flex-column gap-3">
    {/* Header */}
    <p
      style={{
        fontFamily: "Inter",
        fontWeight: 500,
        fontSize: "14px",
        color: "#798DB3",
        textTransform: "uppercase",
        margin: 0,
      }}
    >
      Permanent Address
    </p>

    {/* Checkbox - Same as current address */}
    <div className="d-flex align-items-center gap-2 mb-2">
      <label
        className="form-check form-check-sm form-check-custom form-check-solid m-0"
      >
        <input
          className="form-check-input"
          type="checkbox"
          value="checked"
          checked={isSameAddress}
          onChange={handleSameAsAbove}
        />
        <span className="form-check-label">Same as current address</span>
      </label>
    </div>

    {/* Row 1: Address Line 1, Address Line 2 */}
    <div className="row g-3">
      <div className="col-lg-6 col-md-6 col-sm-12">
        <TextInput
          isRequired={false}
          label="Address Line 1"
          margin="mb-0"
          formikField="addressInfo.permanentAddressLine1"
        />
      </div>

      <div className="col-lg-6 col-md-6 col-sm-12">
        <TextInput
          isRequired={false}
          label="Address Line 2"
          margin="mb-0"
          formikField="addressInfo.permanentAddressLine2"
        />
      </div>
    </div>

    {/* Row 2: Country, State, City, Postal Code */}
    <div className="row g-3">
      <div
        className="col-lg-3 col-md-6 col-sm-12"
        onClick={fetchCountries}
      >
        <LocationDropdown
          isRequired={false}
          value={selectedPermanentCountry}
          handleChange={(option: any) => {
            handleChange(
              option,
              "addressInfo.permanentCountry",
              setSelectedPermanentCountry,
              formikProps.setFieldValue
            );

            setSelectedPermanentState(null);
            formikProps.setFieldValue("addressInfo.permanentState", "");
            setSelectedPermanentCity(null);
            formikProps.setFieldValue("addressInfo.permanentCity", "");
            setPermanentStatesOptions([]);
            setPermanentCitiesOptions([]);
          }}
          formikField="addressInfo.permanentCountry"
          inputLabel="Country"
          options={countriesOption}
        />
      </div>

      <div
        className="col-lg-3 col-md-6 col-sm-12"
        onClick={fetchPermanentStates}
      >
        <LocationDropdown
          isDisabled={selectedPermanentCountry == null}
          value={selectedPermanentState}
          isRequired={false}
          handleChange={(option: any) => {
            handleChange(
              option,
              "addressInfo.permanentState",
              setSelectedPermanentState,
              formikProps.setFieldValue
            );

            setSelectedPermanentCity(null);
            formikProps.setFieldValue("addressInfo.permanentCity", "");
            setPermanentCitiesOptions([]);
          }}
          formikField="addressInfo.permanentState"
          inputLabel="State"
          options={permanentStatesOption}
        />
      </div>

      <div
        className="col-lg-3 col-md-6 col-sm-12"
        onClick={fetchPermanentCities}
      >
        <LocationDropdown
          isDisabled={selectedPermanentState == null}
          isRequired={false}
          value={selectedPermanentCity}
          handleChange={(option: any) => {
            handleChange(
              option,
              "addressInfo.permanentCity",
              setSelectedPermanentCity,
              formikProps.setFieldValue
            );
          }}
          formikField="addressInfo.permanentCity"
          inputLabel="City"
          options={permanentCitiesOption}
        />
      </div>

      <div className="col-lg-3 col-md-6 col-sm-12">
        <TextInput
          isRequired={false}
          label="Postal Code"
          margin="mb-0"
          formikField="addressInfo.permanentPostalCode"
        />
      </div>
    </div>
  </div>
</div>

    );
}

export default AddressInfo;

