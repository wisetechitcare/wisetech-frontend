
import { components } from 'react-select';
import { Button } from '@/ds/ui/button';

const DropdownAdd = (props: any) => {
    const { onClick } = props;

    return (
        <components.MenuList  {...props}>
            {props.children}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                }}
            >
                <Button variant="outline"
                    onClick={onClick}
                    style={{
                        textAlign: 'center',
                        color: 'black',
                        backgroundColor: 'white',
                        borderColor: 'black',
                        fontSize: '24px',
                    }}
                >
                    +
                </Button>
            </div>
        </components.MenuList >
    );
}

export default DropdownAdd;