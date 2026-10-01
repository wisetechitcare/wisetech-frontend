import { useSelector } from "react-redux";
import { useFormikContext } from "formik";
import DropDownInput from "@app/modules/common/inputs/DropdownInput";
import type { RootState } from "@redux/store";

/**
 * The App Role picker, as the server enforces it (accessService.assertRoleChangeAllowed):
 *   - nobody changes their own role — on your own profile it is read-only;
 *   - Super Admin is given only by a Super Admin, Admin only by an Admin or above.
 * The role the employee holds now stays listed so it still reads correctly.
 */
export default function AppRoleField({ employeeId, roles, isRequired = true }: { employeeId?: string; roles: any[]; isRequired?: boolean }) {
    const { values } = useFormikContext<any>();
    const tier = useSelector((st: RootState) => (st as any).authz?.tier ?? null);
    const selfId = useSelector((st: RootState) => st.employee.currentEmployee?.id);
    const isSelf = !!employeeId && employeeId === selfId;

    const options = roles
        .filter((r) => r.id === values.appRole || (r.code === "SUPER_ADMIN" ? tier === "SUPER_ADMIN" : r.code === "ADMIN" ? tier != null : true))
        .map((r) => ({ value: r.id, label: r.name }));

    return (
        <>
            <DropDownInput isRequired={isRequired} formikField="appRole" inputLabel="App Role" options={options} disabled={isSelf} />
            {isSelf && <div className="text-muted fs-8 mt-1">You can't change your own role. Another Admin or Super Admin can.</div>}
        </>
    );
}
