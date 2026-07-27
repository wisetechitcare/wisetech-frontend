import { Grid } from "@mui/material";
import Rules from "./views/information/Rules";
import Faqs from "./views/information/Faqs";
import { LEAVE_ATTENDANCE_KEY } from "@constants/configurations-key";

const Information = () => {
    return (
        <div>
            <Grid container>
                <Grid item xs={12} md={7} className="mb-3">
                    <Rules />
                </Grid>

                <Grid item xs={12} md={5} className="mb-3">
                <Faqs typeKey={LEAVE_ATTENDANCE_KEY} />
                </Grid>
            </Grid>
        </div>
    );
}

export default Information;
