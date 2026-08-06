import { ChangeEvent, useEffect, useState } from "react";
import { fetchAllCities, fetchAllCountries, fetchAllStates, fetchCountryName, fetchStateName } from "@services/options";
import TextInput from "@app/modules/common/inputs/TextInput";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { saveCountries } from "@redux/slices/locations";
import LocationDropdown from "@app/modules/common/inputs/LocationDropdown";
import { useParams } from "react-router-dom";
import { Option } from "@models/dropdown";
import SmartLocationPicker, { GeoPick } from "@app/modules/common/components/SmartLocationPicker";

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

    /**
     * Where each block's pin sits. SmartLocationPicker is fully controlled — it derives
     * the marker from its lat/lng props and keeps no state of its own, so without these
     * `position` stays null and no pin is ever drawn, however many times you click.
     *
     * Local state rather than Formik: employee_address_details has nowhere to persist
     * coordinates, and these exist only so the map can show where you clicked.
     */
    const [presentPin, setPresentPin] = useState<{ lat: number; lng: number } | null>(null);
    const [permanentPin, setPermanentPin] = useState<{ lat: number; lng: number } | null>(null);

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

    /**
     * Fill one address block from a map pin.
     *
     * Resolves the country → state → city chain DIRECTLY through the location APIs
     * rather than setting the country and waiting for this component's effect cascade
     * to fetch the levels below. The cascade is keyed on the `selected*` state, so
     * driving it from here would mean writing a name, waiting a render for options to
     * land, then matching — the pending-ref dance the Lead form has to do. Resolving
     * inline keeps a pick to one deterministic pass.
     *
     * The pick is authoritative for whatever it can resolve and silent about the rest:
     * an unmatched country leaves the dropdowns untouched, so a pin in a place the
     * master list does not carry still fills the pincode and street rather than
     * blanking what the user already typed.
     *
     * Geo gives NAMES; these fields store ISO2 codes for country/state and a plain
     * name for city — hence the match-by-label lookups.
     */
    const applyGeoPick = async (which: "present" | "permanent", geo: GeoPick) => {
        const isPresent = which === "present";
        const setSelCountry = isPresent ? setSelectedPresentCountry : setSelectedPermanentCountry;
        const setSelState = isPresent ? setSelectedPresentState : setSelectedPermanentState;
        const setSelCity = isPresent ? setSelectedPresentCity : setSelectedPermanentCity;
        const setStateOpts = isPresent ? setPresentStatesOptions : setPermanentStatesOptions;
        const setCityOpts = isPresent ? setPresentCitiesOptions : setPermanentCitiesOptions;

        const eq = (a?: string, b?: string) =>
            !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

        // Move the pin first: it must land where the user clicked even if the address
        // behind it resolves to nothing we can map onto the dropdowns.
        if (Number.isFinite(geo.lat) && Number.isFinite(geo.lng)) {
            (isPresent ? setPresentPin : setPermanentPin)({ lat: geo.lat, lng: geo.lng });
        }

        if (geo.postcode) setFieldValue(`addressInfo.${which}PostalCode`, geo.postcode);

        // Street line only. `formatted` is Nominatim's display_name, which trails the
        // city, district, state, pincode and country — every one of which has its own
        // field below, so writing it here duplicated half the section. Falls back to
        // the full string when OSM has no street detail for the point.
        const line1 = geo.street || geo.formatted;
        if (line1) setFieldValue(`addressInfo.${which}AddressLine1`, line1);

        const country = (countriesOption as Option[]).find((c) => eq(c.label, geo.country));
        if (!country) return;
        setFieldValue(`addressInfo.${which}Country`, country.value);
        setSelCountry(country);

        try {
            const statesResponse = await fetchAllStates(country.value);
            const stateOpts: Option[] = (statesResponse || []).map((s: any) => ({
                value: s.iso2,
                label: s.name,
            }));
            setStateOpts(stateOpts as []);

            const state = stateOpts.find((s) => eq(s.label, geo.state));
            if (!state) return;
            setFieldValue(`addressInfo.${which}State`, state.value);
            setSelState(state);

            const citiesResponse = await fetchAllCities(country.value, state.value);
            const cityOpts: Option[] = (citiesResponse || []).map((c: any) => ({
                value: c.name,
                label: c.name,
            }));
            setCityOpts(cityOpts as []);

            // Nominatim's "city" can be the town/village/suburb, so fall back to the
            // locality before giving up on the city dropdown.
            const city =
                cityOpts.find((c) => eq(c.label, geo.city)) ||
                cityOpts.find((c) => eq(c.label, geo.locality));
            if (!city) return;
            setFieldValue(`addressInfo.${which}City`, city.value);
            setSelCity(city);
        } catch (error) {
            // A failed lookup must not lose the pincode/street already written above.
            console.error("Could not resolve state/city for the picked location", error);
        }
    };

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
        color: "var(--ob-text-2, #2D3748)",
        textTransform: "uppercase",
        margin: 0,
      }}
    >
      Current Address
    </p>

    {/* Same picker the Lead form uses. It renders its own search box + map and hands
        back a resolved address; the fields below stay editable as the manual override. */}
    <SmartLocationPicker
      lat={presentPin?.lat}
      lng={presentPin?.lng}
      onPick={(geo) => applyGeoPick("present", geo)}
    />

    {/* Row 1: Address */}
    <div className="row g-3">
      <div className="col-12">
        <TextInput
          isRequired={true}
          label="Address"
          margin="mb-0"
          maxLength={150}
          formikField="addressInfo.presentAddressLine1"
        />
      </div>
    </div>

    {/* Row 2: Country, State, City */}
    <div className="row g-3">
      <div
        className="col-lg-4 col-md-6 col-sm-12"
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
        className="col-lg-4 col-md-6 col-sm-12"
        onClick={fetchPresentStates}
      >
        <LocationDropdown
          isDisabled={selectedPresentCountry == null}
          value={selectedPresentState}
          isRequired={false}
          placeholder={selectedPresentCountry ? "Select state" : "Select country first"}
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
        className="col-lg-4 col-md-6 col-sm-12"
        onClick={fetchPresentCities}
      >
        <LocationDropdown
          isDisabled={selectedPresentState == null}
          isRequired={false}
          value={selectedPresentCity}
          placeholder={selectedPresentState ? "Select city" : "Select state first"}
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
    </div>

    {/* Row 3: Address Line 2, Zip Code */}
    <div className="row g-3">
      <div className="col-lg-6 col-md-6 col-sm-12">
        <TextInput
          isRequired={false}
          label="Address Line 2"
          margin="mb-0"
          maxLength={150}
          formikField="addressInfo.presentAddressLine2"
        />
      </div>

      <div className="col-lg-6 col-md-6 col-sm-12">
        <TextInput
          isRequired={false}
          label="Zip Code"
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
        color: "var(--ob-text-2, #2D3748)",
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

    {/* Hidden while "same as current" is on — the fields below are being mirrored from
        the current address, so a second map here would write values the checkbox then
        overwrites. */}
    {!isSameAddress && (
      <SmartLocationPicker
        lat={permanentPin?.lat}
        lng={permanentPin?.lng}
        onPick={(geo) => applyGeoPick("permanent", geo)}
      />
    )}

    {/* Row 1: Address */}
    <div className="row g-3">
      <div className="col-12">
        <TextInput
          isRequired={true}
          label="Address"
          margin="mb-0"
          maxLength={150}
          formikField="addressInfo.permanentAddressLine1"
        />
      </div>
    </div>

    {/* Row 2: Country, State, City */}
    <div className="row g-3">
      <div
        className="col-lg-4 col-md-6 col-sm-12"
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
        className="col-lg-4 col-md-6 col-sm-12"
        onClick={fetchPermanentStates}
      >
        <LocationDropdown
          isDisabled={selectedPermanentCountry == null}
          value={selectedPermanentState}
          isRequired={false}
          placeholder={selectedPermanentCountry ? "Select state" : "Select country first"}
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
        className="col-lg-4 col-md-6 col-sm-12"
        onClick={fetchPermanentCities}
      >
        <LocationDropdown
          isDisabled={selectedPermanentState == null}
          isRequired={false}
          value={selectedPermanentCity}
          placeholder={selectedPermanentState ? "Select city" : "Select state first"}
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
    </div>

    {/* Row 3: Address Line 2, Zip Code */}
    <div className="row g-3">
      <div className="col-lg-6 col-md-6 col-sm-12">
        <TextInput
          isRequired={false}
          label="Address Line 2"
          margin="mb-0"
          maxLength={150}
          formikField="addressInfo.permanentAddressLine2"
        />
      </div>

      <div className="col-lg-6 col-md-6 col-sm-12">
        <TextInput
          isRequired={false}
          label="Zip Code"
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

