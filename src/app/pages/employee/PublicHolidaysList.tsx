import MaterialTable from "@app/modules/common/components/MaterialTable";
import { useMemo, useState, useEffect } from "react";
import { MRT_ColumnDef } from "material-react-table";
import { fetchPublicHolidays } from "@services/company";
import dayjs from 'dayjs';
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";

interface PublicHoliday {
    title: string,
    date: string,
    color: string,
    fixed: boolean,
}

function PublicHolidaysList() {
    const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear() + '');
    const employeeIdCurrent = useSelector((state: RootState) => state.employee.currentEmployee.id);
    const country = 'India';


    useEffect(() => {
        const getAllPublicHolidays = async () =>{
            setLoading(true);
            try{
                const {data: {publicHolidays}} = await fetchPublicHolidays(currentYear,country)
                const transformedRes = publicHolidays.map((holiday:any)=>({
                    title: holiday.name,
                    color: holiday.colorCode,
                    date: dayjs(holiday.date).format('DD-MM-YYYY'),
                    fixed: holiday.isFixed
                }));
                setHolidays(transformedRes);
                
            }catch(error){
                console.error("Error fetching Public Holidays:", error);
            }finally{
                setLoading(false);
            }
        };
        getAllPublicHolidays();
    }, [currentYear, country]);

    const columns = useMemo<MRT_ColumnDef<PublicHoliday>[]>(()=>[
        {
            accessorKey: 'date',
            header: 'Holiday Date',
            Cell: ({renderedCellValue})=> renderedCellValue,
        },
        {
            accessorKey: 'title',
            header: 'Holiday Name',
            Cell: ({renderedCellValue})=> renderedCellValue,
        },
        {
            accessorKey: 'fixed',
            header:'Fixed Holiday',
            Cell:({renderedCellValue})=>(
                <span
                style={{
                    backgroundColor: renderedCellValue? "Green" : "Red",
                    padding: "4px 20px",
                    borderRadius: "4px",
                }}
                >
                 &nbsp;
                </span>
            )
        },
        {
            accessorKey: "color",
            header: "Color",
            Cell: ({ renderedCellValue }) => (
              <span
                style={{
                  backgroundColor: typeof renderedCellValue === 'string' && renderedCellValue !== '' ? renderedCellValue : "#000", 
                  padding: "4px 20px",
                  borderRadius: "4px",
                }}
              >
                &nbsp;
              </span>
            ),
        }
    ],[holidays]) 

    return(
        <div className="mt-5">
            <h3>Public Holidays Lists</h3>
            <MaterialTable columns={columns} data={holidays} tableName="Public Holidays Lists" employeeId={employeeIdCurrent}/>
        </div>
    );

}

export default PublicHolidaysList;