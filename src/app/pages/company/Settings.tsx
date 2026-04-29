import React, { useState } from 'react'
import { PageLink, PageTitle } from "@metronic/layout/core";
import { PageHeadingTitle } from '@metronic/layout/components/header/page-title/PageHeadingTitle';
import { KTIcon } from '@metronic/helpers';
import { Modal } from 'react-bootstrap';
import Appearance from './settings/Appearance';
import RolesAndPermissions from './settings/RolesAndPermissions';
import { miscellaneousIcons } from '@metronic/assets/miscellaneousicons';
import GeneralSettings from './settings/GeneralSettings';
import SandwichLeave from './settings/SandwhichLeave';
import LeadsProjectCompanyChartSettings from './settings/LeadsProjectCompanyChartSettings';

const settingsBreadCrumb: Array<PageLink> = [
    {
        title: 'Company',
        path: '/settings',
        isSeparator: false,
        isActive: false,
    },
    {
        title: '',
        path: '',
        isSeparator: true,
        isActive: false,
    },
];

function Settings() {
    const [showColorSelectionModal, setShowColorSelectionModal] = useState(false);
    const [showRolesAndPermissionsModal, setShowRolesAndPermissionsModal] = useState(false);
    const [showGeneralSettingsModal, setShowGeneralSettingsModal] = useState(false);
    const [showSandWhichLeaveModal, setShowSandWhichLeaveModal] = useState(false);
    const [showLeadsProjectsCompanyModal, setShowLeadsProjectsCompanyModal] = useState(false);


    const handleShowCustomSelectionForm = ()=>{
        setShowColorSelectionModal(true);
    }
    const handleCloseCustomSelectionForm = ()=>{
        setShowColorSelectionModal(false);
    }

    const handleShowRolesAndPermissionsModal = ()=>{
        setShowRolesAndPermissionsModal(true);
    }
    const handleCloseRolesAndPermissionsModal = ()=>{
        setShowRolesAndPermissionsModal(false);
    }


    const handleShowGeneralSettingsModal = ()=>{
        setShowGeneralSettingsModal(true);
    }
    const handleCloseGeneralSettingsModal = ()=>{
        setShowGeneralSettingsModal(false);
    }

    const handleCloseSandWhichleaveModal = ()=>{
        setShowSandWhichLeaveModal(false);
    }

    const handleShowSandWhichLeaveModal = ()=>{
        setShowSandWhichLeaveModal(true);
    }


    const handleCloseLeadsProjectsCompanyModal = ()=>{
        setShowLeadsProjectsCompanyModal(false);
    }

  return (
    <>
        <PageTitle breadcrumbs={settingsBreadCrumb}>Settings</PageTitle>
        <div className='container bg-light px-lg-9 px-4 py-6'>
            <PageHeadingTitle/>
            <div className='my-2'>Configure services and frame your organization's policies, enabling seamless administration and effective employee management.</div>
            <div className='d-flex flex-row align-items-center justify-content-start gap-4 flex-wrap my-9'>
                {/* <div className="card d-flex flex-row align-items-center justify-content-start"
                onClick={() => handleShowCustomSelectionForm()}
                >
                    <div className="card-header border-0 cursor-pointer d-flex align-items-center justify-content-between gap-2">
                    <img src={miscellaneousIcons.appearanceIcon} alt="" style={{width: "36px", height: "36px", cursor: 'pointer'}} />
                        <div className="card-title m-0">
                            <p className="fw-bolder m-0">Appearance</p>
                        </div>
                    </div>
                </div> */}
                <div className="card d-flex flex-row align-items-center justify-content-start">
                    <div className="card-header border-0 cursor-pointer d-flex align-items-center justify-content-between gap-2"
                    onClick={() => handleShowRolesAndPermissionsModal()}>
                    <img src={miscellaneousIcons.rolesAndPermissions} alt="" style={{width: "36px", height: "36px", cursor: 'pointer'}} />
                    <div className="card-title m-0">
                        <p className="fw-bolder m-0">Roles and Permissions</p>
                    </div>
                    </div>
                </div>
                {/* <div className="card d-flex flex-row align-items-center justify-content-start">
                    <div className="card-header border-0 cursor-pointer d-flex align-items-center justify-content-between gap-2"
                    onClick={() => handleShowGeneralSettingsModal()}>
                    <img src={miscellaneousIcons.rolesAndPermissions} alt="" style={{width: "36px", height: "36px", cursor: 'pointer'}} />
                    <div className="card-title m-0">
                        <p className="fw-bolder m-0">Leaves Settings</p>
                    </div>
                    </div>
                </div> */}

                {/* <div className="card d-flex flex-row align-items-center justify-content-start">
                    <div className="card-header border-0 cursor-pointer d-flex align-items-center justify-content-between gap-2"
                    onClick={() => handleShowSandWhichLeaveModal()}>
                    <img src={miscellaneousIcons.rolesAndPermissions} alt="" style={{width: "36px", height: "36px", cursor: 'pointer'}} />
                    <div className="card-title m-0">
                        <p className="fw-bolder m-0">Sandwhich Rules</p>
                    </div>
                    </div>
                </div> */}

{/* 
                <div className="card d-flex flex-row align-items-center justify-content-start">
                    <div className="card-header border-0 cursor-pointer d-flex align-items-center justify-content-between"
                    onClick={() => handleShowLeadsProjectsCompanyModal()}>
                    <KTIcon iconName='setting-2' className='fs-1 me-2 border-0' iconType='duotone' />
                        <div className="card-title m-0">
                            <p className="fw-bolder m-0">Leads, Companies, Projects Chart Settings</p>
                        </div>
                    </div>
                </div> */}

                 {/* <div className="card mb-5 mb-xl-10 d-flex flex-row align-items-center justify-content-start">
                    <div className="card-header border-0 cursor-pointer d-flex align-items-center justify-content-between"
                        onClick={() => handleShowLeavesAndBalanceModal()}>
                        <img src={miscellaneousIcons.leavesAndBalance} alt="" style={{width: "40px", height: "40px"}} className='me-2'/>
                        <div className="card-title m-0">
                            <p className="fw-bolder m-0">Leaves and Balance</p>
                        </div>
                    </div>
                </div> */}
            </div>

           {/* Appearance Modal */}
            {/* <Modal show={showColorSelectionModal} onHide={handleCloseCustomSelectionForm} centered size='xl'>
            <Modal.Body style={{backgroundColor: '#F7F9FC', borderRadius: '10px'}}>
                <div className='d-flex flex-row align-items-center justify-content-start gap-2 mb-5'>
                    <img src={miscellaneousIcons.leftArrow} alt="" style={{width: "36px", height: "36px", cursor: 'pointer'}} onClick={handleCloseCustomSelectionForm}/>
                    <h2 className='my-auto'>Appearance Settings</h2>
                </div>
                <Appearance/>
            </Modal.Body>
            </Modal> */}

           {/* General Settings Modal */}       
            {/* <Modal show={showGeneralSettingsModal} onHide={handleCloseGeneralSettingsModal} centered>
            <Modal.Header closeButton>
                <Modal.Title>General Settings</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <GeneralSettings/>
            </Modal.Body>
            </Modal> */}

            {/* <Modal show={showSandWhichLeaveModal} onHide={handleCloseSandWhichleaveModal} centered size='xl'>
            <Modal.Body style={{backgroundColor: '#F7F9FC', borderRadius: '10px'}}>
            <div className='d-flex flex-row align-items-center justify-content-start gap-2'>
                    <img src={miscellaneousIcons.leftArrow} alt="" style={{width: "36px", height: "36px", cursor: 'pointer'}} onClick={handleCloseSandWhichleaveModal}/>
                    <h2 className='my-auto'>Current Date and Sandwhich Settings</h2>
                </div>
                <SandwichLeave showSandWhichLeaveModal={setShowSandWhichLeaveModal}/>
            </Modal.Body>
            </Modal> */}

           {/* Roles And Permissions Modal */}       
            <Modal size='xl' show={showRolesAndPermissionsModal} onHide={handleCloseRolesAndPermissionsModal} centered>
            {/* <Modal.Header closeButton>
                <Modal.Title></Modal.Title>
            </Modal.Header> */}
            <Modal.Body style={{backgroundColor: '#F7F9FC', borderRadius: '10px'}}>
                <div className='d-flex flex-row align-items-center justify-content-start gap-2'>
                    <img src={miscellaneousIcons.leftArrow} alt="" style={{width: "36px", height: "36px", cursor: 'pointer'}} onClick={handleCloseRolesAndPermissionsModal}/>
                    <h2 className='my-auto'>Roles and Permissions</h2>
                </div>
                <RolesAndPermissions/>
            </Modal.Body>
            </Modal>

            {/* Leads, Companies, Projects Settings Modal */}
            {/* <Modal show={showLeadsProjectsCompanyModal} onHide={handleCloseLeadsProjectsCompanyModal} centered size='xl'>
            <Modal.Body style={{backgroundColor: '#F7F9FC', borderRadius: '10px'}}>
            <div className='d-flex flex-row align-items-center justify-content-start gap-2'>
                    <img src={miscellaneousIcons.leftArrow} alt="" style={{width: "36px", height: "36px", cursor: 'pointer'}} onClick={handleCloseLeadsProjectsCompanyModal}/>
                    <h2 className='my-auto'>Chart Settings</h2>
                </div>
                <LeadsProjectCompanyChartSettings/>
            </Modal.Body>
            </Modal> */}

           {/* Leaves And Balance Modal */}       
            {/* <Modal size='xl' show={showLeavesAndBalanceModal} onHide={handleCloseLeavesAndBalanceModal} centered> */}
            {/* <Modal.Header closeButton>
                <Modal.Title></Modal.Title>
            </Modal.Header> */}
            {/* <Modal.Body style={{backgroundColor: '#F7F9FC', borderRadius: '10px'}}> */}
                {/* <div className='d-flex flex-row align-items-center justify-content-start gap-2'> */}
                    {/* <img src={miscellaneousIcons.leftArrow} alt="" style={{width: "36px", height: "36px", cursor: 'pointer'}} onClick={handleCloseLeavesAndBalanceModal}/>       */}
                    {/* <h2 className='my-auto'>Leaves and Balance</h2> */}
                {/* </div> */}
                {/* <LeavesAndBlance/> */}
            {/* </Modal.Body> */}
            {/* </Modal> */}

         
        </div>
    </>
  )
}

export default Settings

