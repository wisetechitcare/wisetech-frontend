/* eslint-disable @typescript-eslint/no-explicit-any */

import { useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { fetchAllBranches, fetchCompanyOverview } from "@services/company";
import { RootState } from "@redux/store";
import { useLayout } from "../../core";
import { KTIcon } from "../../../helpers";
import { DefaultTitle } from "./page-title/DefaultTitle";
import { HeaderUserMenu, ThemeModeSwitcher } from "../../../partials";
import SelectInput from "@app/modules/common/inputs/SelectInput";
import { HeaderEmployee } from "./HeaderEmployee";
import { Link } from "react-router-dom";
import NotificationBell from "../NotificationsBell";
import BirthdayConfetti from "@app/modules/common/utils/BirthdayConfetti";
import { fetchCurrentEmployeeByEmpId } from "@services/employee";
import GlobalSearch from "@app/modules/common/components/GlobalSearch/GlobalSearch";

const HeaderToolbar = () => {
  const { classes } = useLayout();
  const [selectedCompany, setSelectedCompany] = useState({});
  const [selectedBranch, setSelectedBranch] = useState({});
  const [companiesOption, setCompaniesOption] = useState([
    { label: "All", value: "all" },
  ]);
  const [branchesOption, setBranchesOption] = useState([
    { label: "All", value: "all" },
  ]);
  const [showAppSettings, setShowAppSettings] = useState(false);
  const employeeId = useSelector(
    (state: RootState) => state.employee.currentEmployee.id
  );
  const [show, setShow] = useState(false);

  async function fetchEmployeeAppVisibility(employeeId: string) {
    const response = await fetchCurrentEmployeeByEmpId(employeeId);
    // console.log("response.data:: ",response);
    if (!response.hasError) {
      setShowAppSettings(response.data?.employee?.showAppSettings);
    }
  }
  
  useEffect(()=>{
    if(!employeeId) return;
    fetchEmployeeAppVisibility(employeeId)
  },[employeeId])

  useEffect(() => {
    const selectedCompanyLs = localStorage.getItem("selectedCompany");
    const selectedBranchLs = localStorage.getItem("selectedBranch");
    const selectedCompany = selectedCompanyLs
      ? JSON.parse(selectedCompanyLs)
      : null;
    const selectedBranch = selectedBranchLs
      ? JSON.parse(selectedBranchLs)
      : null;

    if (selectedCompany && selectedBranch) {
      setSelectedCompany({
        value: selectedCompany.id,
        label: selectedCompany.name,
      });
      setSelectedBranch({
        value: selectedBranch.id,
        label: selectedBranch.name,
      });
    }

    async function fetchData() {
      const {
        data: { companyOverview },
      } = await fetchCompanyOverview();
      setCompaniesOption((prevState: any) => {
        const options = companyOverview.map((el: any) => ({
          label: el.name,
          value: el.id,
        }));
        return [...prevState, ...options];
      });

      const {
        data: { branches },
      } = await fetchAllBranches();
      setBranchesOption((prevState: any) => {
        const options = branches.map((el: any) => ({
          label: el.name,
          value: el.id,
        }));
        return [...prevState, ...options];
      });
    }

    fetchData();
  }, []);
  const handleClose = () => {
    setShow(false);
  };

  return (
    <div className="w-md-100 d-flex align-items-center h-100">
      {/* begin::Toolbar container */}
      <div
        // className={
        //   `
        //   ${classes.headerContainer.join(
        //   "fluid"
        // )}
        //  py-0 py-lg-0 d-flex flex-column flex-lg-row align-items-lg-stretch justify-content-lg-between bg-primary `}
        className="wt-header-bar py-0 py-lg-0 d-flex flex-row align-items-center justify-content-between container-fluid h-100"
      >
        <DefaultTitle />
        <div className="d-flex align-items-center overflow-visible h-100 pt-0 pt-lg-0">
          <div className="d-flex align-items-center h-100">
            <BirthdayConfetti />
            <div className="d-flex gap-3">
              <div className="wt-header-actions d-flex gap-lg-3 gap-5" >
                <div className="d-flex align-items-center">
                  <GlobalSearch />
                </div>
                {/* notification */}
                <NotificationBell employeeId={employeeId} />

                <div className="d-flex align-items-center">
                  {/*begin::Action*/}
                  <a
                    href="#"
                    className="btn-icon btn-sm btn-active-color-primary"
                    data-kt-menu-trigger="{default: 'click', lg: 'hover'}"
                    data-kt-menu-placement="bottom-end"
                    data-kt-menu-overflow="false"
                  >
                    {/* <KTIcon iconName='setting-3' className='text-muted fs-1' /> */}
                    <HeaderEmployee />
                  </a>

                  <HeaderUserMenu />
                  {/*end::Action*/}
                </div>
              </div>
            </div>
            {/* end::Actions */}
          </div>
          {/* end::Action wrapper */}
        </div>
        {/* end::Toolbar container */}
      </div>
    </div>
  );
};

export { HeaderToolbar };

