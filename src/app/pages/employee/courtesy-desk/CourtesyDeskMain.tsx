import { useEffect, useMemo } from "react";
import { bootstrapCourtesyDeskFromApi } from "./store/courtesyDeskStore";
import { useLocation, useNavigate } from "react-router-dom";
import MaterialHeaderTab, {
  TabItem,
} from "@app/modules/common/components/MaterialHeaderTab";
import SensitiveDataProvider, {
  SensitiveDataHeaderToggle,
} from "@app/modules/common/components/SensitiveData";
import { PageTitle } from "@metronic/layout/core";
import Overview from "./components/Overview";
import PeopleGroupsList from "./components/PeopleGroupsList";
import DrivesList from "./components/DrivesList";
import Configure from "./components/Configure";
import { giftTabIndexFromPath } from "./GiftManagementTabBar";
import { GIFT_MANAGEMENT_BASE } from "./giftPaths";

const TAB_TITLES = [
  "Overview",
  "People Groups",
  "Gift Runs",
  "Configure",
] as const;

/** Tabs that render amounts — eye only here so other tabs aren't blurred with no reveal. */
const EYE_TABS: ReadonlySet<string> = new Set(["Overview", "Gift Runs"]);

export default function CourtesyDeskMain() {
  useEffect(() => {
    void bootstrapCourtesyDeskFromApi();
  }, []);

  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = giftTabIndexFromPath(location.pathname);

  const tabItems: TabItem[] = useMemo(
    () => [
      { title: "Overview", component: <Overview />, icon: "bi-grid-1x2" },
      {
        title: "People Groups",
        component: <PeopleGroupsList />,
        icon: "bi-people",
      },
      { title: "Gift Runs", component: <DrivesList />, icon: "bi-gift" },
      { title: "Configure", component: <Configure />, icon: "bi-gear" },
    ],
    [],
  );

  const onTabChange = (index: number) => {
    const title = TAB_TITLES[index];
    if (title === "Overview") navigate(`${GIFT_MANAGEMENT_BASE}/overview`);
    else if (title === "People Groups")
      navigate(`${GIFT_MANAGEMENT_BASE}/people-groups`);
    else if (title === "Gift Runs") navigate(`${GIFT_MANAGEMENT_BASE}/drives`);
    else navigate(`${GIFT_MANAGEMENT_BASE}/configure`);
  };

  const breadcrumbs = [
    { title: "Home", path: "/dashboard", isSeparator: false, isActive: false },
    { title: "", path: "", isSeparator: true, isActive: false },
    {
      title: "CRM",
      path: "/workspace/crm",
      isSeparator: false,
      isActive: false,
    },
    { title: "", path: "", isSeparator: true, isActive: false },
    {
      title: "Gift Managements",
      path: GIFT_MANAGEMENT_BASE,
      isSeparator: false,
      isActive: false,
    },
  ];

  const eyeOn = EYE_TABS.has(TAB_TITLES[activeTab] ?? "");

  return (
    <>
      <PageTitle breadcrumbs={breadcrumbs}>{TAB_TITLES[activeTab]}</PageTitle>
      <SensitiveDataProvider disabled={!eyeOn}>
        <MaterialHeaderTab
          tabItems={tabItems}
          activeTab={activeTab}
          onTabChange={onTabChange}
          hideScrollButtons
          headerAction={eyeOn ? <SensitiveDataHeaderToggle /> : undefined}
        />
      </SensitiveDataProvider>
    </>
  );
}
