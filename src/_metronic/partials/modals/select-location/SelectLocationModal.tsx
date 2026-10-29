import React, {Dispatch, SetStateAction, useEffect, useState} from 'react'
import {Modal} from 'react-bootstrap'
import {Button} from '@/ds/ui/button'
import {WtCloseButton} from '@/app/modules/common/components/ui/tw/WtCloseButton'

type Props = {
  data: {location: string; setLocation: Dispatch<SetStateAction<string>>}
  show: boolean
  handleClose: () => void
}

const SelectLocationModal: React.FC<Props> = ({show, handleClose, data}) => {
  useEffect(() => {
    initMap()
  }, [])

  const [location, setLocation] = useState(data.location)
  const dissmissLocation = () => {
    setLocation(data.location)
    handleClose()
  }
  const applyLocation = () => {
    data.setLocation(location)
    handleClose()
  }
  const initMap = () => {}

  return (
    <Modal
      className='modal fade'
      id='kt_modal_select_location'
      data-backdrop='static'
      tabIndex={-1}
      role='dialog'
      show={show}
      dialogClassName='modal-xl'
      aria-hidden='true'
      onHide={dissmissLocation}
    >
      <div className='modal-content'>
        <div className='modal-header'>
          <h5 className='modal-title'>Select Location</h5>

          <WtCloseButton variant='plain' className='ms-2' onClick={dissmissLocation} />
        </div>
        <div className='modal-body'>
          <input type='text' value={location} onChange={(e) => setLocation(e.target.value)} />
          <div id='kt_modal_select_location_map' className='map h-450px'></div>
        </div>
        <div className='modal-footer'>
          <Button variant='tinted' onClick={dissmissLocation}>
            Cancel
          </Button>
          <Button id='submit' onClick={applyLocation}>
            Apply
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export {SelectLocationModal}
