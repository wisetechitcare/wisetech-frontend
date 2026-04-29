import React from 'react'
import { number } from 'yup'

function Overview({totalRequestedAmount, totalRequests, approvedRequests, rejectedRequests, pendingRequests}:{
    totalRequestedAmount: number, totalRequests: number, approvedRequests: number, rejectedRequests: number, pendingRequests: number
}) {
  return (
    <>
    <h2>Overview</h2>
      <div className="d-flex flex-wrap justify-content-between">
        <div className="card flex-fill m-1 md-col-2">
          <div className="card-body p-4 text-sm">
            <p className="fs-8">Total Requested Amount</p>
            <h3 className="card-title">{totalRequestedAmount}</h3>
          </div>
        </div>
        <div className="card flex-fill m-1 col-md-2">
          <div className="card-body p-4 text-sm">
            <p className="fs-8">Total Requestes</p>
            <h3 className="card-title">{totalRequests}</h3>
          </div>
        </div>
        <div className="card flex-fill m-1 col-md-2">
          <div className="card-body p-4 text-sm">
            <p className="fs-8">Approved</p>
            <h3 className="card-title">{approvedRequests}</h3>
          </div>
        </div>
        <div className="card flex-fill m-1 col-md-2">
          <div className="card-body p-4 text-sm">
            <p className="fs-8">Rejected</p>
            <h3 className="card-title">{rejectedRequests}</h3>
          </div>
        </div>
        <div className="card flex-fill m-1 col-md-2">
          <div className="card-body p-4 text-sm">
            <p className="fs-8">Pending</p>
            <h3 className="card-title">{pendingRequests}</h3>
          </div>
        </div>
      </div>
    </>
   
  )
}

export default Overview