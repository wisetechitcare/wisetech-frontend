import { Button } from 'react-bootstrap';
import { components } from 'react-select';

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
                <Button
                    onClick={onClick}
                    variant="light"
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