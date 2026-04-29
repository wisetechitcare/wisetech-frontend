import { KTIcon } from "@metronic/helpers";

interface NotificationBarProps {
    msg: string;
    detail: string;
}

function NotificationBar({ msg, detail} : NotificationBarProps) {
    return (
        <div className='notice d-flex bg-primary-red rounded border-warning border border-dashed p-6'>
            <KTIcon iconName='information-5' className='fs-2tx text-white me-4' />
            <div className='d-flex flex-stack flex-grow-1'>
                <div className='fw-bold'>
                    <h4 className='text-white fw-bolder'>{msg}</h4>
                    <div className='fs-6 text-white'>
                        {detail}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default NotificationBar;